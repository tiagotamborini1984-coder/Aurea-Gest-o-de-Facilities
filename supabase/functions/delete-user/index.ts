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

    // Remove a credencial de auth (cascade apaga o perfil public.profiles).
    // As FKs que referenciam profiles foram convertidas para ON DELETE SET NULL
    // (migração 20261107150000), então vínculos históricos não bloqueiam mais a
    // exclusão — preservam o histórico apenas sem o autor/responsável.
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error

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
