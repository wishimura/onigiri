import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchWeatherData } from '@/lib/weather'
import { format, subDays } from 'date-fns'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { storeId, latitude, longitude, days = 30 } = body

    if (!storeId || !latitude || !longitude) {
      return NextResponse.json({ error: 'storeId, latitude, longitude are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const endDate = format(new Date(), 'yyyy-MM-dd')
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')

    const weatherData = await fetchWeatherData(latitude, longitude, startDate, endDate)

    // Upsert weather data
    const records = weatherData.map(w => ({
      store_id: storeId,
      date: w.date,
      weather_type: w.weather_type,
      temp_max: w.temp_max,
      temp_min: w.temp_min,
      temp_avg: w.temp_avg,
      precipitation: w.precipitation,
      humidity: w.humidity,
      source_api: 'open-meteo',
    }))

    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)
      await supabase
        .from('weather_data')
        .upsert(batch, { onConflict: 'store_id,date' })
    }

    return NextResponse.json({ count: records.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
