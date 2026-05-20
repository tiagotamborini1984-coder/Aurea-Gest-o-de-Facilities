CREATE OR REPLACE FUNCTION public.create_package(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_client_id UUID;
  v_plant_id UUID;
  v_package_type_id UUID;
  v_arrival_date DATE;
  v_sender TEXT;
  v_recipient_name TEXT;
  v_recipient_email TEXT;
  v_tracking_code TEXT;
  v_observations TEXT;
  v_status TEXT;
  v_attachment_url TEXT;

  v_year TEXT;
  v_seq INT;
  v_protocol TEXT;
  v_package_id UUID;
BEGIN
  v_client_id := NULLIF(p_payload->>'client_id', '')::UUID;
  v_plant_id := NULLIF(p_payload->>'plant_id', '')::UUID;
  v_package_type_id := NULLIF(p_payload->>'package_type_id', '')::UUID;
  v_arrival_date := NULLIF(p_payload->>'arrival_date', '')::DATE;
  v_sender := p_payload->>'sender';
  v_recipient_name := p_payload->>'recipient_name';
  v_recipient_email := p_payload->>'recipient_email';
  v_tracking_code := p_payload->>'tracking_code';
  v_observations := p_payload->>'observations';
  v_status := p_payload->>'status';
  v_attachment_url := p_payload->>'attachment_url';

  IF v_arrival_date IS NULL THEN
    v_year := to_char(CURRENT_DATE, 'YYYY');
  ELSE
    v_year := to_char(v_arrival_date, 'YYYY');
  END IF;

  -- Use an advisory xact lock based on client_id hash to prevent concurrent insertions generating the same sequence
  PERFORM pg_advisory_xact_lock(hashtext(v_client_id::text));
  
  -- Calculate the next sequence for the given year
  SELECT COALESCE(
    MAX(
      SUBSTRING(protocol_number FROM 'ENC-\d{4}-([0-9]+)')::INT
    ), 0
  ) + 1 INTO v_seq
  FROM public.packages
  WHERE client_id = v_client_id AND protocol_number LIKE 'ENC-' || v_year || '-%';

  v_protocol := 'ENC-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  INSERT INTO public.packages (
    client_id, plant_id, package_type_id, protocol_number, arrival_date,
    sender, recipient_name, recipient_email, tracking_code, observations,
    status, attachment_url
  ) VALUES (
    v_client_id, v_plant_id, v_package_type_id, v_protocol, COALESCE(v_arrival_date, CURRENT_DATE),
    v_sender, v_recipient_name, v_recipient_email, v_tracking_code, v_observations,
    COALESCE(v_status, 'Aguardando Retirada'), v_attachment_url
  ) RETURNING id INTO v_package_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'id', v_package_id,
    'protocol_number', v_protocol
  );
END;
$function$;
