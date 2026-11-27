import { supabase } from '@/lib/supabase/client'

// Tipo de dado de um item respondido do checklist (estrutura livre em jsonb)
export type ChecklistAnswer = {
  categoria: string
  subcategoria: string
  resposta: 'Conforme' | 'Não Conforme' | 'Não Aplica'
  observacao: string
}

export type ActionForm = {
  descricao: string
  responsavel_id: string
  prazo: string
}

/**
 * Checklist do Cartão de Observação de Segurança (COC), por categoria.
 */
export const OCS_CATEGORIAS: { categoria: string; itens: string[] }[] = [
  {
    categoria: 'EPI',
    itens: [
      'Uso correto e completo dos EPIs exigidos para a atividade',
      'EPIs em bom estado de conservação e higiene',
    ],
  },
  {
    categoria: 'Procedimentos',
    itens: [
      'Executa a atividade conforme o procedimento / instrução de trabalho',
      'Respeita sinalizações, bloqueios e isolamentos da área',
    ],
  },
  {
    categoria: 'Ferramentas e Equipamentos',
    itens: [
      'Ferramentas e equipamentos adequados e em bom estado',
      'Uso correto de equipamentos com risco elétrico/mecânico',
    ],
  },
  {
    categoria: 'Comportamento',
    itens: [
      'Postura segura e atenção concentrada na tarefa',
      'Não improvisa métodos, ferramentas ou proteções',
      'Comunicação e coordenação adequadas com a equipe',
    ],
  },
  {
    categoria: 'Ordem e Limpeza',
    itens: [
      'Área de trabalho organizada durante e após a atividade',
      'Destinação correta de resíduos e materiais',
    ],
  },
]

export const OCS_TURNOS = ['1º Turno', '2º Turno', '3º Turno', 'Administrativo']

export const OCS_RESPOSTAS: Array<ChecklistAnswer['resposta']> = [
  'Conforme',
  'Não Conforme',
  'Não Aplica',
]

/**
 * Garante que existe um task_types "Observação de Segurança" para o cliente e
 * devolve (id, nome). Cria LAZY na primeira geração de ação — sem migração de
 * tipos em massa (decisão registrada do projeto).
 */
export async function ensureOcsTaskType(clientId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('task_types')
    .select('id, name')
    .eq('client_id', clientId)
    .ilike('name', 'Observação de Segurança')
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('task_types')
    .insert({ client_id: clientId, name: 'Observação de Segurança', sla_hours: 24 })
    .select('id')
    .single()

  if (error) {
    // Corrida benigna: outro usuário criou primeiro — busca de novo
    const { data: retry } = await supabase
      .from('task_types')
      .select('id')
      .eq('client_id', clientId)
      .ilike('name', 'Observação de Segurança')
      .maybeSingle()
    if (retry?.id) return retry.id
    throw new Error(`Falha ao criar o tipo "Observação de Segurança": ${error.message}`)
  }
  return created.id
}

/**
 * Pega o status inicial (primeiro da fila por created_at, fora de terminal) do
 * cliente — mesmo critério do Painel de Chamados.
 */
export async function getInitialTaskStatus(clientId: string): Promise<string | null> {
  const { data: statuses } = await supabase
    .from('task_statuses')
    .select('id, name, is_terminal')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  const open =
    (statuses || []).find((s: any) => !s.is_terminal && !/exclu|canc/i.test(s.name || '')) ||
    (statuses || [])[0]
  return open?.id || null
}
