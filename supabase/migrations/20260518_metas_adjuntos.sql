-- Migration: Add adjuntos column to leads and create metas table
-- Run this in the Supabase SQL Editor

-- 1. Add adjuntos jsonb column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

-- 2. Create metas table for monthly goals
CREATE TABLE IF NOT EXISTS metas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  mes date NOT NULL, -- first day of the month (e.g. 2026-05-01)
  tipo text NOT NULL, -- 'leads_cerrados' | 'pipeline_valor' | 'ingresos'
  objetivo numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mes, tipo)
);

-- 3. Enable RLS on metas
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'metas' AND policyname = 'usuarios ven sus metas'
  ) THEN
    CREATE POLICY "usuarios ven sus metas" ON metas FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
