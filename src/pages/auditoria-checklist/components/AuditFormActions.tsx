import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AuditFormValues } from '../schema'

export function AuditFormActions() {
  const { control } = useFormContext<AuditFormValues>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'actions',
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Checklist de Ações</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              title: '',
              weight: 1,
              order_index: fields.length,
              evidence_required: false,
              comments_required: false,
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Item
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed">
            Nenhum item adicionado ao checklist.
          </p>
        )}
        {fields.map((field, index) => (
          <Card key={field.id} className="relative overflow-hidden bg-secondary/10">
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 text-muted-foreground hover:text-destructive z-10"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <FormField
                control={control}
                name={`actions.${index}.title`}
                render={({ field: f }) => (
                  <FormItem className="sm:col-span-2 mr-6">
                    <FormLabel>Título da Ação</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Descreva o item a ser verificado..."
                        className="bg-background"
                        {...f}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`actions.${index}.weight`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Peso (Multiplicador)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" className="bg-background" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`actions.${index}.order_index`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Ordem de Exibição</FormLabel>
                    <FormControl>
                      <Input type="number" className="bg-background" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`actions.${index}.evidence_required`}
                render={({ field: f }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Exigir Evidência</FormLabel>
                      <p className="text-xs text-muted-foreground">Obrigatório enviar foto</p>
                    </div>
                    <FormControl>
                      <Switch checked={f.value} onCheckedChange={f.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`actions.${index}.comments_required`}
                render={({ field: f }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Exigir Observações</FormLabel>
                      <p className="text-xs text-muted-foreground">Obrigatório digitar texto</p>
                    </div>
                    <FormControl>
                      <Switch checked={f.value} onCheckedChange={f.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}
