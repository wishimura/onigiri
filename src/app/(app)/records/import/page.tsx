'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { parseCsv, CSV_TEMPLATE, type ParsedRecord } from '@/lib/csv'
import { toast } from 'sonner'
import { Upload, Download, FileText, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ImportPage() {
  const { store } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedRecord[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await parseCsv(file)
    setParsed(result.records)
    setErrors(result.errors)
    setDone(false)
  }

  const handleImport = async () => {
    if (!parsed || !store) return

    setImporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const records = parsed.map(r => ({
      store_id: store.id,
      date: r.date,
      sales_count: r.sales_count,
      sales_amount: r.sales_amount,
      cooked_rice_go: r.cooked_rice_go,
      waste_count: r.waste_count,
      sold_out_flag: r.sold_out_flag,
      note: r.note,
      created_by: user?.id,
    }))

    // バッチで100件ずつupsert
    let successCount = 0
    let errorCount = 0
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100)
      const { error } = await supabase
        .from('daily_records')
        .upsert(batch, { onConflict: 'store_id,date' })

      if (error) {
        errorCount += batch.length
      } else {
        successCount += batch.length
      }
    }

    if (errorCount > 0) {
      toast.error(`${errorCount}件の取込に失敗しました`)
    }
    if (successCount > 0) {
      toast.success(`${successCount}件を取り込みました`)
    }

    setDone(true)
    setImporting(false)
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'onigiri_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/records">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">CSV取込</h1>
      </div>

      {/* テンプレート */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. テンプレートをダウンロード</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            下記のCSVテンプレートを使って、過去の実績データを整形してください。
          </p>
          <div className="bg-gray-50 rounded-md p-3 mb-3 text-xs font-mono overflow-x-auto">
            <p className="text-gray-500">date,sales_count,sales_amount,cooked_rice_go,waste_count,sold_out,note</p>
            <p>2025-01-06,180,54000,14,5,false,通常営業</p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            テンプレートCSV
          </Button>
        </CardContent>
      </Card>

      {/* アップロード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. CSVファイルをアップロード</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-orange-300 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">クリックしてCSVファイルを選択</p>
            <p className="text-xs text-gray-400 mt-1">UTF-8形式のCSVに対応</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* プレビュー */}
      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. 内容確認・取込</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.length > 0 && (
              <div className="bg-red-50 rounded-md p-3 mb-4">
                <p className="text-sm font-medium text-red-600 mb-1">エラー ({errors.length}件)</p>
                {errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-red-500">{err}</p>
                ))}
                {errors.length > 5 && (
                  <p className="text-xs text-red-400 mt-1">...他 {errors.length - 5}件</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium">{parsed.length}件のデータ</span>
              {done && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  取込完了
                </Badge>
              )}
            </div>

            {parsed.length > 0 && (
              <>
                <div className="overflow-x-auto mb-4 max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b text-gray-500">
                        <th className="py-1 text-left">日付</th>
                        <th className="py-1 text-right">販売数</th>
                        <th className="py-1 text-right">売上</th>
                        <th className="py-1 text-right">炊飯</th>
                        <th className="py-1 text-right">廃棄</th>
                        <th className="py-1 text-left">メモ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-1">{r.date}</td>
                          <td className="py-1 text-right">{r.sales_count ?? '-'}</td>
                          <td className="py-1 text-right">{r.sales_amount ?? '-'}</td>
                          <td className="py-1 text-right">{r.cooked_rice_go ?? '-'}</td>
                          <td className="py-1 text-right">{r.waste_count ?? '-'}</td>
                          <td className="py-1 truncate max-w-[150px]">{r.note ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.length > 20 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      ...他 {parsed.length - 20}件
                    </p>
                  )}
                </div>

                {!done && (
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={handleImport}
                    disabled={importing}
                  >
                    {importing ? '取込中...' : `${parsed.length}件を取り込む`}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
