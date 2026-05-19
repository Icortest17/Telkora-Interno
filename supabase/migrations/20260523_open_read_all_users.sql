-- ─────────────────────────────────────────────────────────────────
-- Todos los usuarios autenticados pueden VER todos los registros.
-- Solo el propietario o admin puede CREAR / EDITAR / ELIMINAR.
-- ─────────────────────────────────────────────────────────────────

-- Helper (idempotente)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin');
$$;

-- ─── Eliminar todas las políticas actuales ───────────────────────
DO $$
DECLARE
  pol RECORD;
  tables TEXT[] := ARRAY['leads','transacciones','proyectos','lead_actividades'];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR pol IN SELECT policyname FROM pg_policies
               WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ─── leads ───────────────────────────────────────────────────────
CREATE POLICY "leads_leer" ON leads
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "leads_insertar" ON leads
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "leads_actualizar" ON leads
  FOR UPDATE
  USING  (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "leads_eliminar" ON leads
  FOR DELETE USING (owner_id = auth.uid() OR is_admin());

-- ─── proyectos ───────────────────────────────────────────────────
CREATE POLICY "proyectos_leer" ON proyectos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "proyectos_insertar" ON proyectos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "proyectos_actualizar" ON proyectos
  FOR UPDATE
  USING  (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "proyectos_eliminar" ON proyectos
  FOR DELETE USING (owner_id = auth.uid() OR is_admin());

-- ─── transacciones ───────────────────────────────────────────────
CREATE POLICY "transacciones_leer" ON transacciones
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "transacciones_insertar" ON transacciones
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "transacciones_actualizar" ON transacciones
  FOR UPDATE
  USING  (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "transacciones_eliminar" ON transacciones
  FOR DELETE USING (owner_id = auth.uid() OR is_admin());

-- ─── lead_actividades ────────────────────────────────────────────
-- Lectura abierta a todos (el lead ya es visible)
CREATE POLICY "actividades_leer" ON lead_actividades
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "actividades_insertar" ON lead_actividades
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "actividades_actualizar" ON lead_actividades
  FOR UPDATE USING (usuario_id = auth.uid() OR is_admin());

CREATE POLICY "actividades_eliminar" ON lead_actividades
  FOR DELETE USING (usuario_id = auth.uid() OR is_admin());
