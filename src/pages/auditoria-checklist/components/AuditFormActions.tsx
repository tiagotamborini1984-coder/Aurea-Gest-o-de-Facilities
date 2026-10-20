import { useState, useEffect, useCallback } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Tag } from 'lucide-react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/AppContext'
import { AuditQuestionCategory, auditCategoryService } from '@/services/audit-categories'
import { AuditCategoryManagerDialog } from './AuditCategoryManagerDialog'
import type { AuditFormValues } from '../schema'

export function AuditFormActions() {
  const { control } = useFormContext<AuditFormValues>()
  const { profile, activeClient } = useAppStore()
  const effectiveClientId = activeClient?.id || profile?.client_id

  const [categories, setCategories] = useState<AuditQuestionCategory[]>([])
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  const loadCategories = useCallback(async () => {
    if (!effectiveClientId) return
    try {
      const data = await auditCategoryService.listCategories(effectiveClientId, true)
      setCategories(data)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    }
  }, [effectiveClientId])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'actions',
  })

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
        <div>
          <CardTitle>Checklist de Ações</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre as perguntas da auditoria e vincule a categorias livres.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCategoryModalOpen(true)}
            className="text-primary hover:text-primary"
          >
            <Tag className="mr-2 h-4 w-4" />
            Categorias
          </Button>
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
                category_id: null,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
        </div>
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
                name={`actions.${index}.category_id`}
                render={({ field: f }) => {
                  const selected = categories.find((c) => c.id === f.value)
                  return (
                    <FormItem className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-primary" /> Categoria da Pergunta
                        </FormLabel>
                        <button
                          type="button"
                          onClick={() => setCategoryModalOpen(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          + Gerenciar categorias
                        </button>
                      </div>
                      <Select
                        value={f.value || 'none'}
                        onValueChange={(val) => f.onChange(val === 'none' ? null : val)}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione uma categoria">
                              {selected ? (
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: selected.color || '#3b82f6' }}
                                  />
                                  <span>{selected.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  Sem categoria vinculada
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Sem categoria vinculada</span>
                          </SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cat.color || '#3b82f6' }}
                                />
                                <span>{cat.name}</span>
                                {!cat.is_active && (
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    (inativa)
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )
                }}
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

      <AuditCategoryManagerDialog
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        clientId={effectiveClientId}
        onCategoriesChanged={loadCategories}
      />
    </Card>
  )
}
