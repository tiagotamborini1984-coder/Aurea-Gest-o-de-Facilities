import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Download } from 'lucide-react'
import { Database } from '@/lib/supabase/types'
import { useCrud } from '@/hooks/use-crud'
import { format } from 'date-fns'

type SectorDocument = Database['public']['Tables']['sector_documents']['Row']

export function DocumentosTable({
  data,
  onEdit,
  onRefresh,
}: {
  data: SectorDocument[]
  onEdit: (doc: SectorDocument) => void
  onRefresh: () => void
}) {
  const { remove } = useCrud<SectorDocument>('sector_documents')

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este documento?')) {
      await remove(id)
      onRefresh()
    }
  }

  const getStatus = (doc: SectorDocument) => {
    if (!doc.expiration_date) {
      return { text: 'Sem data', className: 'bg-slate-100 text-slate-800' }
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expDate = new Date(doc.expiration_date + 'T00:00:00')
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        text: `Vencido há ${Math.abs(diffDays)} dias`,
        className: 'bg-red-100 text-red-800 border-red-200',
      }
    } else if (diffDays <= (doc.alert_lead_days || 0)) {
      return {
        text: `Vence em ${diffDays} dias`,
        className: 'bg-amber-100 text-amber-800 border-amber-200',
      }
    } else {
      return {
        text: `Em dia (${diffDays} dias)`,
        className: 'bg-green-100 text-green-800 border-green-200',
      }
    }
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status / SLA</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Nenhum documento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((doc) => {
              const status = getStatus(doc)
              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>
                    {doc.expiration_date
                      ? format(new Date(doc.expiration_date + 'T00:00:00'), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.text}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {doc.file_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onEdit(doc)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
