import { useState, useEffect } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AuditFormValues } from '../schema'

export function AuditFormAssignments() {
  const { profile, selectedMasterClient } = useAppStore()
  const { plants } = useMasterData()
  const { control } = useFormContext<AuditFormValues>()
  const [profiles, setProfiles] = useState<any[]>([])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assignments',
  })

  useEffect(() => {
    const clientId = profile?.role === 'Master' ? selectedMasterClient : profile?.client_id
    if (!clientId || clientId === 'all') return

    supabase
      .from('profiles')
      .select('id, name, email')
      .eq('client_id', clientId)
      .then(({ data }) => {
        if (data) setProfiles(data)
      })
  }, [profile, selectedMasterClient])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Distribuição por Planta e Responsáveis</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ plant_id: '', assignee_id: '' })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            Nenhuma atribuição configurada. Clique em Adicionar para definir os responsáveis pelas
            plantas.
          </p>
        )}
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-secondary/20 p-4 rounded-lg border"
          >
            <FormField
              control={control}
              name={`assignments.${index}.plant_id`}
              render={({ field: f }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel>Planta</FormLabel>
                  <Select onValueChange={f.onChange} value={f.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione a planta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`assignments.${index}.assignee_id`}
              render={({ field: f }) => (
                <FormItem className="flex-1 w-full">
                  <FormLabel>Responsável</FormLabel>
                  <Select onValueChange={f.onChange} value={f.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione o usuário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive sm:mb-0.5"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
