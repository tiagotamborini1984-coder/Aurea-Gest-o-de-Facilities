import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

export function EmployeeTrainingsForm({ form, setForm }: { form: any; setForm: any }) {
  const [loading, setLoading] = useState(false)
  const [requiredTrainings, setRequiredTrainings] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      if (!form.function_id) {
        setRequiredTrainings([])
        setForm((prev: any) => ({ ...prev, training_records: [] }))
        return
      }

      setLoading(true)
      try {
        const { data: reqData } = await supabase
          .from('function_required_trainings')
          .select(`
            training_id,
            trainings ( id, name, validity_months )
          `)
          .eq('function_id', form.function_id)

        const required = reqData?.map((r) => r.trainings) || []

        let existingRecords: any[] = []
        if (form.id) {
          const { data: recData } = await supabase
            .from('employee_training_records')
            .select('*')
            .eq('employee_id', form.id)
          existingRecords = recData || []
        }

        const initialRecords = required.map((t: any) => {
          const existing = existingRecords.find((r) => r.training_id === t.id)
          return {
            training_id: t.id,
            name: t.name,
            validity_months: t.validity_months,
            document_url: existing?.document_url || '',
            completion_date: existing?.completion_date || '',
            completed: !!existing,
          }
        })

        setRequiredTrainings(initialRecords)

        const validRecords = initialRecords.filter((r) => r.completed)
        setForm((prev: any) => ({ ...prev, training_records: validRecords }))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.function_id, form.id])

  const handleUpdate = (index: number, field: string, value: any) => {
    const updated = [...requiredTrainings]
    updated[index] = { ...updated[index], [field]: value }
    setRequiredTrainings(updated)

    const validRecords = updated
      .filter((r) => r.completed)
      .map((r) => ({
        training_id: r.training_id,
        document_url: r.document_url,
        completion_date: r.completion_date,
      }))
    setForm((prev: any) => ({ ...prev, training_records: validRecords }))
  }

  if (!form.function_id) return null

  return (
    <div className="col-span-1 sm:col-span-2 pt-4 border-t mt-2">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">
        Treinamentos Obrigatórios da Função
      </h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando treinamentos...
        </div>
      ) : requiredTrainings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum treinamento obrigatório vinculado a esta função.
        </p>
      ) : (
        <div className="space-y-4">
          {requiredTrainings.map((tr, idx) => (
            <div
              key={tr.training_id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 border rounded-lg bg-slate-50/50"
            >
              <div className="flex items-center gap-3 w-full sm:w-1/3">
                <Checkbox
                  checked={tr.completed}
                  onCheckedChange={(val) => handleUpdate(idx, 'completed', val)}
                />
                <div>
                  <p className="text-sm font-medium">{tr.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tr.validity_months ? `Validade: ${tr.validity_months} meses` : 'Sem validade'}
                  </p>
                </div>
              </div>

              {tr.completed && (
                <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                  <div className="w-full sm:w-1/2">
                    <Label className="text-xs text-slate-500 mb-1.5 block">Data de Conclusão</Label>
                    <Input
                      type="date"
                      value={tr.completion_date}
                      onChange={(e) => handleUpdate(idx, 'completion_date', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-full sm:w-1/2">
                    <Label className="text-xs text-slate-500 mb-1.5 block">
                      URL do Certificado (Opcional)
                    </Label>
                    <Input
                      type="text"
                      placeholder="Link para o documento"
                      value={tr.document_url}
                      onChange={(e) => handleUpdate(idx, 'document_url', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function FunctionTrainingsForm({ form, setForm }: { form: any; setForm: any }) {
  const [loading, setLoading] = useState(false)
  const [allTrainings, setAllTrainings] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const { data: tData } = await supabase.from('trainings').select('id, name').order('name')
        const trainingsList = tData || []

        let selectedIds: string[] = []
        if (form.id) {
          const { data: reqData } = await supabase
            .from('function_required_trainings')
            .select('training_id')
            .eq('function_id', form.id)
          selectedIds = reqData?.map((r) => r.training_id) || []
        }

        const initialized = trainingsList.map((t) => ({
          ...t,
          selected: selectedIds.includes(t.id),
        }))

        setAllTrainings(initialized)

        const initialFormRecords = initialized
          .filter((t) => t.selected)
          .map((t) => ({ training_id: t.id }))
        setForm((prev: any) => ({ ...prev, training_records: initialFormRecords }))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id])

  const toggleTraining = (id: string, checked: boolean) => {
    const updated = allTrainings.map((t) => (t.id === id ? { ...t, selected: checked } : t))
    setAllTrainings(updated)
    const validRecords = updated.filter((t) => t.selected).map((t) => ({ training_id: t.id }))
    setForm((prev: any) => ({ ...prev, training_records: validRecords }))
  }

  return (
    <div className="col-span-1 sm:col-span-2 pt-4 border-t mt-2">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">Treinamentos Obrigatórios</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando treinamentos...
        </div>
      ) : allTrainings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum treinamento cadastrado no sistema.</p>
      ) : (
        <ScrollArea className="h-48 border rounded-md p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allTrainings.map((t) => (
              <div
                key={t.id}
                className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md transition-colors"
              >
                <Checkbox
                  id={`tr-${t.id}`}
                  checked={t.selected}
                  onCheckedChange={(val) => toggleTraining(t.id, !!val)}
                />
                <label htmlFor={`tr-${t.id}`} className="text-sm font-medium cursor-pointer flex-1">
                  {t.name}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
