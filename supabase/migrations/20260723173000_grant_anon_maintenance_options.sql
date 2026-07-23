-- Grant anon execute on get_maintenance_public_options so the public form can fetch dropdowns
GRANT EXECUTE ON FUNCTION public.get_maintenance_public_options(text) TO anon;
