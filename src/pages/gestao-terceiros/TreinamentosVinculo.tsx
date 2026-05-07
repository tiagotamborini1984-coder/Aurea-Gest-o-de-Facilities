import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, FileText } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export function EmployeeTrainingsForm({ form, setForm }: any) {
  const [trainings, setTrainings] = useState<any[]>([])
  const [, setRequiredTrainings] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { activeClient } = useAppStore()
  const { toast } = useToast()

  useEffect(() => {
    if (!activeClient) return

    supabase
      .from('trainings')
      .select('*')
      .eq('client_id', activeClient.id)
      .then(({ data }) => {
        if (data) setTrainings(data)
      })
  }, [activeClient])

  useEffect(() => {
    async function loadSavedRecords() {
      if (form.id && !isInitialized) {
        setIsLoading(true)
        const { data } = await supabase
          .from('employee_training_records')
          .select('*')
          .eq('employee_id', form.id)

        if (data) {
          const records = data.map((d) => ({
            training_id: d.training_id,
            completion_date: d.completion_date,
            document_url: d.document_url,
            is_required: false,
          }))
          setForm((prev: any) => ({ ...prev, training_records: records }))
        }
        setIsInitialized(true)
        setIsLoading(false)
      } else if (!form.id && !isInitialized) {
        setIsInitialized(true)
      }
    }
    loadSavedRecords()
  }, [form.id, isInitialized, setForm])

  useEffect(() => {
    async function loadRequired() {
      if (!form.function_id) {
        setRequiredTrainings([])
        setForm((prev: any) => {
          if (prev.training_records) {
            const updated = prev.training_records.map((r: any) => ({ ...r, is_required: false }))
            return { ...prev, training_records: updated }
          }
          return prev
        })
        return
      }

      const { data } = await supabase
        .from('function_required_trainings')
        .select('training_id')
        .eq('function_id', form.function_id)

      if (data) {
        const reqIds = data.map((d) => d.training_id)
        setRequiredTrainings(reqIds)

        setForm((prev: any) => {
          const currentRecords = prev.training_records || []
          const newRecords = [...currentRecords]
          let changed = false

          newRecords.forEach((r) => {
            const isReq = reqIds.includes(r.training_id)
            if (r.is_required !== isReq) {
              r.is_required = isReq
              changed = true
            }
          })

          reqIds.forEach((reqId) => {
            if (!newRecords.find((r) => r.training_id === reqId)) {
              newRecords.push({
                training_id: reqId,
                completion_date: '',
                document_url: '',
                is_required: true,
              })
              changed = true
            }
          })

          if (changed) {
            return { ...prev, training_records: newRecords }
          }
          return prev
        })
      }
    }

    if (isInitialized) {
      loadRequired()
    }
  }, [form.function_id, isInitialized, setForm])

  const records = form.training_records || []

  const addRecord = () => {
    setForm({
      ...form,
      training_records: [
        ...records,
        { training_id: '', completion_date: '', document_url: '', is_required: false },
      ],
    })
  }

  const updateRecord = (index: number, field: string, value: any) => {
    const newRecords = [...records]
    newRecords[index][field] = value
    setForm({ ...form, training_records: newRecords })
  }

  const removeRecord = (index: number) => {
    const newRecords = [...records]
    newRecords.splice(index, 1)
    setForm({ ...form, training_records: newRecords })
  }

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${activeClient?.id}/trainings/${fileName}`

    toast({ title: 'Fazendo upload...', description: 'Aguarde o carregamento do documento.' })

    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)

    if (uploadError) {
      toast({
        title: 'Erro ao fazer upload',
        description: uploadError.message,
        variant: 'destructive',
      })
      return
    }

    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath)
    updateRecord(index, 'document_url', publicUrlData.publicUrl)
    toast({ title: 'Sucesso', description: 'Documento anexado com sucesso.' })
  }

  if (isLoading)
    return (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">
        Carregando treinamentos...
      </div>
    )

  return (
    <div className="space-y-4 border-t pt-4 mt-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <Label className="text-base font-semibold">Treinamentos do Colaborador</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Treinamentos obrigatórios da função serão adicionados automaticamente.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRecord}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Treinamento
        </Button>
      </div>

      {records.length === 0 && (
        <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-sm text-muted-foreground text-center">
          Nenhum treinamento vinculado.
        </div>
      )}

      <div className="space-y-3">
        {records.map((record: any, index: number) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-3 items-end bg-muted/30 p-3 rounded-lg border border-border/50"
          >
            <div className="col-span-12 lg:col-span-5">
              <Label className="text-xs font-medium mb-1.5 block">
                Treinamento{' '}
                {record.is_required && <span className="text-red-500 font-bold ml-1">*</span>}
              </Label>
              <Select
                value={record.training_id}
                onValueChange={(val) => updateRecord(index, 'training_id', val)}
                disabled={record.is_required}
              >
                <SelectTrigger
                  className={cn(
                    'bg-background h-auto min-h-[2.5rem] py-2 text-left [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:break-words w-full text-sm transition-none',
                    record.is_required
                      ? 'opacity-100 disabled:opacity-100 font-bold text-slate-900 bg-slate-100 border-slate-300 cursor-default'
                      : 'font-medium text-slate-900',
                  )}
                  title={
                    trainings.find((t) => t.id === record.training_id)?.name ||
                    'Selecione o treinamento...'
                  }
                >
                  <SelectValue placeholder="Selecione o treinamento..." />
                </SelectTrigger>
                <SelectContent>
                  {trainings.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      title={t.name}
                      className="whitespace-normal break-words pr-8"
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-12 sm:col-span-6 lg:col-span-3">
              <Label className="text-xs font-medium mb-1.5 block">
                Data de Conclusão{' '}
                {record.is_required && <span className="text-red-500 font-bold ml-1">*</span>}
              </Label>
              <Input
                type="date"
                value={record.completion_date || ''}
                onChange={(e) => updateRecord(index, 'completion_date', e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="col-span-12 sm:col-span-5 lg:col-span-3">
              <Label className="text-xs font-medium mb-1.5 block">
                Comprovante{' '}
                {record.is_required && <span className="text-red-500 font-bold ml-1">*</span>}
              </Label>
              {record.document_url ? (
                <div className="flex items-center gap-2 h-10 px-3 bg-background border rounded-md">
                  <a
                    href={record.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-vividBlue hover:text-brand-deepBlue hover:underline truncate flex-1 font-medium"
                    title="Ver documento anexado"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">Ver Anexo</span>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateRecord(index, 'document_url', '')}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    title="Remover documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  onChange={(e) => handleFileUpload(index, e)}
                  className="bg-background file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-vividBlue/10 file:text-brand-vividBlue hover:file:bg-brand-vividBlue/20 cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              )}
            </div>

            <div className="col-span-12 sm:col-span-1 lg:col-span-1 flex sm:justify-end pb-1">
              {!record.is_required && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRecord(index)}
                  className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-9 w-9"
                  title="Remover treinamento"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FunctionTrainingsForm({ form, setForm }: any) {
  const [trainings, setTrainings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { activeClient } = useAppStore()

  useEffect(() => {
    if (!activeClient) return

    supabase
      .from('trainings')
      .select('*')
      .eq('client_id', activeClient.id)
      .then(({ data }) => {
        if (data) setTrainings(data)
      })
  }, [activeClient])

  useEffect(() => {
    async function loadSavedRecords() {
      if (form.id && !isInitialized) {
        setIsLoading(true)
        const { data } = await supabase
          .from('function_required_trainings')
          .select('training_id')
          .eq('function_id', form.id)

        if (data) {
          const records = data.map((d) => ({
            training_id: d.training_id,
          }))
          setForm((prev: any) => ({ ...prev, training_records: records }))
        }
        setIsInitialized(true)
        setIsLoading(false)
      } else if (!form.id && !isInitialized) {
        setIsInitialized(true)
      }
    }
    loadSavedRecords()
  }, [form.id, isInitialized, setForm])

  const records = form.training_records || []

  const addRecord = () => {
    setForm({ ...form, training_records: [...records, { training_id: '' }] })
  }

  const updateRecord = (index: number, field: string, value: any) => {
    const newRecords = [...records]
    newRecords[index][field] = value
    setForm({ ...form, training_records: newRecords })
  }

  const removeRecord = (index: number) => {
    const newRecords = [...records]
    newRecords.splice(index, 1)
    setForm({ ...form, training_records: newRecords })
  }

  if (isLoading)
    return (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">
        Carregando treinamentos...
      </div>
    )

  return (
    <div className="space-y-4 border-t pt-4 mt-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <Label className="text-base font-semibold">Treinamentos Obrigatórios da Função</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Todos os colaboradores associados a esta função precisarão realizar estes treinamentos.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRecord}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Treinamento
        </Button>
      </div>

      {records.length === 0 && (
        <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-sm text-muted-foreground text-center">
          Nenhum treinamento vinculado.
        </div>
      )}

      <div className="space-y-3">
        {records.map((record: any, index: number) => (
          <div
            key={index}
            className="flex gap-4 items-end bg-muted/30 p-3 rounded-lg border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-medium mb-1.5 block">Treinamento</Label>
              <Select
                value={record.training_id}
                onValueChange={(val) => updateRecord(index, 'training_id', val)}
              >
                <SelectTrigger
                  className="bg-background h-auto min-h-[2.5rem] py-2 text-left [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:break-words w-full text-sm font-medium text-slate-900"
                  title={
                    trainings.find((t) => t.id === record.training_id)?.name ||
                    'Selecione o treinamento...'
                  }
                >
                  <SelectValue placeholder="Selecione o treinamento..." />
                </SelectTrigger>
                <SelectContent>
                  {trainings.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      title={t.name}
                      className="whitespace-normal break-words pr-8"
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRecord(index)}
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-10 w-10 shrink-0 pb-1"
              title="Remover treinamento"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
