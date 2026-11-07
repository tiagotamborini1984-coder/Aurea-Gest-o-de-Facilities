-- Backup interno ANTES de qualquer mudança em produção (regra permanente do projeto).
-- Snapshot dos registros vinculados à usuária Gleiccy (26f2fd15-fa83-43d2-93d4-6122be3ed81f)
-- que seriam afetados pela exclusão (SET NULL nas FKs, credencial removida).
CREATE TABLE IF NOT EXISTS public.backup_delete_user_gleiccy_20261107 AS
SELECT 'auth_users' AS origem, to_jsonb(u.*) AS registro, now() AS backup_at
FROM auth.users u
WHERE u.id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'public_profiles', to_jsonb(p.*), now()
FROM public.profiles p
WHERE p.id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'tasks_requester', to_jsonb(t.*), now()
FROM public.tasks t
WHERE t.requester_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'tasks_assignee', to_jsonb(t.*), now()
FROM public.tasks t
WHERE t.assignee_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'tasks_previous_assignee', to_jsonb(t.*), now()
FROM public.tasks t
WHERE t.previous_assignee_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'tasks_approved_by', to_jsonb(t.*), now()
FROM public.tasks t
WHERE t.approved_by = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'task_timeline', to_jsonb(tt.*), now()
FROM public.task_timeline tt
WHERE tt.user_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'audit_assignments', to_jsonb(aa.*), now()
FROM public.audit_assignments aa
WHERE aa.assignee_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'user_plants', to_jsonb(up.*), now()
FROM public.user_plants up
WHERE up.user_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'requesters', to_jsonb(r.*), now()
FROM public.requesters r
WHERE r.user_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid
UNION ALL
SELECT 'audit_logs', to_jsonb(al.*), now()
FROM public.audit_logs al
WHERE al.user_id = '26f2fd15-fa83-43d2-93d4-6122be3ed81f'::uuid;
