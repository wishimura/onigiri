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
  ChefHat,
  Thermometer,
  CloudRain,
  PlusCircle,
  Sun,
} from 'lucide-react'

interface DayData {
  weather: WeatherData | null
  prediction: Prediction | null
}

export default function DashboardPage() {
  const { store, settings } = useStore()
  const [todayData, setTodayData] = useState<DayData>({ weather: null, prediction: null })
  const [tomorrowData, setTomorrowData] = useState<DayData>({ weather: null, prediction: null })
  const [recentRecords, setRecentRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!store) return

    const load = async () => {
      const supabase = createClient()
      const today = format(new Date(), 'yyyy-MM-dd')
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

      // 天気データがなければ自動取得
      let { data: todayWeather } = await supabase
        .from('weather_data')
        .select('*')
        .eq('store_id', store.id)
        .eq('date', today)
        .single()

      if (!todayWeather && store.latitude && store.longitude) {
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
          const { data } = await supabase
            .from('weather_data')
            .select('*')
            .eq('store_id', store.id)
            .eq('date', today)
            .single()
          todayWeather = data
        } catch {}
      }

      // 予測を今日＋明日分生成
      try {
        await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: store.id, dates: [today, tomorrow] }),
        })
      } catch {}

      // 今日・明日の天気を取得
      const { data: tmrwWeather } = await supabase
        .from('weather_data')
        .select('*')
        .eq('store_id', store.id)
        .eq('date', tomorrow)
        .single()

      // 今日・明日の予測を取得
      const { data: todayPred } = await supabase
        .from('predictions')
        .select('*')
        .eq('store_id', store.id)
        .eq('date', today)
        .single()

      const { data: tmrwPred } = await supabase
        .from('predictions')
        .select('*')
        .eq('store_id', store.id)
        .eq('date', tomorrow)
        .single()

      setTodayData({ weather: todayWeather, prediction: todayPred })
      setTomorrowData({ weather: tmrwWeather, prediction: tmrwPred })

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

      {/* ===== 今日の予測（メイン） ===== */}
      <Card className="border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-orange-700">
              📍 今日の予測（{todayCal.weekday_name}曜日）
              {todayCal.is_holiday && (
                <Badge variant="secondary" className="ml-2 bg-red-100 text-red-600 text-xs">祝</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            {/* 左：予測数値 */}
            <div>
              {todayData.prediction ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-6">
                    <div>
                      <p className="text-4xl font-extrabold text-orange-700">
                        {todayData.prediction.predicted_sales_count}
                        <span className="text-lg font-normal text-orange-500 ml-1">個</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-6 w-6 text-orange-500" />
                      <p className="text-2xl font-bold text-orange-600">
                        {todayData.prediction.final_recommended_value ?? todayData.prediction.predicted_cooked_rice_go}
                        <span className="text-sm font-normal ml-1">合</span>
                      </p>
                    </div>
                  </div>
                  {todayData.prediction.reasoning_text && (
                    <p className="text-sm text-orange-600/80">{todayData.prediction.reasoning_text}</p>
                  )}
                  <div className="flex items-center gap-3">
                    {todayData.prediction.confidence_score != null && (
                      <Badge variant="outline" className="text-xs border-orange-300">
                        信頼度: {Math.round(todayData.prediction.confidence_score * 100)}%
                      </Badge>
                    )}
                    {todayRecord && (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                        実績: {todayRecord.sales_count}個
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-orange-500">
                  <p>予測データがありません</p>
                  <p className="text-xs mt-1">実績データを入力すると予測が生成されます</p>
                </div>
              )}
            </div>

            {/* 右：天気 */}
            <div className="flex flex-col items-center justify-center border-l border-orange-200 pl-4 min-w-[120px]">
              {todayData.weather ? (
                <>
                  <span className="text-4xl">{weatherTypeToEmoji(todayData.weather.weather_type as any)}</span>
                  <p className="text-sm font-semibold mt-1">{todayData.weather.weather_type}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Thermometer className="h-3 w-3" />
                    {todayData.weather.temp_min}℃〜{todayData.weather.temp_max}℃
                  </p>
                  {todayData.weather.precipitation != null && todayData.weather.precipitation > 0 && (
                    <p className="text-xs text-blue-500 flex items-center gap-1">
                      <CloudRain className="h-3 w-3" />
                      {todayData.weather.precipitation}mm
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400">天気データなし</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== 明日の予測 ===== */}
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              明日の予測（{tomorrowCal.weekday_name}曜日）
              {tomorrowCal.is_holiday && (
                <Badge variant="secondary" className="ml-2 bg-red-50 text-red-600 text-xs">祝</Badge>
              )}
            </CardTitle>
            {tomorrowData.weather && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>{weatherTypeToEmoji(tomorrowData.weather.weather_type as any)}</span>
                <span>{tomorrowData.weather.weather_type}</span>
                <span>{tomorrowData.weather.temp_min}〜{tomorrowData.weather.temp_max}℃</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tomorrowData.prediction ? (
            <div className="flex items-baseline gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {tomorrowData.prediction.predicted_sales_count}
                  <span className="text-sm font-normal text-gray-500 ml-1">個</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <ChefHat className="h-4 w-4 text-gray-500" />
                <p className="text-lg font-semibold text-gray-700">
                  {tomorrowData.prediction.final_recommended_value ?? tomorrowData.prediction.predicted_cooked_rice_go}
                  <span className="text-xs font-normal ml-1">合</span>
                </p>
              </div>
              {tomorrowData.prediction.confidence_score != null && (
                <Badge variant="outline" className="text-xs">
                  信頼度: {Math.round(tomorrowData.prediction.confidence_score * 100)}%
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">予測データがありません</p>
          )}
          {tomorrowData.prediction?.reasoning_text && (
            <p className="text-xs text-gray-500 mt-2">{tomorrowData.prediction.reasoning_text}</p>
          )}
        </CardContent>
      </Card>

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
