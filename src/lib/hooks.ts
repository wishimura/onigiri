'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Store, StoreSettings } from '@/types/database'

export function useStore() {
  const [store, setStore] = useState<Store | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: stores } = await supabase
        .from('stores')
        .select('*')
        .limit(1)

      if (stores && stores.length > 0) {
        setStore(stores[0])
        const { data: storeSettings } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_id', stores[0].id)
          .single()
        setSettings(storeSettings)
      }

      setLoading(false)
    }
    load()
  }, [])

  return { store, settings, loading }
}

export function useStoreSetup() {
  const [loading, setLoading] = useState(false)

  const createStore = async (name: string) => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        name,
        owner_user_id: user.id,
        latitude: 35.6762,  // デフォルト: 東京
        longitude: 139.6503,
      })
      .select()
      .single()

    if (error) throw error

    // デフォルト設定を作成
    await supabase.from('store_settings').insert({
      store_id: store.id,
      rice_per_go: 13,
      business_days: [1, 2, 3, 4, 5, 6],
    })

    // 自分をメンバーに追加
    await supabase.from('store_members').insert({
      store_id: store.id,
      user_id: user.id,
      role: 'owner',
    })

    setLoading(false)
    return store
  }

  return { createStore, loading }
}
