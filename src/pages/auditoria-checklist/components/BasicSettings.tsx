import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type AuditConfigForm } from '../schema'

export function BasicSettings() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<AuditConfigForm>()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 border rounded-lg bg-white shadow-sm">
      <div className="space-y-2">
        <Label>Título da Auditoria</Label>
        <Input {...register('title')} placeholder="Ex: Auditoria de Segurança 5S" />
        {errors.title && <span className="text-sm text-red-500">{errors.title.message}</span>}
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={watch('type')} onValueChange={(v) => setValue('type', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Geral">Geral</SelectItem>
            <SelectItem value="Segurança">Segurança</SelectItem>
            <SelectItem value="Qualidade">Qualidade</SelectItem>
            <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Frequência</Label>
        <Select value={watch('frequency')} onValueChange={(v) => setValue('frequency', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Única">Única</SelectItem>
            <SelectItem value="Diária">Diária</SelectItem>
            <SelectItem value="Semanal">Semanal</SelectItem>
            <SelectItem value="Quinzenal">Quinzenal</SelectItem>
            <SelectItem value="Mensal">Mensal</SelectItem>
            <SelectItem value="Semestral">Semestral</SelectItem>
            <SelectItem value="Anual">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Data de Início</Label>
        <Input type="date" {...register('start_date')} />
      </div>

      <div className="space-y-2">
        <Label>Antecedência de Geração (dias)</Label>
        <Input type="number" min="0" {...register('advance_notice_days')} />
        <p className="text-xs text-muted-foreground">
          Quantos dias antes a tarefa de auditoria recorrente será gerada.
        </p>
      </div>

      <div className="space-y-2">
        <Label>SLA do Checklist (dias)</Label>
        <Input
          type="number"
          min="1"
          placeholder="Opcional (herda frequência)"
          {...register('sla_days')}
        />
        <p className="text-xs text-muted-foreground">
          Prazo limite para realização do checklist (vazio = segue frequência).
        </p>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-primary">SLA da Não Conformidade (dias) *</Label>
        <Input
          type="number"
          min="1"
          {...register('nc_sla_days')}
          className="border-primary/50 focus-visible:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Prazo em dias para resolução das NCs geradas (vencimento às 23:59:59 BRT).
        </p>
      </div>
    </div>
  )
}
