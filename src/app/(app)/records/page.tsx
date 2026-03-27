'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getCalendarInfo } from '@/lib/holidays'
import { format, subMonths } from 'date-fns'
import type { DailyRecord } from '@/types/database'
import Link from 'next/link'
import { PlusCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function RecordsPage() {
  const { store } = useStore()
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    if (!store) return

    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const startDate = `${month}-01`
      const endDate = `${month}-31`

      const { data } = await supabase
        .from('daily_records')
        .select('*')
        .eq('store_id', store.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      setRecords(data ?? [])
      setLoading(false)
    }
    load()
  }, [store, month])

  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + delta)
    setMonth(format(d, 'yyyy-MM'))
  }

  const totalSales = records.reduce((s, r) => s + (r.sales_count ?? 0), 0)
  const totalWaste = records.reduce((s, r) => s + (r.waste_count ?? 0), 0)
  const avgSales = records.length > 0 ? Math.round(totalSales / records.length) : 0
  const soldOutDays = records.filter(r => r.sold_out_flag).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">実績一覧</h1>
        <Link href="/records/new">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            入力
          </Button>
        </Link>
      </div>

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

      {/* サマリ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">合計販売数</p>
            <p className="text-xl font-bold">{totalSales}個</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">日平均</p>
            <p className="text-xl font-bold">{avgSales}個</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">合計廃棄</p>
            <p className="text-xl font-bold">{totalWaste}個</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500">売切れ日数</p>
            <p className="text-xl font-bold">{soldOutDays}日</p>
          </CardContent>
        </Card>
      </div>

      {/* テーブル */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-center py-8 text-gray-400">読み込み中...</p>
          ) : records.length === 0 ? (
            <p className="text-center py-8 text-gray-400">この月のデータはありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2 text-left font-medium">日付</th>
                    <th className="py-2 text-right font-medium">販売数</th>
                    <th className="py-2 text-right font-medium">売上</th>
                    <th className="py-2 text-right font-medium">炊飯</th>
                    <th className="py-2 text-right font-medium">廃棄</th>
                    <th className="py-2 text-center font-medium">状態</th>
                    <th className="py-2 text-left font-medium">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const cal = getCalendarInfo(record.date)
                    return (
                      <tr key={record.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2.5">
                          <span className={cal.is_weekend || cal.is_holiday ? 'text-red-500' : ''}>
                            {format(new Date(record.date), 'M/d')}({cal.weekday_name})
                          </span>
                          {cal.is_holiday && (
                            <span className="text-xs text-red-400 ml-1">{cal.holiday_name}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-medium">{record.sales_count ?? '-'}</td>
                        <td className="py-2.5 text-right">
                          {record.sales_amount != null ? `¥${record.sales_amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 text-right">{record.cooked_rice_go ?? '-'}合</td>
                        <td className="py-2.5 text-right">{record.waste_count ?? '-'}</td>
                        <td className="py-2.5 text-center">
                          {record.sold_out_flag && (
                            <Badge variant="destructive" className="text-xs">売切</Badge>
                          )}
                        </td>
                        <td className="py-2.5 text-gray-500 max-w-[200px] truncate">
                          {record.note ?? ''}
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
