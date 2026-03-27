import type { WeatherType } from '@/types/database'

interface OpenMeteoDaily {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  temperature_2m_mean: number[]
  precipitation_sum: number[]
  relative_humidity_2m_mean?: number[]
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily
}

function weatherCodeToType(code: number): WeatherType {
  if (code <= 1) return '晴れ'
  if (code <= 3) return '曇り'
  if (code <= 67) return '雨'
  if (code <= 77) return '雪'
  if (code <= 99) return '雨'
  return '不明'
}

function weatherTypeToEmoji(type: WeatherType): string {
  switch (type) {
    case '晴れ': return '☀️'
    case '曇り': return '☁️'
    case '雨': return '🌧️'
    case '雪': return '❄️'
    default: return '❓'
  }
}

export { weatherTypeToEmoji }

export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<Array<{
  date: string
  weather_type: WeatherType
  temp_max: number
  temp_min: number
  temp_avg: number
  precipitation: number
  humidity: number | null
}>> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: startDate,
    end_date: endDate,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum',
    timezone: 'Asia/Tokyo',
  })

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  )

  if (!res.ok) {
    // Try historical API for past dates
    const histRes = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`
    )
    if (!histRes.ok) {
      throw new Error(`Weather API error: ${histRes.status}`)
    }
    const data: OpenMeteoResponse = await histRes.json()
    return parseWeatherResponse(data)
  }

  const data: OpenMeteoResponse = await res.json()
  return parseWeatherResponse(data)
}

function parseWeatherResponse(data: OpenMeteoResponse) {
  const { daily } = data
  return daily.time.map((date, i) => ({
    date,
    weather_type: weatherCodeToType(daily.weather_code[i]) as WeatherType,
    temp_max: daily.temperature_2m_max[i],
    temp_min: daily.temperature_2m_min[i],
    temp_avg: daily.temperature_2m_mean[i],
    precipitation: daily.precipitation_sum[i],
    humidity: daily.relative_humidity_2m_mean?.[i] ?? null,
  }))
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  days: number = 3
): Promise<Array<{
  date: string
  weather_type: WeatherType
  temp_max: number
  temp_min: number
  temp_avg: number
  precipitation: number
}>> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum',
    timezone: 'Asia/Tokyo',
    forecast_days: days.toString(),
  })

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  )

  if (!res.ok) {
    throw new Error(`Forecast API error: ${res.status}`)
  }

  const data: OpenMeteoResponse = await res.json()
  return data.daily.time.map((date, i) => ({
    date,
    weather_type: weatherCodeToType(data.daily.weather_code[i]) as WeatherType,
    temp_max: data.daily.temperature_2m_max[i],
    temp_min: data.daily.temperature_2m_min[i],
    temp_avg: data.daily.temperature_2m_mean[i],
    precipitation: data.daily.precipitation_sum[i],
  }))
}
