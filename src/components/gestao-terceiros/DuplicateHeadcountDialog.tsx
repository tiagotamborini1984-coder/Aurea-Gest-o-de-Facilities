import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function DuplicateHeadcountDialog({
  open,
  onOpenChange,
  clientId,
  monthOptions,
  defaultSource,
  defaultTarget,
  onSuccess,
  tableName = 'contracted_headcount',
}: any) {
  const [dupSource, setDupSource] = useState<string>('')
  const [dupTarget, setDupTarget] = useState<string>('')
  const [isCheckingDup, setIsCheckingDup] = useState(false)
  const [dupConflict, setDupConflict] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setDupSource(defaultSource)
      setDupTarget(defaultTarget)
      setDupConflict(false)
    }
  }, [open, defaultSource, defaultTarget])

  const handleDuplicate = async () => {
    if (!dupSource || !dupTarget || dupSource === dupTarget) {
      toast({ title: 'Origem e destino inválidos', variant: 'destructive' })
      return
    }

    setIsCheckingDup(true)
    try {
      if (!dupConflict) {
        const { data: existing } = await supabase
          .from(tableName)
          .select('id')
          .eq('client_id', clientId)
          .eq('reference_month', `${dupTarget}-01`)
          .limit(1)
        if (existing && existing.length > 0) {
          setDupConflict(true)
          setIsCheckingDup(false)
          return
        }
      }

      const { data: sourceData } = await supabase
        .from(tableName)
        .select('*')
        .eq('client_id', clientId)
        .eq('reference_month', `${dupSource}-01`)
      if (!sourceData || sourceData.length === 0) {
        toast({ title: 'Nenhum dado na origem', variant: 'destructive' })
        setIsCheckingDup(false)
        setDupConflict(false)
        return
      }

      const newEntries = sourceData.map((item) => {
        const { id, created_at, ...rest } = item
        return { ...rest, reference_month: `${dupTarget}-01` }
      })

      if (dupConflict) {
        await supabase
          .from(tableName)
          .delete()
          .eq('client_id', clientId)
          .eq('reference_month', `${dupTarget}-01`)
      }

      const { error } = await supabase.from(tableName).insert(newEntries)
      if (error) throw error

      toast({ title: 'Duplicado com sucesso!' })
      onOpenChange(false)
      setDupConflict(false)
      onSuccess(dupTarget)
    } catch (error: any) {
      toast({ title: 'Erro ao duplicar', description: error.message, variant: 'destructive' })
    } finally {
      setIsCheckingDup(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setDupConflict(false)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar Dados</DialogTitle>
          <DialogDescription>
            Copie os registros de um mês para outro rapidamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {dupConflict && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>
                O mês de destino já possui dados. Prosseguir irá <strong>sobrescrever</strong> as
                informações existentes. Deseja continuar?
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">De (Origem)</label>
              <Select
                value={dupSource}
                onValueChange={(v) => {
                  setDupSource(v)
                  setDupConflict(false)
                }}
                disabled={isCheckingDup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((o: any) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Para (Destino)</label>
              <Select
                value={dupTarget}
                onValueChange={(v) => {
                  setDupTarget(v)
                  setDupConflict(false)
                }}
                disabled={isCheckingDup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((o: any) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCheckingDup}>
            Cancelar
          </Button>
          <Button
            variant={dupConflict ? 'destructive' : 'tech'}
            onClick={handleDuplicate}
            disabled={isCheckingDup}
          >
            {isCheckingDup && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {dupConflict ? 'Sim, Sobrescrever' : 'Duplicar Dados'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
