import { useState, useEffect } from 'react'
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
import { Plus, Loader2, Building } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Navigate } from 'react-router-dom'
import { CreateClientDialog } from './components/CreateClientDialog'
import { EditClientDialog } from './components/EditClientDialog'

export default function Clientes() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)

  const { profile } = useAppStore()

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.role === 'Master') {
      fetchClients()
    }
  }, [profile])

  if (profile?.role !== 'Master') {
    return <Navigate to="/" replace />
  }

  const handleEditClick = (client: any) => {
    setSelectedClient(client)
    setEditOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie os clientes do seu SaaS Multi-tenant.
          </p>
        </div>
        <Button
          className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-gray-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-slate-800">Nome do Cliente</TableHead>
              <TableHead className="font-semibold text-slate-800">URL Slug</TableHead>
              <TableHead className="font-semibold text-slate-800">Status</TableHead>
              <TableHead className="font-semibold text-slate-800">Módulos</TableHead>
              <TableHead className="font-semibold text-slate-800 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-vividBlue" />
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-600">
                  Nenhum cliente cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50 border-gray-100">
                  <TableCell className="font-medium text-brand-graphite">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-slate-400" />
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{c.url_slug}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        c.status === 'Ativo'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {(c.modules || []).length} módulo(s)
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-brand-vividBlue hover:bg-brand-vividBlue/10 hover:text-brand-vividBlue"
                      onClick={() => handleEditClick(c)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchClients} />
      {selectedClient && (
        <EditClientDialog
          client={selectedClient}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={fetchClients}
        />
      )}
    </div>
  )
}
