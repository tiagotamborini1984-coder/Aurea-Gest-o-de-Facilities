import { z } from 'zod'

export const auditConfigSchema = z.object({
  title: z.string().min(1, 'Obrigatório'),
  type: z.string().min(1, 'Obrigatório'),
  frequency: z.string().min(1, 'Obrigatório'),
  start_date: z.string().min(1, 'Obrigatório'),
  advance_notice_days: z.coerce.number().min(0),
  scoring_settings: z.array(
    z.object({
      score: z.coerce.number(),
      description: z.string().min(1, 'Obrigatório'),
      trigger_task: z.boolean().default(false),
    }),
  ),
  actions: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1, 'Obrigatório'),
        weight: z.coerce.number().min(1),
        evidence_required: z.boolean().default(false),
        comments_required: z.boolean().default(false),
      }),
    )
    .min(1, 'Adicione pelo menos um item'),
  assignments: z.array(
    z.object({
      plant_id: z.string().min(1, 'Obrigatório'),
      assignee_id: z.string().min(1, 'Obrigatório'),
    }),
  ),
})

export type AuditConfigForm = z.infer<typeof auditConfigSchema>
