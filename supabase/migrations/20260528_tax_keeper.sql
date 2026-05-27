-- Tax Keeper: track estimated tax withholdings per month

CREATE TABLE IF NOT EXISTS tax_withholdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  gross_income INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  estimated_tax INTEGER NOT NULL DEFAULT 0,
  actually_set_aside INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- RLS
ALTER TABLE tax_withholdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax withholdings"
  ON tax_withholdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax withholdings"
  ON tax_withholdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax withholdings"
  ON tax_withholdings FOR UPDATE
  USING (auth.uid() = user_id);

-- Add tax settings to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tax_settings JSONB DEFAULT NULL;
