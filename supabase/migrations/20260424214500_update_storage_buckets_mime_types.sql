DO $$
BEGIN
  -- Update allowed_mime_types for task-attachments bucket to include .eml formats
  UPDATE storage.buckets
  SET allowed_mime_types = array_append(allowed_mime_types, 'message/rfc822')
  WHERE id = 'task-attachments' 
    AND allowed_mime_types IS NOT NULL 
    AND NOT ('message/rfc822' = ANY(allowed_mime_types));
    
  UPDATE storage.buckets
  SET allowed_mime_types = array_append(allowed_mime_types, 'application/octet-stream')
  WHERE id = 'task-attachments' 
    AND allowed_mime_types IS NOT NULL 
    AND NOT ('application/octet-stream' = ANY(allowed_mime_types));
    
  UPDATE storage.buckets
  SET allowed_mime_types = array_append(allowed_mime_types, 'text/plain')
  WHERE id = 'task-attachments' 
    AND allowed_mime_types IS NOT NULL 
    AND NOT ('text/plain' = ANY(allowed_mime_types));
END $$;
