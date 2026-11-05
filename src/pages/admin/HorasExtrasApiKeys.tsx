import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Ban,
  Trash2,
  AlertTriangle,
  Code2,
  ExternalLink,
  Building2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { generateRawApiKey, sha256Hex } from '@/lib/api-key-utils'

interface ApiKeyRecord {
  id: string
  client_id: string
  company_id: string
  name: string
  key_prefix: string
  key_hash: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
  companies?: {
    id: string
    name: string
    service_type: string
  }
}

export default function HorasExtrasApiKeys() {
  const { profile, activeClient, selectedMasterClient } = useAppStore()
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulário de nova chave
  const [keyName, setKeyName] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  // Modal para exibir a chave recém-gerada (segredo único)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [hasCopied, setHasCopied] = useState(false)

  // Modal de confirmação de revogação
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyRecord | null>(null)

  const effectiveClientId = useMemo(() => {
    if (profile?.role === 'Master') {
      return selectedMasterClient === 'all' ? null : selectedMasterClient
    }
    return profile?.client_id || activeClient?.id || null
  }, [profile, selectedMasterClient, activeClient])

  const fetchCompanies = useCallback(async () => {
    try {
      let q = supabase.from('companies').select('id, name, service_type, client_id').order('name')
      if (effectiveClientId) {
        q = q.eq('client_id', effectiveClientId)
      }
      const { data, error } = await q
      if (error) throw error
      setCompanies(data || [])
    } catch (err: any) {
      console.error('Erro ao buscar empresas:', err)
      toast.error('Erro ao carregar empresas parceiras.')
    }
  }, [effectiveClientId])

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('horas_extras_api_keys')
        .select(`
          id,
          client_id,
          company_id,
          name,
          key_prefix,
          key_hash,
          is_active,
          last_used_at,
          created_at,
          revoked_at,
          companies (
            id,
            name,
            service_type
          )
        `)
        .order('created_at', { ascending: false })

      if (effectiveClientId) {
        q = q.eq('client_id', effectiveClientId)
      }

      const { data, error } = await q
      if (error) throw error
      setKeys((data as unknown as ApiKeyRecord[]) || [])
    } catch (err: any) {
      console.error('Erro ao buscar chaves de API:', err)
      toast.error('Erro ao carregar chaves de API.')
    } finally {
      setLoading(false)
    }
  }, [effectiveClientId])

  useEffect(() => {
    fetchCompanies()
    fetchKeys()
  }, [fetchCompanies, fetchKeys])

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) {
      toast.error('Informe um nome descritivo para a chave.')
      return
    }
    if (!selectedCompanyId) {
      toast.error('Selecione a empresa terceira solicitante.')
      return
    }

    const company = companies.find((c) => c.id === selectedCompanyId)
    const targetClientId = company?.client_id || effectiveClientId

    if (!targetClientId) {
      toast.error('Não foi possível identificar o cliente vinculado à empresa.')
      return
    }

    setIsSubmitting(true)
    try {
      const rawKey = generateRawApiKey()
      const hash = await sha256Hex(rawKey)
      const prefix = rawKey.substring(0, 16) + '...'

      const { error } = await supabase.from('horas_extras_api_keys').insert({
        client_id: targetClientId,
        company_id: selectedCompanyId,
        name: keyName.trim(),
        key_prefix: prefix,
        key_hash: hash,
        is_active: true,
        created_by: profile?.id || null,
      })

      if (error) throw error

      setGeneratedKey(rawKey)
      setHasCopied(false)
      setIsCreateOpen(false)
      setKeyName('')
      setSelectedCompanyId('')
      toast.success('Chave de API gerada com sucesso!')
      fetchKeys()
    } catch (err: any) {
      console.error('Erro ao criar chave:', err)
      toast.error('Erro ao gerar chave de API: ' + (err.message || ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyKey = () => {
    if (!generatedKey) return
    navigator.clipboard.writeText(generatedKey)
    setHasCopied(true)
    toast.success('Chave copiada para a área de transferência!')
    setTimeout(() => setHasCopied(false), 3000)
  }

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return
    try {
      const { error } = await supabase
        .from('horas_extras_api_keys')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', keyToRevoke.id)

      if (error) throw error
      toast.success(`Chave "${keyToRevoke.name}" revogada com sucesso!`)
      setKeyToRevoke(null)
      fetchKeys()
    } catch (err: any) {
      console.error('Erro ao revogar chave:', err)
      toast.error('Erro ao revogar chave: ' + (err.message || ''))
    }
  }

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o registro da chave "${name}"?`)) return
    try {
      const { error } = await supabase.from('horas_extras_api_keys').delete().eq('id', id)
      if (error) throw error
      toast.success('Chave removida.')
      fetchKeys()
    } catch (err: any) {
      console.error('Erro ao excluir chave:', err)
      toast.error('Erro ao excluir chave: ' + (err.message || ''))
    }
  }

  const apiEndpointUrl = `${window.location.origin.includes('localhost') ? 'https://fynqfwwchcvikbwwicvz.supabase.co' : window.location.origin}/functions/v1/horas-extras-api`

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestao-terceiros">Início</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Administração</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Chaves de API (Horas Extras)</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-brand-vividBlue" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Chaves de API — Horas Extras
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gere e gerencie chaves REST para que os sistemas externos das empresas parceiras
            consultem as solicitações de Horas Extras de seus colaboradores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchKeys()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Chave de API
          </Button>
        </div>
      </div>

      {/* Cartão de documentação rápida do endpoint */}
      <Card className="bg-slate-50/70 border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-slate-700" />
            <CardTitle className="text-base font-semibold text-slate-800">
              Como conectar o sistema da empresa externa
            </CardTitle>
          </div>
          <CardDescription>
            Cada chave dá acesso apenas às solicitações de HE da empresa contratada vinculada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 font-mono bg-white p-2.5 rounded border">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-300 w-fit"
            >
              GET
            </Badge>
            <span className="truncate select-all">{apiEndpointUrl}</span>
          </div>
          <div className="space-y-1 font-mono text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
            <div className="text-slate-400"># Exemplo de chamada via cURL:</div>
            <div>curl -X GET &quot;{apiEndpointUrl}?status=pendente&quot; \</div>
            <div className="pl-4 text-emerald-400">-H &quot;X-API-Key: ahe_live_...&quot;</div>
          </div>
          <p className="text-xs text-slate-500">
            Filtros opcionais na URL:{' '}
            <code className="text-slate-800 bg-slate-200 px-1 py-0.5 rounded">
              status=pendente|aprovada|recusada
            </code>
            ,{' '}
            <code className="text-slate-800 bg-slate-200 px-1 py-0.5 rounded">
              data_inicio=AAAA-MM-DD
            </code>
            ,{' '}
            <code className="text-slate-800 bg-slate-200 px-1 py-0.5 rounded">
              data_fim=AAAA-MM-DD
            </code>
            , <code className="text-slate-800 bg-slate-200 px-1 py-0.5 rounded">limite=100</code>.
          </p>
        </CardContent>
      </Card>

      {/* Tabela de chaves */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Chaves Ativas e Revogadas</CardTitle>
          <CardDescription>
            {keys.length} chave(s) cadastrada(s) para o escopo selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Chave</TableHead>
                <TableHead>Empresa Contratada</TableHead>
                <TableHead>Prefixo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Uso</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Carregando chaves de API...
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhuma chave de API gerada até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((k) => (
                  <TableRow key={k.id} className={!k.is_active ? 'opacity-60 bg-slate-50' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-slate-400" />
                        <span>{k.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{k.companies?.name || 'Empresa não encontrada'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {k.key_prefix}
                    </TableCell>
                    <TableCell>
                      {k.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200"
                        >
                          Revogada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {k.last_used_at
                        ? format(new Date(k.last_used_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })
                        : 'Nunca utilizada'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(k.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {k.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setKeyToRevoke(k)}
                            title="Revogar chave de acesso"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Revogar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-600"
                          onClick={() => handleDeleteKey(k.id, k.name)}
                          title="Excluir registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Criar Nova Chave */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateKey}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand-vividBlue" />
                Nova Chave de API para Empresa Solicitante
              </DialogTitle>
              <DialogDescription>
                A chave gerada terá permissão somente leitura para consultar solicitações de Horas
                Extras vinculadas à empresa selecionada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Nome ou Identificação da Integração</Label>
                <Input
                  id="keyName"
                  placeholder="Ex: ERP Totvs - Azul Serviços, Sistema RH FCG"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySelect">Empresa Terceira Solicitante</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger id="companySelect">
                    <SelectValue placeholder="Selecione a empresa contratada..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.service_type ? `(${c.service_type})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Esta chave só terá acesso aos colaboradores desta empresa parceira.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Gerando...' : 'Gerar Chave de API'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Chave Gerada com Sucesso (exibe uma única vez) */}
      <Dialog open={!!generatedKey} onOpenChange={(open) => !open && setGeneratedKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Check className="h-5 w-5" />
              Chave de API Gerada com Sucesso
            </DialogTitle>
            <DialogDescription>
              Copie a chave agora. Por motivos de segurança, ela é armazenada como hash SHA-256 e{' '}
              <strong className="text-rose-600 font-semibold">
                não poderá ser visualizada novamente
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Envie esta chave com segurança ao responsável técnico do sistema da empresa
                parceira.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Chave Secreta:</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedKey || ''}
                  className="font-mono text-xs bg-slate-50 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyKey}
                  className="shrink-0"
                >
                  {hasCopied ? (
                    <Check className="h-4 w-4 text-emerald-600 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {hasCopied ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
              onClick={() => setGeneratedKey(null)}
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Revogação */}
      <Dialog open={!!keyToRevoke} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Ban className="h-5 w-5" />
              Revogar Chave de API
            </DialogTitle>
            <DialogDescription>
              Deseja revogar a chave <strong>{keyToRevoke?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600">
            A empresa terceira não conseguirá mais consultar solicitações usando esta chave. Esta
            ação pode ser revertida ou uma nova chave gerada.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyToRevoke(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRevokeKey}>
              Confirmar Revogação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
