import { useFormContext, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { type AuditConfigForm } from '../schema'

export function AssignmentSettings({ plants, profiles }: { plants: any[]; profiles: any[] }) {
  const { control, setValue, watch } = useFormContext<AuditConfigForm>()
  const { fields, append, remove } = useFieldArray({ control, name: 'assignments' })

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Atribuições e Locais</h3>
          <p className="text-sm text-muted-foreground">
            Defina em quais plantas a auditoria será aplicada e quem será o responsável.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ plant_id: '', assignee_id: '' })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Atribuição
        </Button>
      </div>

      <div className="space-y-3 mt-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-md border border-slate-100"
          >
            <div className="col-span-5">
              <Select
                value={watch(`assignments.${index}.plant_id`)}
                onValueChange={(v) => setValue(`assignments.${index}.plant_id`, v)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione a Planta..." />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-6">
              <Select
                value={watch(`assignments.${index}.assignee_id`)}
                onValueChange={(v) => setValue(`assignments.${index}.assignee_id`, v)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Responsável pela Execução..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {fields.length === 0 && (
          <div className="text-center p-4 border border-dashed rounded-md text-sm text-slate-500">
            Nenhuma atribuição configurada. A auditoria não será gerada automaticamente até que seja
            atribuída.
          </div>
        )}
      </div>
    </div>
  )
}
