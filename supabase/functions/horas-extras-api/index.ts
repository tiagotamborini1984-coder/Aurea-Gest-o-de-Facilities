import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient, jsonBody, errorBody } from '../_shared/supabase.ts'

/**
 * Calcula o hash SHA-256 de uma chave em formato hexadecimal.
 */
async function hashApiKey(key: string): Promise<string> {
  const enc = new TextEncoder().encode(key)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Extrai a chave de API dos cabeçalhos:
 * 1. X-API-Key: <key>
 * 2. Authorization: Bearer <key>
 * 3. query param: ?api_key=<key> (útil para testes rápidos)
 */
function extractApiKey(req: Request): string | null {
  const xApiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key')
  if (xApiKey && xApiKey.trim()) return xApiKey.trim()

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (match && match[1].trim()) return match[1].trim()
  }

  const url = new URL(req.url)
  const qKey = url.searchParams.get('api_key') || url.searchParams.get('key')
  if (qKey && qKey.trim()) return qKey.trim()

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Utilize GET para consultar solicitações.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const rawApiKey = extractApiKey(req)
  if (!rawApiKey) {
    return new Response(
      JSON.stringify({
        error:
          'Chave de API ausente. Forneça o header "X-API-Key: <chave>" ou "Authorization: Bearer <chave>".',
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const keyHash = await hashApiKey(rawApiKey)
  const supabase = getSupabaseClient()

  // Buscar a chave de API ativa
  const { data: keyData, error: keyError } = await supabase
    .from('horas_extras_api_keys')
    .select('id, client_id, company_id, name, is_active, revoked_at')
    .eq('key_hash', keyHash)
    .single()

  if (keyError || !keyData || !keyData.is_active || keyData.revoked_at) {
    return new Response(
      JSON.stringify({
        error: 'Chave de API inválida, inativa ou revogada.',
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // Atualiza last_used_at de forma assíncrona (não bloqueia a resposta)
  supabase
    .from('horas_extras_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id)
    .then()

  // Buscar informações da empresa contratada (inclui o e-mail cadastrado — aditivo)
  const { data: companyData } = await supabase
    .from('companies')
    .select('id, name, service_type, email')
    .eq('id', keyData.company_id)
    .single()

  // Parâmetros opcionais de busca: status, data_inicio, data_fim, limite
  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status')
  const dateFromParam = url.searchParams.get('data_inicio') || url.searchParams.get('date_from')
  const dateToParam = url.searchParams.get('data_fim') || url.searchParams.get('date_to')
  const limitParam = parseInt(
    url.searchParams.get('limite') || url.searchParams.get('limit') || '100',
    10,
  )
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100

  // Consulta solicitações de HE estritamente limitadas à empresa da chave
  let query = supabase
    .from('horas_extras_solicitacoes')
    .select(`
      id,
      date,
      hours,
      reason,
      status,
      created_at,
      updated_at,
      approved_at,
      manager_observation,
      created_by,
      created_by_name,
      approved_by,
      approved_by_name,
      employee_id,
      employee_name,
      company_id,
      company_name,
      plant_id,
      cost_center_id,
      cost_center_text,
      budget_cost_centers (
        id,
        name,
        code
      ),
      plants (
        id,
        name,
        code,
        city
      )
    `)
    .eq('company_id', keyData.company_id)
    .order('date', { ascending: false })
    .limit(limit)

  if (statusParam && ['pendente', 'aprovada', 'recusada'].includes(statusParam.toLowerCase())) {
    query = query.eq('status', statusParam.toLowerCase())
  }

  if (dateFromParam) {
    query = query.gte('date', dateFromParam)
  }

  if (dateToParam) {
    query = query.lte('date', dateToParam)
  }

  const { data: solicitacoes, error: solError } = await query

  if (solError) {
    console.error('Erro ao consultar solicitações de HE:', solError)
    return new Response(
      JSON.stringify({ error: 'Erro interno ao consultar solicitações de horas extras.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // Coleta IDs de perfis (solicitantes e aprovadores) para buscar e-mails e garantir nomes mais atualizados
  const profileIds = new Set<string>()
  for (const item of (solicitacoes || []) as any[]) {
    if (item.created_by) profileIds.add(item.created_by)
    if (item.approved_by) profileIds.add(item.approved_by)
  }

  const profilesMap = new Map<string, { id: string; name: string | null; email: string | null }>()
  if (profileIds.size > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', Array.from(profileIds))

    if (profilesData) {
      for (const p of profilesData) {
        profilesMap.set(p.id, { id: p.id, name: p.name || null, email: p.email || null })
      }
    }
  }

  // Formatando resposta em JSON limpo, estruturado e 100% retrocompatível (aditivo)
  const formatted = (solicitacoes || []).map((item: any) => {
    const creatorProfile = item.created_by ? profilesMap.get(item.created_by) : null
    const approverProfile = item.approved_by ? profilesMap.get(item.approved_by) : null

    // Resolução resiliente: prioriza profile atual, com fallback para o snapshot salvo na solicitação
    const requisitanteNome = creatorProfile?.name || item.created_by_name || null
    const requisitanteEmail = creatorProfile?.email || null

    const aprovadorNome = approverProfile?.name || item.approved_by_name || null
    const aprovadorEmail = approverProfile?.email || null

    return {
      id: item.id,
      colaborador: {
        id: item.employee_id,
        nome: item.employee_name,
      },
      empresa: {
        id: item.company_id,
        nome: item.company_name,
      },
      planta: item.plants
        ? {
            id: item.plants.id,
            nome: item.plants.name,
            codigo: item.plants.code,
            cidade: item.plants.city,
          }
        : { id: item.plant_id },
      centro_custo_pagador: item.cost_center_text
        ? { texto: item.cost_center_text }
        : item.budget_cost_centers
          ? {
              id: item.budget_cost_centers.id,
              nome: item.budget_cost_centers.name,
              codigo: item.budget_cost_centers.code,
            }
          : item.cost_center_id
            ? { id: item.cost_center_id }
            : null,
      data: item.date,
      horas: Number(item.hours),
      motivo: item.reason,
      status: item.status,
      solicitado_em: item.created_at,
      // Campo retrocompatível (mantém exatamente a string anterior para não quebrar integrações existentes)
      solicitado_por: requisitanteNome,
      // Objeto aditivo enriquecido com nome, e-mail e id do requisitante
      requisitante: {
        id: item.created_by || null,
        nome: requisitanteNome,
        email: requisitanteEmail,
      },
      aprovacao: {
        aprovado_em: item.approved_at,
        // Campo retrocompatível mantido
        aprovado_por: aprovadorNome,
        observacao_gestor: item.manager_observation,
        // Objeto aditivo enriquecido (quando houver aprovação/reprovação com aprovador identificado)
        aprovador:
          aprovadorNome || aprovadorEmail
            ? {
                id: item.approved_by || null,
                nome: aprovadorNome,
                email: aprovadorEmail,
              }
            : null,
      },
      atualizado_em: item.updated_at,
    }
  })

  const responseBody = {
    empresa: companyData || { id: keyData.company_id, email: null },
    chave_api: {
      nome: keyData.name,
    },
    total: formatted.length,
    solicitacoes: formatted,
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
