import { useMemo } from 'react'
import { FileText, Download } from 'lucide-react'
import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useCrud } from '@/hooks/use-crud'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export default function Documentos() {
  const { profile, plants } = useAppStore()
  const { add, remove, fetchAll } = useCrud<any>('sector_documents')

  const handleAdd = async (payload: any) => {
    return await add(payload)
  }

  const handleUpdate = async (id: string, payload: any) => {
    const { data, error } = await supabase
      .from('sector_documents')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      await fetchAll()
      return { success: true, data }
    }
    return { success: false, error }
  }

  const fields: FieldDef[] = useMemo(
    () => [
      {
        name: 'name',
        label: 'Nome do Documento',
        type: 'text',
        required: true,
      },
      {
        name: 'document_type',
        label: 'Tipo de Documento',
        type: 'select',
        options: [
          { value: 'PPRA', label: 'PPRA' },
          { value: 'PCMSO', label: 'PCMSO' },
          { value: 'LTCAT', label: 'LTCAT' },
          { value: 'AVCB', label: 'AVCB / CLCB' },
          { value: 'Alvará', label: 'Alvará de Funcionamento' },
          { value: 'Licença', label: 'Licença Ambiental' },
          { value: 'Outros', label: 'Outros' },
        ],
        required: true,
      },
      {
        name: 'expiration_date',
        label: 'Data de Vencimento',
        type: 'date',
        required: true,
      },
      {
        name: 'alert_lead_days',
        label: 'Aviso (Dias antes do Venc.)',
        type: 'number',
        required: true,
      },
      {
        name: 'file_urls',
        label: 'Anexos (PDF, Imagens, etc.)',
        type: 'file-multi',
        required: false,
      },
    ],
    [],
  )

  const columns: ColumnDef[] = [
    {
      header: 'Nome',
      accessor: 'name',
    },
    {
      header: 'Tipo',
      accessor: 'document_type',
    },
    {
      header: 'Vencimento',
      accessor: 'expiration_date',
      render: (item) => {
        if (!item.expiration_date) return '-'
        return format(new Date(item.expiration_date + 'T00:00:00'), 'dd/MM/yyyy')
      },
    },
    {
      header: 'Anexos',
      accessor: 'file_urls',
      render: (item) => {
        const urls = item.file_urls && Array.isArray(item.file_urls) ? item.file_urls : []
        const allUrls = item.file_url ? [item.file_url, ...urls] : urls

        if (allUrls.length === 0)
          return <span className="text-muted-foreground text-sm">Sem anexos</span>
        if (allUrls.length === 1) {
          return (
            <a
              href={allUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-deepBlue hover:underline flex items-center gap-1 text-sm"
            >
              <Download className="w-4 h-4" /> Baixar
            </a>
          )
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex items-center gap-1 text-brand-deepBlue hover:bg-brand-deepBlue/10 hover:text-brand-deepBlue"
              >
                <FileText className="w-4 h-4" /> {allUrls.length} Arquivos
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allUrls.map((url, i) => {
                const filename =
                  url.split('/').pop()?.split('_').slice(1).join('_') || `Arquivo ${i + 1}`
                return (
                  <DropdownMenuItem key={i} asChild>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" /> {decodeURIComponent(filename)}
                    </a>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const fetchQuery = async () => {
    let q = supabase.from('sector_documents').select('*').order('created_at', { ascending: false })
    if (profile?.role !== 'Master') {
      q = q.eq('client_id', profile?.client_id)
    }
    const { data } = await q
    return data || []
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <CrudGeneric
        title="Gestão de Documentos do Setor"
        singularName="Documento"
        subtitle="Controle de alvarás, licenças e documentos obrigatórios."
        tableName="sector_documents"
        icon={FileText}
        fields={fields}
        columns={columns}
        fetchQuery={fetchQuery}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onRemove={(id: string) => remove(id)}
        plantField="plant_id"
        plants={plants}
        searchFields={['name', 'document_type']}
      />
    </div>
  )
}
