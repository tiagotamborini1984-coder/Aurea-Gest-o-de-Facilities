DO $DO_BLOCK$
BEGIN
  -- Add cost_center_id to budget_entries if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_entries' AND column_name = 'cost_center_id') THEN
    ALTER TABLE public.budget_entries ADD COLUMN cost_center_id UUID REFERENCES public.budget_cost_centers(id) ON DELETE CASCADE;
  END IF;
  
  -- Backfill from budget_accounts if budget_accounts still has cost_center_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_accounts' AND column_name = 'cost_center_id') THEN
    UPDATE public.budget_entries be
    SET cost_center_id = ba.cost_center_id
    FROM public.budget_accounts ba
    WHERE be.account_id = ba.id AND be.cost_center_id IS NULL;
  END IF;
END $DO_BLOCK$;

-- Cleanup orphan entries where we couldn't resolve a cost_center_id
DELETE FROM public.budget_entries WHERE cost_center_id IS NULL;

-- Make cost_center_id NOT NULL on budget_entries
ALTER TABLE public.budget_entries ALTER COLUMN cost_center_id SET NOT NULL;

-- Update unique constraint on budget_entries to include cost_center_id
ALTER TABLE public.budget_entries DROP CONSTRAINT IF EXISTS budget_entries_account_id_reference_month_key;
ALTER TABLE public.budget_entries DROP CONSTRAINT IF EXISTS budget_entries_client_id_cost_center_id_account_id_ref_key;
ALTER TABLE public.budget_entries ADD CONSTRAINT budget_entries_client_id_cost_center_id_account_id_ref_key UNIQUE (client_id, cost_center_id, account_id, reference_month);

-- Drop cost_center_id from budget_accounts to make them global per client
ALTER TABLE public.budget_accounts DROP CONSTRAINT IF EXISTS budget_accounts_cost_center_id_fkey;
ALTER TABLE public.budget_accounts DROP COLUMN IF EXISTS cost_center_id;
