-- ─────────────────────────────────────────────
-- SECURITY: Fix RLS policies for all tables
-- ─────────────────────────────────────────────

-- Helper: is current user an admin?
-- We use a security definer function to avoid RLS recursion on perfiles
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

-- ─── lead_actividades ─────────────────────────
-- Drop the overly permissive single policy
DROP POLICY IF EXISTS "usuarios ven actividades" ON lead_actividades;

-- SELECT: only see activities for leads you own (or admin sees all)
CREATE POLICY "ver actividades propias" ON lead_actividades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_actividades.lead_id
        AND (leads.owner_id = auth.uid() OR is_admin())
    )
  );

-- INSERT: can only log activity on leads you own (or admin)
CREATE POLICY "insertar actividades propias" ON lead_actividades
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_actividades.lead_id
        AND (leads.owner_id = auth.uid() OR is_admin())
    )
  );

-- ─── leads ────────────────────────────────────
-- Ensure RLS is on (idempotent)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop any existing loose policy to recreate clean
DROP POLICY IF EXISTS "usuarios ven sus leads" ON leads;
DROP POLICY IF EXISTS "socios ven sus leads" ON leads;
DROP POLICY IF EXISTS "admin ve todos los leads" ON leads;

CREATE POLICY "acceso leads" ON leads
  FOR ALL USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- ─── transacciones ────────────────────────────
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios ven sus transacciones" ON transacciones;
DROP POLICY IF EXISTS "acceso transacciones" ON transacciones;

CREATE POLICY "acceso transacciones" ON transacciones
  FOR ALL USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- ─── clientes ─────────────────────────────────
-- Clientes are shared company data, any authenticated user can read
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios ven clientes" ON clientes;
DROP POLICY IF EXISTS "acceso clientes" ON clientes;

CREATE POLICY "acceso clientes" ON clientes
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── proyectos ────────────────────────────────
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios ven proyectos" ON proyectos;
DROP POLICY IF EXISTS "acceso proyectos" ON proyectos;

CREATE POLICY "acceso proyectos" ON proyectos
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── perfiles ─────────────────────────────────
-- Any authenticated user can read all profiles (needed for resolving names)
-- But only own profile for write, or admin for all
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios ven perfiles" ON perfiles;
DROP POLICY IF EXISTS "acceso perfiles" ON perfiles;

CREATE POLICY "leer perfiles" ON perfiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "escribir perfil propio" ON perfiles
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "insertar perfil propio" ON perfiles
  FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

-- ─── configuracion ────────────────────────────
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios ven configuracion" ON configuracion;

CREATE POLICY "leer configuracion" ON configuracion
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "escribir configuracion" ON configuracion
  FOR UPDATE USING (is_admin());

-- ─── metas (already has policy, keep it) ──────
-- Already correct: auth.uid() = user_id
