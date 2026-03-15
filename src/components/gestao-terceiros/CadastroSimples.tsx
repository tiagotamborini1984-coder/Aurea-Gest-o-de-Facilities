import { useState } from 'react'
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
import { useCrud } from '@/hooks/use-crud'
import { Loader2, Trash2 } from 'lucide-react'

export function CadastroSimples({
  type,
  title,
  fields,
}: {
  type: string
  title: string
  fields: any[]
}) {
  const { data, loading, add, remove } = useCrud<any>(type)
  const [form, setForm] = useState<any>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await add(form)
    setForm({})
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="flex gap-4 items-end bg-white p-4 rounded-xl shadow-sm border"
      >
        {fields.map((f) => (
          <div key={f.name} className="flex-1 space-y-1">
            <label className="text-sm font-medium text-muted-foreground">{f.label}</label>
            <Input
              value={form[f.name] || ''}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              required
            />
          </div>
        ))}
        <Button type="submit" className="mb-0.5">
          Adicionar
        </Button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {fields.map((f) => (
                <TableHead key={f.name}>{f.label}</TableHead>
              ))}
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="text-center py-6">
                  <Loader2 className="animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={fields.length + 1}
                  className="text-center py-6 text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  {fields.map((f) => (
                    <TableCell key={f.name}>{item[f.name]}</TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => remove(item.id)}
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
