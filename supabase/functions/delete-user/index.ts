import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = getSupabaseClient()

    let body: { userId?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { userId } = body
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Quem está chamando precisa estar autenticado e ter perfil autorizado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', caller.id)
      .single()

    if (callerProfileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!['Master', 'Administrador'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions to delete users' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Alvo: não pode se autoexcluir nem excluir outro Master (a menos que seja Master)
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('role, client_id, name, email')
      .eq('id', userId)
      .single()

    if (targetProfileError || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Target profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (caller.id === userId) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (targetProfile.role === 'Master' && callerProfile.role !== 'Master') {
      return new Response(JSON.stringify({ error: 'Insufficient permissions to delete users' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Administrador só exclui usuários do próprio cliente
    if (
      callerProfile.role === 'Administrador' &&
      targetProfile.client_id !== callerProfile.client_id
    ) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions to delete users' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Remove a credencial de auth. As FKs que referenciam profiles/auth.users estão em
    // ON DELETE SET NULL (migrações 20261107150000 e 20261107162600), então vínculos
    // históricos não bloqueiam a exclusão nem apagam registros — preservam o histórico
    // apenas sem o autor/responsável.
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      const rawMessage = error.message || ''
      const isLinkedRecordsError =
        rawMessage.includes('Database error deleting user') ||
        rawMessage.includes('foreign key') ||
        rawMessage.includes('violates foreign key')

      if (!isLinkedRecordsError) throw error

      // Plano B: o GoTrue falhou alegando vínculos, mas a regra do produto é manter os
      // registros e apenas anulá-los. Desvincula manualmente as referências em public.*
      // (usando o client com service role, que ignora RLS), e depois remove a credencial.
      console.warn('deleteUser blocked by FK, falling back to manual unlink:', rawMessage)

      const unlinkTables: Array<{ table: string; columns: string[] }> = [
        { table: 'tasks', columns: ['requester_id', 'assignee_id', 'previous_assignee_id', 'approved_by'] },
        { table: 'task_timeline', columns: ['user_id'] },
        { table: 'audit_assignments', columns: ['assignee_id'] },
        { table: 'audit_logs', columns: ['user_id'] },
        { table: 'user_plants', columns: ['user_id'] },
        { table: 'requesters', columns: ['user_id'] },
        { table: 'accidents', columns: ['created_by'] },
        { table: 'maintenance_tickets', columns: ['requester_id', 'assignee_id'] },
        { table: 'maintenance_ticket_logs', columns: ['user_id'] },
        { table: 'facilita_documents', columns: ['created_by'] },
        { table: 'facilita_conversations', columns: ['user_id'] },
        { table: 'audit_ai_reports', columns: ['created_by'] },
        { table: 'audit_executions', columns: ['assignee_id'] },
        { table: 'audit_execution_answers', columns: ['corrective_assignee_id'] },
        { table: 'horas_extras_api_keys', columns: ['created_by'] },
        { table: 'horas_extras_solicitacoes', columns: ['created_by', 'approved_by'] },
        { table: 'import_logs', columns: ['created_by'] },
        { table: 'inventory_requests', columns: ['processed_by', 'requester_id'] },
        { table: 'vacations', columns: ['approved_by'] },
      ]

      for (const { table, columns } of unlinkTables) {
        for (const column of columns) {
          const { error: unlinkError } = await supabase
            .from(table)
            .update({ [column]: null })
            .eq(column, userId)
          if (unlinkError) {
            console.error(`Failed to unlink ${table}.${column}:`, unlinkError.message)
          }
        }
      }

      // Com as referências anuladas, tenta novamente remover a credencial de auth.
      const { error: retryError } = await supabase.auth.admin.deleteUser(userId)
      if (retryError) throw retryError
    }

    // Garantia extra: se o cascade do auth não removeu, remove o perfil direto
    const { error: cleanupError } = await supabase.from('profiles').delete().eq('id', userId)
    if (cleanupError) {
      console.error('Failed to clean up orphaned profile:', cleanupError.message)
    }

    return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
