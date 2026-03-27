'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCalendarInfo } from '@/lib/holidays'
import { format, subMonths } from 'date-fns'
import type { Prediction } from '@/types/database'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function PredictionsPage() {
  const { store } = useStore()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    if (!store) return

    const load = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('predictions')
        .select('*')
        .eq('store_id', store.id)
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`)
        .order('date', { ascending: false })

      setPredictions(data ?? [])
      setLoading(false)
    }
    load()
  }, [store, month])

  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + delta)
    setMonth(format(d, 'yyyy-MM'))
  }

  // 統計
  const withActuals = predictions.filter(p => p.actual_sales_count != null && p.predicted_sales_count != null)
  const avgError = withActuals.length > 0
    ? Math.round(withActuals.reduce((s, p) => s + Math.abs((p.actual_sales_count ?? 0) - (p.predicted_sales_count ?? 0)), 0) / withActuals.length)
    : null
  const mape = withActuals.length > 0
    ? Math.round(
        withActuals.reduce((s, p) => {
          const actual = p.actual_sales_count ?? 0
          if (actual === 0) return s
          return s + Math.abs(actual - (p.predicted_sales_count ?? 0)) / actual
        }, 0) / withActuals.length * 100
      )
    : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">予測履歴</h1>

      {/* 月選択 */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40 text-center"
        />
        <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 精度サマリ */}
      {withActuals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">比較可能日数</p>
              <p className="text-xl font-bold">{withActuals.length}日</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">平均誤差</p>
              <p className="text-xl font-bold">{avgError}個</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">MAPE</p>
              <p className="text-xl font-bold">{mape}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* テーブル */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-center py-8 text-gray-400">読み込み中...</p>
          ) : predictions.length === 0 ? (
            <p className="text-center py-8 text-gray-400">この月の予測データはありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2 text-left font-medium">日付</th>
                    <th className="py-2 text-right font-medium">予測</th>
                    <th className="py-2 text-right font-medium">実績</th>
                    <th className="py-2 text-right font-medium">誤差</th>
                    <th className="py-2 text-right font-medium">推奨(合)</th>
                    <th className="py-2 text-left font-medium">根拠</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred) => {
                    const cal = getCalendarInfo(pred.date)
                    const error = pred.actual_sales_count != null && pred.predicted_sales_count != null
                      ? pred.actual_sales_count - pred.predicted_sales_count
                      : null
                    return (
                      <tr key={pred.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2.5">
                          <span className={cal.is_weekend || cal.is_holiday ? 'text-red-500' : ''}>
                            {format(new Date(pred.date), 'M/d')}({cal.weekday_name})
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          {pred.predicted_sales_count ?? '-'}
                        </td>
                        <td className="py-2.5 text-right">
                          {pred.actual_sales_count ?? '-'}
                        </td>
                        <td className="py-2.5 text-right">
                          {error != null ? (
                            <span className={error > 0 ? 'text-blue-600' : error < 0 ? 'text-red-600' : 'text-gray-500'}>
                              {error > 0 ? '+' : ''}{error}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 text-right">
                          {pred.final_recommended_value ?? pred.predicted_cooked_rice_go ?? '-'}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs max-w-[250px] truncate">
                          {pred.reasoning_text ?? ''}
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
