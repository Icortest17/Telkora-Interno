-- Auto-calculate valor_ponderado = valor_estimado * probabilidad / 100
CREATE OR REPLACE FUNCTION calc_valor_ponderado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.valor_ponderado := ROUND((COALESCE(NEW.valor_estimado, 0) * COALESCE(NEW.probabilidad, 50) / 100.0)::numeric, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_calc_valor_ponderado ON leads;
CREATE TRIGGER leads_calc_valor_ponderado
  BEFORE INSERT OR UPDATE OF valor_estimado, probabilidad ON leads
  FOR EACH ROW EXECUTE FUNCTION calc_valor_ponderado();
