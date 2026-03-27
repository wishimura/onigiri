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
    const { storeId, dates } = body
    // dates: optional array of 'yyyy-MM-dd' strings. Defaults to [tomorrow]

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

    // 天気予報を取得 (今日〜3日先)
    let forecastData: { date: string; weather_type: WeatherType; temp_max: number; temp_min: number; temp_avg: number; precipitation: number }[] = []
    if (store.latitude && store.longitude) {
      try {
        forecastData = await fetchForecast(store.latitude, store.longitude, 3)
        // DBに保存
        for (const f of forecastData) {
          await supabase.from('weather_data').upsert({
            store_id: storeId,
            date: f.date,
            weather_type: f.weather_type,
            temp_max: f.temp_max,
            temp_min: f.temp_min,
            temp_avg: f.temp_avg,
            precipitation: f.precipitation,
            source_api: 'open-meteo-forecast',
          }, { onConflict: 'store_id,date' })
        }
      } catch {
        // 天気取得失敗してもルールベースで予測を続行
      }
    }

    const today = todayJST()
    const tomorrow = tomorrowJST()
    const targetDates: string[] = dates && dates.length > 0 ? dates : [today, tomorrow]

    const predictions: Record<string, any> = {}

    for (const targetDate of targetDates) {
      const forecast = forecastData.find(f => f.date === targetDate)
      // DBから天気を取得（forecastにない場合）
      let targetWeather: { weather_type: WeatherType; temp_avg: number } = {
        weather_type: '不明',
        temp_avg: 15,
      }
      if (forecast) {
        targetWeather = { weather_type: forecast.weather_type, temp_avg: forecast.temp_avg }
      } else {
        const { data: dbWeather } = await supabase
          .from('weather_data')
          .select('*')
          .eq('store_id', storeId)
          .eq('date', targetDate)
          .single()
        if (dbWeather) {
          targetWeather = { weather_type: dbWeather.weather_type as WeatherType, temp_avg: dbWeather.temp_avg ?? 15 }
        }
      }

      const calendar = getCalendarInfo(targetDate)

      const prediction = predictSales({
        targetDate,
        targetWeather,
        targetCalendar: calendar,
        historicalRecords: records,
        historicalWeather: weatherHistory ?? [],
        ricePerGo,
      })

      const { error } = await supabase.from('predictions').upsert({
        store_id: storeId,
        date: targetDate,
        predicted_sales_count: prediction.predicted_sales_count,
        predicted_cooked_rice_go: prediction.predicted_cooked_rice_go,
        confidence_score: prediction.confidence_score,
        reasoning_text: prediction.reasoning_text,
        final_recommended_value: prediction.predicted_cooked_rice_go,
      }, { onConflict: 'store_id,date' })

      if (!error) {
        predictions[targetDate] = prediction
      }
    }

    // 過去の予測に実績を紐づけ（バックフィル）
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

    return NextResponse.json({ predictions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
