import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export type FieldDef = {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'toggle'
  options?: { value: string; label: string }[]
  render?: (val: any, item: any) => React.ReactNode
}

export function CrudGeneric({ title, tableName, fields, fetchQuery, onAdd, onRemove }: any) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchQuery()
    setData(res || [])
    setLoading(false)
  }, [fetchQuery])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const success = await onAdd(form)
    if (success) {
      toast({ title: `${title} salvo com sucesso` })
      setForm({})
      load()
    } else {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (!error) {
      toast({ title: 'Removido com sucesso' })
      if (onRemove) onRemove(id)
      load()
    } else {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-brand-light">
        <h3 className="text-lg font-semibold mb-4 text-brand-graphite">Adicionar {title}</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          {fields.map((f: FieldDef) => (
            <div key={f.name} className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{f.label}</label>
              {(f.type === 'text' || f.type === 'number') && (
                <Input
                  type={f.type}
                  value={form[f.name] || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                    })
                  }
                  required
                />
              )}
              {f.type === 'select' && (
                <Select
                  value={form[f.name] || 'none'}
                  onValueChange={(v) => setForm({ ...form, [f.name]: v === 'none' ? '' : v })}
                  required
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground">
                      Nenhum / Não se aplica
                    </SelectItem>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {f.type === 'toggle' && (
                <div className="h-10 flex items-center">
                  <Switch
                    checked={form[f.name] || false}
                    onCheckedChange={(v) => setForm({ ...form, [f.name]: v })}
                  />
                </div>
              )}
            </div>
          ))}
          <Button type="submit" disabled={isSubmitting} className="mb-0.5 min-w-[120px]">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {fields.map((f: FieldDef) => (
                <TableHead key={f.name}>{f.label}</TableHead>
              ))}
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="text-center py-10">
                  <Loader2 className="animate-spin mx-auto text-brand-blue" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={fields.length + 1}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  {fields.map((f: FieldDef) => (
                    <TableCell key={f.name}>
                      {f.render
                        ? f.render(item[f.name], item)
                        : f.type === 'toggle'
                          ? item[f.name]
                            ? 'Sim'
                            : 'Não'
                          : item[f.name]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
