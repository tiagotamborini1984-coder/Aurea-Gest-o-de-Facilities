import { supabase } from '@/lib/supabase/client'

export type OcsAcao = {
  id: string
  ocs_id: string
  descricao: string
  responsavel_id: string | null
  prazo: string | null
  status: string
  task_id: string | null
}

/**
 * Cria a ação da OCS e, em seguida, gera automaticamente a Tarefa vinculada do
 * tipo "Observação de Segurança" (tipo criado LAZY por client_id — decisão
 * registrada na v0.0.1898). O task_number é gerado por trigger no INSERT —
 * nunca enviar no payload.
 */
export async function criarAcaoComTarefa(params: {
  ocs_id: string
  client_id: string
  plant_id: string | null
  number_label: string | null
  titulo: string
  descricao: string
  responsavel_id: string
  prazo: string | null
  requester_id: string
}): Promise<{ acaoId: string; taskId: string }> {
  const { data: acao, error: acaoError } = await supabase
    .from('ocs_acoes')
    .insert({
      ocs_id: params.ocs_id,
      client_id: params.client_id,
      descricao: params.descricao,
      responsavel_id: params.responsavel_id,
      prazo: params.prazo || null,
      status: 'Pendente',
    })
    .select('id')
    .single()
  if (acaoError) throw new Error(`Erro ao criar a ação: ${acaoError.message}`)

  const taskTypeId = await ensureOcsTaskType(params.client_id)
  const statusId = await getInitialTaskStatus(params.client_id)
  if (!taskTypeId || !statusId) {
    throw new Error(
      'Ação criada, mas não foi possível localizar o tipo/status de chamado desta empresa para gerar a tarefa.',
    )
  }

  const taskPayload: Record<string, any> = {
    client_id: params.client_id,
    plant_id: params.plant_id as any,
    type_id: taskTypeId,
    status_id: statusId,
    title: `OCS ${params.number_label || ''} - ${params.titulo}`.replace(/\s*-\s*$/, '').trim(),
    description: params.descricao,
    requester_id: params.requester_id,
    assignee_id: params.responsavel_id,
    participants_ids: [],
    due_date: params.prazo || null,
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert(taskPayload)
    .select('id')
    .single()

  const taskId = task?.id as string | undefined
  if (taskError || !taskId) {
    // A ação fica registrada mesmo se a tarefa falhar — o usuário pode tentar
    // vincular novamente mais tarde; não perdemos o registro da ação.
    throw new Error(
      `Ação criada, mas a tarefa não pôde ser gerada: ${taskError?.message || 'resposta vazia'}`,
    )
  }

  const { error: linkError } = await supabase
    .from('ocs_acoes')
    .update({ task_id: taskId })
    .eq('id', acao.id)
  if (linkError) throw new Error(`Erro ao vincular a tarefa à ação: ${linkError.message}`)

  return { acaoId: acao.id, taskId }
}

/**
 * Conclui a ação da OCS quando a tarefa vinculada é APROVADA no
 * TaskDetailsSheet. Retorna o id da ação atualizada (ou null).
 */
export async function concluirAcaoDaTarefa(taskId: string): Promise<string | null> {
  const { data: acoes, error } = await supabase
    .from('ocs_acoes')
    .update({ status: 'Concluída' })
    .eq('task_id', taskId)
    .select('id')
  if (error) throw error
  return acoes?.[0]?.id || null
}
