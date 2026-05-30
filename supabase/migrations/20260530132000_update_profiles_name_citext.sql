-- Enable citext extension for case-insensitive operations at the database level
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- Alter name column to citext for case-insensitive sorting natively in Supabase queries
ALTER TABLE public.profiles ALTER COLUMN name TYPE public.citext;
