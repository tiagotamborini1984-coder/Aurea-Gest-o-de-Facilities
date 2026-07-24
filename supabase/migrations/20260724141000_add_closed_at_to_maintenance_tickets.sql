ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance_attachments', 'maintenance_attachments', true)
ON CONFLICT (id) DO NOTHING;
