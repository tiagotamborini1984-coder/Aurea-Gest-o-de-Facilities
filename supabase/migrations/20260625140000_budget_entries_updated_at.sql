-- 1. Add updated_at column
ALTER TABLE public.budget_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 2. Set default for existing rows if null
UPDATE public.budget_entries SET updated_at = created_at WHERE updated_at IS NULL;

-- 3. Set default for new rows
ALTER TABLE public.budget_entries ALTER COLUMN updated_at SET DEFAULT NOW();

-- 4. Create trigger function
CREATE OR REPLACE FUNCTION public.update_budget_entries_updated_at_func()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
DROP TRIGGER IF EXISTS update_budget_entries_updated_at ON public.budget_entries;
CREATE TRIGGER update_budget_entries_updated_at
  BEFORE UPDATE ON public.budget_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_entries_updated_at_func();
