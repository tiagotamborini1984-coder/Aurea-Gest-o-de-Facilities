import * as z from 'zod'

export const auditSchema = z.object({
  title: z.string().min(1, 'Obrigatório'),
  type: z.string().min(1, 'Obrigatório'),
  frequency: z.string().min(1, 'Obrigatório'),
  start_date: z.string().min(1, 'Obrigatório'),
  advance_notice_days: z.coerce.number().min(0).default(0),
  status: z.string().default('Ativo'),
  scoring_settings: z.any().optional(),
  actions: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1, 'Obrigatório'),
      evidence_required: z.boolean().default(false),
      comments_required: z.boolean().default(false),
      weight: z.coerce.number().min(1).default(1),
      order_index: z.coerce.number().default(0),
    }),
  ),
  assignments: z.array(
    z.object({
      plant_id: z.string().min(1, 'Obrigatório'),
      assignee_id: z.string().min(1, 'Obrigatório'),
    }),
  ),
})

export type AuditFormValues = z.infer<typeof auditSchema>
