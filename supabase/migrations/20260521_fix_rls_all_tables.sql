-- ─────────────────────────────────────────────────────────────────
-- FIX: Drop ALL existing policies on each table (no matter the name)
-- and recreate them correctly.
-- ─────────────────────────────────────────────────────────────────

-- 1. Drop every existing policy dynamically
DO $$
DECLARE
  pol RECORD;
  tables TEXT[] := ARRAY['leads','transacciones','clientes','proyectos','perfiles','configuracion','lead_actividades'];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- 2. Recreate is_admin() (idempotent)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin'
  );
$$;

-- 3. Enable RLS on all tables (idempotent)
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_actividades  ENABLE ROW LEVEL SECURITY;

-- ─── leads ──────────────────────────────────────────────────────
-- Socios only see/edit their own leads; admins see everything
CREATE POLICY "leads_acceso" ON leads
  FOR ALL
  USING  (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- ─── transacciones ──────────────────────────────────────────────
-- Same ownership model as leads
CREATE POLICY "transacciones_acceso" ON transacciones
  FOR ALL
  USING  (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- ─── clientes ───────────────────────────────────────────────────
-- Shared company data: any authenticated user can read and write
CREATE POLICY "clientes_acceso" ON clientes
  FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── proyectos ──────────────────────────────────────────────────
-- Shared: any authenticated user
CREATE POLICY "proyectos_acceso" ON proyectos
  FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── perfiles ───────────────────────────────────────────────────
-- Any authenticated user can read all profiles (needed to resolve names)
-- Users can only write their own profile; admins can write any
CREATE POLICY "perfiles_leer" ON perfiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "perfiles_escribir" ON perfiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "perfiles_actualizar" ON perfiles
  FOR UPDATE
  USING  (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- ─── configuracion ──────────────────────────────────────────────
-- Single-row company config. Any authenticated user can read and update.
-- (Socio access to pipeline probabilities / alert days is intentional)
CREATE POLICY "configuracion_acceso" ON configuracion
  FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── lead_actividades ───────────────────────────────────────────
-- Only see activities on leads you own (or admin); only insert on your own leads
CREATE POLICY "actividades_ver" ON lead_actividades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_actividades.lead_id
        AND (leads.owner_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "actividades_insertar" ON lead_actividades
  FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_actividades.lead_id
        AND (leads.owner_id = auth.uid() OR is_admin())
    )
  );

-- ─── metas ──────────────────────────────────────────────────────
-- Already has correct policy from 20260518, but refresh it anyway
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'metas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON metas', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "metas_acceso" ON metas
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
