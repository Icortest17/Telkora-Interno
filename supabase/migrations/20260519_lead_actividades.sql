-- Lead activity log
CREATE TABLE IF NOT EXISTS lead_actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  tipo text NOT NULL CHECK (tipo IN ('nota', 'llamada', 'email', 'whatsapp', 'reunion', 'cambio_estado', 'propuesta')),
  contenido text NOT NULL DEFAULT '',
  estado_anterior text,
  estado_nuevo text
);

ALTER TABLE lead_actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven actividades" ON lead_actividades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leads WHERE leads.id = lead_actividades.lead_id
    )
  );
