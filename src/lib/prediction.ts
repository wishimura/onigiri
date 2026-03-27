import type { DailyRecord, WeatherData, CalendarData, WeatherType } from '@/types/database'

interface PredictionInput {
  targetDate: string
  targetWeather: {
    weather_type: WeatherType
    temp_avg: number
  }
  targetCalendar: CalendarData
  historicalRecords: DailyRecord[]
  historicalWeather: WeatherData[]
  ricePerGo: number
}

interface PredictionResult {
  predicted_sales_count: number
  predicted_cooked_rice_go: number
  confidence_score: number
  reasoning_text: string
}

// 天気補正係数
const WEATHER_FACTOR: Record<string, number> = {
  '晴れ': 1.0,
  '曇り': 0.95,
  '雨': 0.85,
  '雪': 0.75,
  '不明': 0.95,
}

// 気温帯補正（平均気温）
function getTempFactor(tempAvg: number): number {
  if (tempAvg < 5) return 0.90   // 極寒
  if (tempAvg < 10) return 0.95  // 寒い
  if (tempAvg < 20) return 1.0   // 快適
  if (tempAvg < 28) return 1.05  // 暖かい〜暑い（おにぎり需要増）
  if (tempAvg < 33) return 1.0   // 猛暑（やや減）
  return 0.95                     // 酷暑
}

// 祝日補正
function getHolidayFactor(calendar: CalendarData): number {
  if (calendar.is_consecutive_holiday) return 1.15
  if (calendar.is_holiday) return 1.10
  if (calendar.is_holiday_eve) return 1.05
  return 1.0
}

export function predictSales(input: PredictionInput): PredictionResult {
  const {
    targetDate,
    targetWeather,
    targetCalendar,
    historicalRecords,
    ricePerGo,
  } = input

  const targetWeekday = targetCalendar.weekday
  const reasons: string[] = []

  // 同曜日のデータを抽出（過去8週分まで）
  const sameWeekdayRecords = historicalRecords
    .filter(r => {
      const d = new Date(r.date)
      return d.getDay() === targetWeekday && r.sales_count != null
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  if (sameWeekdayRecords.length === 0) {
    // データがない場合は全データ平均
    const allWithSales = historicalRecords.filter(r => r.sales_count != null)
    if (allWithSales.length === 0) {
      return {
        predicted_sales_count: 0,
        predicted_cooked_rice_go: 0,
        confidence_score: 0,
        reasoning_text: '予測に必要なデータがありません。実績を入力してください。',
      }
    }

    const avg = allWithSales.reduce((sum, r) => sum + (r.sales_count ?? 0), 0) / allWithSales.length
    const predicted = Math.round(avg)
    return {
      predicted_sales_count: predicted,
      predicted_cooked_rice_go: Math.round((predicted / ricePerGo) * 10) / 10,
      confidence_score: 0.3,
      reasoning_text: `データが少ないため全期間平均(${predicted}個)をベースにしています。`,
    }
  }

  // 売り切れ補正: 売り切れ日は1.1倍
  const adjustedCounts = sameWeekdayRecords.map(r => {
    const count = r.sales_count ?? 0
    return r.sold_out_flag ? Math.round(count * 1.1) : count
  })

  const baseAvg = adjustedCounts.reduce((sum, c) => sum + c, 0) / adjustedCounts.length
  reasons.push(`${targetCalendar.weekday_name}曜日の過去${sameWeekdayRecords.length}週平均: ${Math.round(baseAvg)}個`)

  // 天気補正
  const weatherFactor = WEATHER_FACTOR[targetWeather.weather_type] ?? 1.0
  if (weatherFactor !== 1.0) {
    reasons.push(`天気(${targetWeather.weather_type}): ${weatherFactor < 1 ? '▼' : '▲'}${Math.round(Math.abs(1 - weatherFactor) * 100)}%`)
  }

  // 気温補正
  const tempFactor = getTempFactor(targetWeather.temp_avg)
  if (tempFactor !== 1.0) {
    reasons.push(`気温(${targetWeather.temp_avg}℃): ${tempFactor < 1 ? '▼' : '▲'}${Math.round(Math.abs(1 - tempFactor) * 100)}%`)
  }

  // 祝日補正
  const holidayFactor = getHolidayFactor(targetCalendar)
  if (holidayFactor !== 1.0) {
    const label = targetCalendar.is_consecutive_holiday
      ? '連休'
      : targetCalendar.is_holiday
      ? `祝日(${targetCalendar.holiday_name})`
      : '祝前日'
    reasons.push(`${label}: ▲${Math.round((holidayFactor - 1) * 100)}%`)
  }

  const predicted = Math.round(baseAvg * weatherFactor * tempFactor * holidayFactor)
  const predictedRice = Math.round((predicted / ricePerGo) * 10) / 10

  // 信頼度: データ量に基づく
  const confidence = Math.min(0.9, 0.4 + sameWeekdayRecords.length * 0.06)

  return {
    predicted_sales_count: predicted,
    predicted_cooked_rice_go: predictedRice,
    confidence_score: Math.round(confidence * 100) / 100,
    reasoning_text: reasons.join(' / '),
  }
}
