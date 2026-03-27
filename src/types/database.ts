export interface Store {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
  address: string | null
  owner_user_id: string
  created_at: string
  updated_at: string
}

export interface DailyRecord {
  id: string
  store_id: string
  date: string
  sales_count: number | null
  sales_amount: number | null
  cooked_rice_go: number | null
  waste_count: number | null
  sold_out_flag: boolean
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WeatherData {
  id: string
  store_id: string
  date: string
  weather_type: string | null
  temp_max: number | null
  temp_min: number | null
  temp_avg: number | null
  precipitation: number | null
  humidity: number | null
  source_api: string | null
  fetched_at: string
}

export interface CalendarData {
  date: string
  weekday: number
  weekday_name: string
  is_weekend: boolean
  is_holiday: boolean
  holiday_name: string | null
  is_holiday_eve: boolean
  is_consecutive_holiday: boolean
  month: number
  season: string
}

export interface EventNote {
  id: string
  store_id: string
  date: string
  raw_note: string | null
  extracted_tags: string[] | null
  ai_summary: string | null
  impact_label: string | null
  reviewed_flag: boolean
  created_at: string
}

export interface Prediction {
  id: string
  store_id: string
  date: string
  predicted_sales_count: number | null
  predicted_cooked_rice_go: number | null
  confidence_score: number | null
  reasoning_text: string | null
  manual_adjusted_value: number | null
  final_recommended_value: number | null
  actual_sales_count: number | null
  actual_cooked_rice_go: number | null
  prediction_error: number | null
  created_at: string
  updated_at: string
}

export interface StoreSettings {
  id: string
  store_id: string
  rice_per_go: number
  business_days: number[]
  created_at: string
  updated_at: string
}

export type WeatherType = '晴れ' | '曇り' | '雨' | '雪' | '不明'
