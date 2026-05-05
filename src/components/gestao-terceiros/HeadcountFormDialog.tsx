import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HeadcountFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSave,
  editingItem,
  plants,
  locations,
  companies,
  functions,
  equipment,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar' : 'Adicionar'} Registro</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mês de Referência</label>
            <Input
              type="month"
              value={form.reference_month || ''}
              onChange={(e) => setForm({ ...form, reference_month: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantidade</label>
            <Input
              type="number"
              min="1"
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Planta *</label>
            <Select
              value={form.plant_id || ''}
              onValueChange={(v) => setForm({ ...form, plant_id: v, location_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Local</label>
            <Select
              value={form.location_id || 'none'}
              onValueChange={(v) => setForm({ ...form, location_id: v === 'none' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os locais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todos os locais</SelectItem>
                {locations
                  ?.filter((l: any) => l.plant_id === form.plant_id)
                  .map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Empresa</label>
            <Select
              value={form.company_id || 'none'}
              onValueChange={(v) => setForm({ ...form, company_id: v === 'none' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Opcional</SelectItem>
                {companies?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.type === 'colaborador' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Função *</label>
              <Select
                value={form.function_id || ''}
                onValueChange={(v) => setForm({ ...form, function_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {functions?.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {form.type === 'equipamento' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipamento *</label>
              <Select
                value={form.equipment_id || ''}
                onValueChange={(v) => setForm({ ...form, equipment_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {equipment
                    ?.filter((e: any) => e.plant_id === form.plant_id)
                    .map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="tech" onClick={onSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
