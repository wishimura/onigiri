'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { weatherTypeToEmoji } from '@/lib/weather'
import { getCalendarInfo } from '@/lib/holidays'
import { format, subDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { DailyRecord, Prediction, WeatherData } from '@/types/database'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChefHat,
  Thermometer,
  CloudRain,
  PlusCircle,
} from 'lucide-react'

export default function DashboardPage() {
  const { store, settings } = useStore()
  const [todayWeather, setTodayWeather] = useState<WeatherData | null>(null)
  const [tomorrowWeather, setTomorrowWeather] = useState<WeatherData | null>(null)
  const [tomorrowPrediction, setTomorrowPrediction] = useState<Prediction | null>(null)
  const [recentRecords, setRecentRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!store) return

    const load = async () => {
      const supabase = createClient()
      const today = format(new Date(), 'yyyy-MM-dd')
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

      // 今日の天気を取得
      let { data: weather } = await supabase
        .from('weather_data')
        .select('*')
        .eq('store_id', store.id)
        .eq('date', today)
        .single()

      // 天気データがなければ自動取得
      if (!weather && store.latitude && store.longitude) {
        try {
          await fetch('/api/weather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId: store.id,
              latitude: store.latitude,
              longitude: store.longitude,
              days: 7,
            }),
          })
          const { data: freshWeather } = await supabase
            .from('weather_data')
            .select('*')
            .eq('store_id', store.id)
            .eq('date', today)
            .single()
          weather = freshWeather
        } catch {}
      }
      setTodayWeather(weather)

      // 明日の天気（予報）を取得
      const { data: tmrwWeather } = await supabase
        .from('weather_data')
        .select('*')
        .eq('store_id', store.id)
        .eq('date', tomorrow)
        .single()
      setTomorrowWeather(tmrwWeather)

      // 明日の予測を取得
      let { data: prediction } = await supabase
        .from('predictions')
        .select('*')
        .eq('store_id', store.id)
        .eq('date', tomorrow)
        .single()

      // 予測がなければ自動生成（実績データがある場合のみ）
      if (!prediction) {
        try {
          const res = await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeId: store.id }),
          })
          if (res.ok) {
            const { data: freshPrediction } = await supabase
              .from('predictions')
              .select('*')
              .eq('store_id', store.id)
              .eq('date', tomorrow)
              .single()
            prediction = freshPrediction
          }
        } catch {}
      }
      setTomorrowPrediction(prediction)

      // 直近7日の実績
      const { data: records } = await supabase
        .from('daily_records')
        .select('*')
        .eq('store_id', store.id)
        .gte('date', weekAgo)
        .lte('date', today)
        .order('date', { ascending: false })
      setRecentRecords(records ?? [])

      setLoading(false)
    }
    load()
  }, [store])

  if (loading || !store) {
    return <div className="text-center py-12 text-gray-500">読み込み中...</div>
  }

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')
  const todayCal = getCalendarInfo(todayStr)
  const tomorrowCal = getCalendarInfo(tomorrowStr)

  const todayRecord = recentRecords.find(r => r.date === todayStr)
  const avgSales = recentRecords.length > 0
    ? Math.round(recentRecords.reduce((s, r) => s + (r.sales_count ?? 0), 0) / recentRecords.length)
    : null

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          <p className="text-gray-500">
            {format(today, 'yyyy年M月d日(E)', { locale: ja })}
            {todayCal.is_holiday && (
              <Badge variant="secondary" className="ml-2 bg-red-50 text-red-600">
                {todayCal.holiday_name}
              </Badge>
            )}
          </p>
        </div>
        <Link href="/records/new">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            日次入力
          </Button>
        </Link>
      </div>

      {/* 今日の天気 + 明日の予測 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 今日の天気 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">今日の天気</CardTitle>
          </CardHeader>
          <CardContent>
            {todayWeather ? (
              <div className="flex items-center gap-4">
                <span className="text-4xl">{weatherTypeToEmoji(todayWeather.weather_type as any)}</span>
                <div>
                  <p className="text-lg font-semibold">{todayWeather.weather_type}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Thermometer className="h-4 w-4" />
                    <span>{todayWeather.temp_min}℃ / {todayWeather.temp_max}℃</span>
                    {todayWeather.precipitation != null && todayWeather.precipitation > 0 && (
                      <>
                        <CloudRain className="h-4 w-4 ml-2" />
                        <span>{todayWeather.precipitation}mm</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">天気データがありません。設定から天気を取得してください。</p>
            )}
          </CardContent>
        </Card>

        {/* 明日の予測 */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-600">
                明日の予測 ({tomorrowCal.weekday_name}曜日)
                {tomorrowCal.is_holiday && (
                  <Badge variant="secondary" className="ml-2 bg-red-50 text-red-600 text-xs">祝</Badge>
                )}
              </CardTitle>
              {tomorrowWeather && (
                <div className="flex items-center gap-1.5 text-xs text-orange-500">
                  <span>{weatherTypeToEmoji(tomorrowWeather.weather_type as any)}</span>
                  <span>{tomorrowWeather.weather_type}</span>
                  <span>{tomorrowWeather.temp_min}~{tomorrowWeather.temp_max}℃</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {tomorrowPrediction ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-3xl font-bold text-orange-700">
                      {tomorrowPrediction.predicted_sales_count}
                      <span className="text-base font-normal text-orange-500 ml-1">個</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-500" />
                    <p className="text-xl font-semibold text-orange-600">
                      {tomorrowPrediction.final_recommended_value ?? tomorrowPrediction.predicted_cooked_rice_go}
                      <span className="text-sm font-normal ml-1">合</span>
                    </p>
                  </div>
                </div>
                {tomorrowPrediction.reasoning_text && (
                  <p className="text-xs text-orange-600/70">{tomorrowPrediction.reasoning_text}</p>
                )}
                {tomorrowPrediction.confidence_score != null && (
                  <Badge variant="outline" className="text-xs">
                    信頼度: {Math.round(tomorrowPrediction.confidence_score * 100)}%
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-sm text-orange-500">
                <p>予測データがありません</p>
                <p className="text-xs mt-1">実績データを入力すると予測が生成されます</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 今日の実績サマリ */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">今日の販売</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {todayRecord?.sales_count != null ? `${todayRecord.sales_count}個` : '未入力'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">直近7日平均</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {avgSales != null ? `${avgSales}個` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">廃棄</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {todayRecord?.waste_count != null ? `${todayRecord.waste_count}個` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 直近の実績一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">直近の実績</CardTitle>
            <Link href="/records" className="text-sm text-orange-600 hover:underline">
              すべて見る
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              まだ実績データがありません。
              <Link href="/records/new" className="text-orange-600 hover:underline ml-1">
                日次入力
              </Link>
              または
              <Link href="/records/import" className="text-orange-600 hover:underline ml-1">
                CSV取込
              </Link>
              から始めましょう。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2 text-left font-medium">日付</th>
                    <th className="py-2 text-right font-medium">販売数</th>
                    <th className="py-2 text-right font-medium">炊飯量</th>
                    <th className="py-2 text-right font-medium">廃棄</th>
                    <th className="py-2 text-center font-medium">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((record) => {
                    const cal = getCalendarInfo(record.date)
                    return (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-2">
                          {format(new Date(record.date), 'M/d')}({cal.weekday_name})
                          {cal.is_holiday && <span className="text-red-500 text-xs ml-1">祝</span>}
                        </td>
                        <td className="py-2 text-right font-medium">{record.sales_count ?? '-'}</td>
                        <td className="py-2 text-right">{record.cooked_rice_go ?? '-'}合</td>
                        <td className="py-2 text-right">{record.waste_count ?? '-'}</td>
                        <td className="py-2 text-center">
                          {record.sold_out_flag && (
                            <Badge variant="destructive" className="text-xs">売切</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
