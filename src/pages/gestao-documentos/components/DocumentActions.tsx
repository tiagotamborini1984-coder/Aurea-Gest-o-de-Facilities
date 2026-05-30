import { MoreVertical, Pencil, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface DocumentActionsProps {
  doc: any
  onEdit: () => void
  onDelete: () => void
}

export function DocumentActions({ doc, onEdit, onDelete }: DocumentActionsProps) {
  const handleDownload = () => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank')
    } else if (doc.file_urls && Array.isArray(doc.file_urls) && doc.file_urls.length > 0) {
      window.open(doc.file_urls[0], '_blank')
    } else {
      toast.error('Nenhum arquivo anexado a este documento.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Baixar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
