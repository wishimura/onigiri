'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, MapPin, RefreshCw } from 'lucide-react'

const WEEKDAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
]

export default function SettingsPage() {
  const { store, settings, loading } = useStore()
  const [saving, setSaving] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    rice_per_go: '13',
    business_days: [1, 2, 3, 4, 5, 6] as number[],
  })

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name,
        latitude: store.latitude?.toString() ?? '',
        longitude: store.longitude?.toString() ?? '',
        address: store.address ?? '',
        rice_per_go: settings?.rice_per_go?.toString() ?? '13',
        business_days: settings?.business_days ?? [1, 2, 3, 4, 5, 6],
      })
    }
  }, [store, settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    setSaving(true)
    const supabase = createClient()

    // 店舗情報更新
    const { error: storeError } = await supabase
      .from('stores')
      .update({
        name: formData.name,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        address: formData.address || null,
      })
      .eq('id', store.id)

    // 設定更新
    const { error: settingsError } = await supabase
      .from('store_settings')
      .upsert({
        store_id: store.id,
        rice_per_go: parseInt(formData.rice_per_go) || 13,
        business_days: formData.business_days,
      }, { onConflict: 'store_id' })

    if (storeError || settingsError) {
      toast.error('保存に失敗しました')
    } else {
      toast.success('設定を保存しました')
    }
    setSaving(false)
  }

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      business_days: prev.business_days.includes(day)
        ? prev.business_days.filter(d => d !== day)
        : [...prev.business_days, day].sort(),
    }))
  }

  const handleFetchWeather = async () => {
    if (!store || !formData.latitude || !formData.longitude) {
      toast.error('緯度・経度を設定してください')
      return
    }

    setFetchingWeather(true)
    try {
      const res = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          days: 30,
        }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error('天気取得失敗: ' + data.error)
      } else {
        toast.success(`${data.count}日分の天気データを取得しました`)
      }
    } catch {
      toast.error('天気データの取得に失敗しました')
    }
    setFetchingWeather(false)
  }

  const handleGeneratePrediction = async () => {
    if (!store) return

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error('予測生成失敗: ' + data.error)
      } else {
        toast.success('明日の予測を生成しました')
      }
    } catch {
      toast.error('予測の生成に失敗しました')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 店舗情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">店舗情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>店舗名</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>住所</Label>
              <Input
                placeholder="例: 東京都渋谷区..."
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>緯度</Label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="35.6762"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>経度</Label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="139.6503"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              <MapPin className="h-3 w-3 inline mr-1" />
              天気データの取得に使用します。Google Mapsなどで店舗の緯度・経度を確認してください。
            </p>
          </CardContent>
        </Card>

        {/* 予測設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">予測設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>1合あたりの想定おにぎり個数</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={formData.rice_per_go}
                onChange={(e) => setFormData(prev => ({ ...prev, rice_per_go: e.target.value }))}
              />
              <p className="text-xs text-gray-400">
                一般的に1合(150g)で約13個(1個あたり約115g)が目安です
              </p>
            </div>

            <div className="space-y-2">
              <Label>営業日</Label>
              <div className="flex gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      formData.business_days.includes(day.value)
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '設定を保存'}
        </Button>
      </form>

      {/* データ操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">データ操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleFetchWeather}
            disabled={fetchingWeather}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${fetchingWeather ? 'animate-spin' : ''}`} />
            {fetchingWeather ? '取得中...' : '過去30日の天気データを取得'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGeneratePrediction}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            明日の予測を生成
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
