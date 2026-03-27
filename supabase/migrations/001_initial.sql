-- ============================================
-- おにぎり屋需要予測アプリ 初期マイグレーション
-- ============================================

-- 店舗マスタ
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 店舗設定
CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rice_per_go INTEGER NOT NULL DEFAULT 13,
  business_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id)
);

-- 日次実績
CREATE TABLE daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sales_count INTEGER,
  sales_amount INTEGER,
  cooked_rice_go DOUBLE PRECISION,
  waste_count INTEGER,
  sold_out_flag BOOLEAN DEFAULT false,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, date)
);

-- 天気データ
CREATE TABLE weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weather_type TEXT,
  temp_max DOUBLE PRECISION,
  temp_min DOUBLE PRECISION,
  temp_avg DOUBLE PRECISION,
  precipitation DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  source_api TEXT DEFAULT 'open-meteo',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, date)
);

-- イベント・メモ解析
CREATE TABLE event_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  raw_note TEXT,
  extracted_tags TEXT[],
  ai_summary TEXT,
  impact_label TEXT,
  reviewed_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, date)
);

-- 予測結果
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  predicted_sales_count INTEGER,
  predicted_cooked_rice_go DOUBLE PRECISION,
  confidence_score DOUBLE PRECISION,
  reasoning_text TEXT,
  manual_adjusted_value DOUBLE PRECISION,
  final_recommended_value DOUBLE PRECISION,
  actual_sales_count INTEGER,
  actual_cooked_rice_go DOUBLE PRECISION,
  prediction_error DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, date)
);

-- ユーザーと店舗の紐付け（複数店舗対応用）
CREATE TABLE store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- インデックス
CREATE INDEX idx_daily_records_store_date ON daily_records(store_id, date);
CREATE INDEX idx_weather_data_store_date ON weather_data(store_id, date);
CREATE INDEX idx_predictions_store_date ON predictions(store_id, date);
CREATE INDEX idx_event_notes_store_date ON event_notes(store_id, date);

-- RLS有効化
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: store_membersベースのアクセス制御
CREATE POLICY "Users can view their stores"
  ON stores FOR SELECT
  USING (owner_user_id = auth.uid() OR id IN (
    SELECT store_id FROM store_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert stores"
  ON stores FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can update stores"
  ON stores FOR UPDATE
  USING (owner_user_id = auth.uid());

-- store_members ポリシー
CREATE POLICY "Members can view memberships"
  ON store_members FOR SELECT
  USING (user_id = auth.uid() OR store_id IN (
    SELECT id FROM stores WHERE owner_user_id = auth.uid()
  ));

CREATE POLICY "Owners can manage members"
  ON store_members FOR ALL
  USING (store_id IN (
    SELECT id FROM stores WHERE owner_user_id = auth.uid()
  ));

-- 共通データアクセスポリシー（store_member or owner）
CREATE OR REPLACE FUNCTION user_store_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM stores WHERE owner_user_id = auth.uid()
  UNION
  SELECT store_id FROM store_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Access store_settings"
  ON store_settings FOR ALL
  USING (store_id IN (SELECT user_store_ids()));

CREATE POLICY "Access daily_records"
  ON daily_records FOR ALL
  USING (store_id IN (SELECT user_store_ids()));

CREATE POLICY "Access weather_data"
  ON weather_data FOR ALL
  USING (store_id IN (SELECT user_store_ids()));

CREATE POLICY "Access event_notes"
  ON event_notes FOR ALL
  USING (store_id IN (SELECT user_store_ids()));

CREATE POLICY "Access predictions"
  ON predictions FOR ALL
  USING (store_id IN (SELECT user_store_ids()));

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER daily_records_updated_at BEFORE UPDATE ON daily_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER predictions_updated_at BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
