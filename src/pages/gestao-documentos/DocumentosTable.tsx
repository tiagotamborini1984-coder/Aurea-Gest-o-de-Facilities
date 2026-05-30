import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, Trash2, Download } from 'lucide-react'
import { differenceInCalendarDays, parseISO, startOfDay, format } from 'date-fns'

export function DocumentosTable({ documents, onEdit, onDelete }: any) {
  const today = startOfDay(new Date())

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Documento</TableHead>
            <TableHead className="font-semibold">Data de Vencimento</TableHead>
            <TableHead className="font-semibold">Periodicidade</TableHead>
            <TableHead className="font-semibold">Status SLA</TableHead>
            <TableHead className="w-[140px] font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhum documento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc: any) => {
              const expDate = startOfDay(parseISO(doc.expiration_date))
              const diffDays = differenceInCalendarDays(expDate, today)

              let color = 'bg-green-100 text-green-800 border-green-200'
              if (diffDays < 0) {
                color = 'bg-red-100 text-red-800 border-red-200'
              } else if (diffDays <= (doc.alert_lead_days || 0)) {
                color = 'bg-amber-100 text-amber-800 border-amber-200'
              }

              return (
                <TableRow key={doc.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="font-medium text-foreground">{doc.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{doc.document_type}</div>
                  </TableCell>
                  <TableCell className="text-sm">{format(expDate, 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-sm">{doc.frequency || 'N/A'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ${color}`}
                    >
                      {diffDays}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => window.open(doc.file_url, '_blank')}
                        disabled={!doc.file_url}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md disabled:opacity-50 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(doc)}
                        className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(doc.id)}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
