ALTER TABLE public.ppe_loans ADD COLUMN IF NOT EXISTS person_name TEXT;

CREATE OR REPLACE FUNCTION public.sync_ppe_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT current_stock INTO v_current_stock FROM public.ppe_items WHERE id = NEW.ppe_id;
    IF v_current_stock IS NULL OR v_current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para este EPI';
    END IF;
    UPDATE public.ppe_items
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.ppe_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Emprestado' AND NEW.status = 'Devolvido' THEN
    UPDATE public.ppe_items
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.ppe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'Emprestado' THEN
      UPDATE public.ppe_items
      SET current_stock = current_stock + OLD.quantity
      WHERE id = OLD.ppe_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_ppe_loan_insert ON public.ppe_loans;
CREATE TRIGGER on_ppe_loan_insert
  AFTER INSERT ON public.ppe_loans
  FOR EACH ROW EXECUTE FUNCTION public.sync_ppe_stock();

DROP TRIGGER IF EXISTS on_ppe_loan_return ON public.ppe_loans;
CREATE TRIGGER on_ppe_loan_return
  AFTER UPDATE OF status ON public.ppe_loans
  FOR EACH ROW EXECUTE FUNCTION public.sync_ppe_stock();

DROP TRIGGER IF EXISTS on_ppe_loan_delete ON public.ppe_loans;
CREATE TRIGGER on_ppe_loan_delete
  AFTER DELETE ON public.ppe_loans
  FOR EACH ROW EXECUTE FUNCTION public.sync_ppe_stock();

ALTER TABLE public.ppe_loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_ppe_loans" ON public.ppe_loans;
CREATE POLICY "tenant_isolation_ppe_loans" ON public.ppe_loans
  FOR ALL TO authenticated USING (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  ) WITH CHECK (
    public.get_user_role() = 'Master' OR client_id = public.get_user_client_id()
  );

DROP POLICY IF EXISTS "admin_delete_ppe_loans" ON public.ppe_loans;
CREATE POLICY "admin_delete_ppe_loans" ON public.ppe_loans
  FOR DELETE TO authenticated USING (
    public.get_user_role() IN ('Master', 'Administrador')
  );
