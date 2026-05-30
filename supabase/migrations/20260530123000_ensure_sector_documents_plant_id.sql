DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sector_documents' 
    AND column_name = 'plant_id'
  ) THEN
    ALTER TABLE public.sector_documents ADD COLUMN plant_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
    AND table_name = 'sector_documents'
    AND constraint_name = 'sector_documents_plant_id_fkey'
  ) THEN
    ALTER TABLE public.sector_documents 
    ADD CONSTRAINT sector_documents_plant_id_fkey 
    FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE;
  END IF;
END $$;
