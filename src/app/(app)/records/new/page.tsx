'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/hooks'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRecordPage() {
  const { store } = useStore()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [formData, setFormData] = useState({
    date: today,
    sales_count: '',
    sales_amount: '',
    cooked_rice_go: '',
    waste_count: '',
    sold_out_flag: false,
    note: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const record = {
      store_id: store.id,
      date: formData.date,
      sales_count: formData.sales_count ? parseInt(formData.sales_count) : null,
      sales_amount: formData.sales_amount ? parseInt(formData.sales_amount) : null,
      cooked_rice_go: formData.cooked_rice_go ? parseFloat(formData.cooked_rice_go) : null,
      waste_count: formData.waste_count ? parseInt(formData.waste_count) : null,
      sold_out_flag: formData.sold_out_flag,
      note: formData.note || null,
      created_by: user?.id,
    }

    const { error } = await supabase
      .from('daily_records')
      .upsert(record, { onConflict: 'store_id,date' })

    if (error) {
      toast.error('保存に失敗しました: ' + error.message)
    } else {
      toast.success('実績を保存しました')

      // メモがあればevent_notesにも保存
      if (formData.note) {
        await supabase.from('event_notes').upsert({
          store_id: store.id,
          date: formData.date,
          raw_note: formData.note,
        }, { onConflict: 'store_id,date' })
      }

      router.push('/records')
    }
    setSaving(false)
  }

  const update = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/records">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">日次実績入力</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 日付 */}
            <div className="space-y-2">
              <Label htmlFor="date">日付</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => update('date', e.target.value)}
                required
              />
            </div>

            {/* 販売数と売上 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sales_count">販売個数</Label>
                <Input
                  id="sales_count"
                  type="number"
                  min="0"
                  placeholder="例: 200"
                  value={formData.sales_count}
                  onChange={(e) => update('sales_count', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales_amount">売上金額（円）</Label>
                <Input
                  id="sales_amount"
                  type="number"
                  min="0"
                  placeholder="例: 60000"
                  value={formData.sales_amount}
                  onChange={(e) => update('sales_amount', e.target.value)}
                />
              </div>
            </div>

            {/* 炊飯量と廃棄 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cooked_rice_go">炊飯量（合）</Label>
                <Input
                  id="cooked_rice_go"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="例: 15"
                  value={formData.cooked_rice_go}
                  onChange={(e) => update('cooked_rice_go', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waste_count">廃棄数</Label>
                <Input
                  id="waste_count"
                  type="number"
                  min="0"
                  placeholder="例: 5"
                  value={formData.waste_count}
                  onChange={(e) => update('waste_count', e.target.value)}
                />
              </div>
            </div>

            {/* 売り切れ */}
            <div className="flex items-center gap-2">
              <input
                id="sold_out"
                type="checkbox"
                checked={formData.sold_out_flag}
                onChange={(e) => update('sold_out_flag', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <Label htmlFor="sold_out" className="font-normal">売り切れあり</Label>
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                placeholder="例: 商店街で夏祭り、雨だが来客多め、など"
                value={formData.note}
                onChange={(e) => update('note', e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存する'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
