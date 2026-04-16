DO $$
BEGIN
  -- Resolve existing duplicates by appending a suffix
  WITH duplicates AS (
    SELECT id, client_id, code, ROW_NUMBER() OVER(PARTITION BY client_id, code ORDER BY created_at ASC) as rn
    FROM public.budget_accounts
    WHERE code IS NOT NULL AND code != ''
  )
  UPDATE public.budget_accounts
  SET code = code || '-' || duplicates.rn
  FROM duplicates
  WHERE public.budget_accounts.id = duplicates.id AND duplicates.rn > 1;

  -- Convert empty strings to NULL to avoid unique constraint issues on empty strings
  UPDATE public.budget_accounts
  SET code = NULL
  WHERE code = '';

  -- Add unique constraint
  ALTER TABLE public.budget_accounts DROP CONSTRAINT IF EXISTS budget_accounts_client_id_code_key;
  ALTER TABLE public.budget_accounts ADD CONSTRAINT budget_accounts_client_id_code_key UNIQUE (client_id, code);
END $$;
