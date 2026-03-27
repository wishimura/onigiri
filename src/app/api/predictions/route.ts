import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictSales } from '@/lib/prediction'
import { fetchForecast } from '@/lib/weather'
import { getCalendarInfo } from '@/lib/holidays'
import { todayJST, tomorrowJST, daysAgoJST } from '@/lib/date'
import type { WeatherType } from '@/types/database'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { storeId } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { data: settings } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', storeId)
      .single()

    const ricePerGo = settings?.rice_per_go ?? 13

    const sixtyDaysAgo = daysAgoJST(60)
    const { data: records } = await supabase
      .from('daily_records')
      .select('*')
      .eq('store_id', storeId)
      .gte('date', sixtyDaysAgo)
      .order('date', { ascending: false })

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'Not enough data for prediction' }, { status: 400 })
    }

    const { data: weatherHistory } = await supabase
      .from('weather_data')
      .select('*')
      .eq('store_id', storeId)
      .gte('date', sixtyDaysAgo)

    const tomorrow = tomorrowJST()
    let tomorrowWeather: { weather_type: WeatherType; temp_avg: number } = {
      weather_type: '不明',
      temp_avg: 15,
    }

    if (store.latitude && store.longitude) {
      try {
        const forecast = await fetchForecast(store.latitude, store.longitude, 3)
        const tomorrowForecast = forecast.find(f => f.date === tomorrow)
        if (tomorrowForecast) {
          tomorrowWeather = {
            weather_type: tomorrowForecast.weather_type,
            temp_avg: tomorrowForecast.temp_avg,
          }

          await supabase.from('weather_data').upsert({
            store_id: storeId,
            date: tomorrow,
            weather_type: tomorrowForecast.weather_type,
            temp_max: tomorrowForecast.temp_max,
            temp_min: tomorrowForecast.temp_min,
            temp_avg: tomorrowForecast.temp_avg,
            precipitation: tomorrowForecast.precipitation,
            source_api: 'open-meteo-forecast',
          }, { onConflict: 'store_id,date' })
        }
      } catch {
        // 天気取得失敗してもルールベースで予測を続行
      }
    }

    const tomorrowCalendar = getCalendarInfo(tomorrow)

    const prediction = predictSales({
      targetDate: tomorrow,
      targetWeather: tomorrowWeather,
      targetCalendar: tomorrowCalendar,
      historicalRecords: records,
      historicalWeather: weatherHistory ?? [],
      ricePerGo,
    })

    const { error } = await supabase.from('predictions').upsert({
      store_id: storeId,
      date: tomorrow,
      predicted_sales_count: prediction.predicted_sales_count,
      predicted_cooked_rice_go: prediction.predicted_cooked_rice_go,
      confidence_score: prediction.confidence_score,
      reasoning_text: prediction.reasoning_text,
      final_recommended_value: prediction.predicted_cooked_rice_go,
    }, { onConflict: 'store_id,date' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 過去の予測に実績を紐づけ
    const today = todayJST()
    const { data: todayPrediction } = await supabase
      .from('predictions')
      .select('*')
      .eq('store_id', storeId)
      .eq('date', today)
      .single()

    if (todayPrediction && todayPrediction.actual_sales_count == null) {
      const todayRecord = records.find(r => r.date === today)
      if (todayRecord) {
        const actualSales = todayRecord.sales_count ?? 0
        const predSales = todayPrediction.predicted_sales_count ?? 0
        await supabase.from('predictions').update({
          actual_sales_count: todayRecord.sales_count,
          actual_cooked_rice_go: todayRecord.cooked_rice_go,
          prediction_error: actualSales - predSales,
        }).eq('id', todayPrediction.id)
      }
    }

    return NextResponse.json({
      prediction: {
        date: tomorrow,
        ...prediction,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
