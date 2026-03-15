import { useParams, Navigate } from 'react-router-dom'
import { CrudGeneric, FieldDef } from '@/components/gestao-terceiros/CrudGeneric'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { logAudit } from '@/services/audit'
import { Loader2 } from 'lucide-react'

export default function Cadastros() {
  const { type } = useParams()
  const { profile } = useAppStore()
  const { user } = useAuth()
  const { plants, locations, functions, equipment, loading, refetch } = useMasterData()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    )
  }
  if (!profile) return null

  const getCrudConfig = () => {
    switch (type) {
      case 'plantas':
        return {
          title: 'Plantas',
          tableName: 'plants',
          fields: [
            { name: 'name', label: 'Nome da Planta', type: 'text' },
            { name: 'code', label: 'Código', type: 'text' },
            { name: 'city', label: 'Cidade', type: 'text' },
          ] as FieldDef[],
        }
      case 'locais':
        return {
          title: 'Locais',
          tableName: 'locations',
          fields: [
            { name: 'name', label: 'Nome do Local', type: 'text' },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              render: (v: string) => plants.find((p) => p.id === v)?.name,
            },
            { name: 'description', label: 'Descrição', type: 'text' },
          ] as FieldDef[],
        }
      case 'funcoes':
        return {
          title: 'Funções',
          tableName: 'functions',
          fields: [
            { name: 'name', label: 'Nome da Função', type: 'text' },
            { name: 'description', label: 'Descrição', type: 'text' },
          ] as FieldDef[],
        }
      case 'colaboradores':
        return {
          title: 'Colaboradores',
          tableName: 'employees',
          fields: [
            { name: 'name', label: 'Nome', type: 'text' },
            { name: 'company_name', label: 'Empresa Terceira', type: 'text' },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              render: (v: string) => plants.find((p) => p.id === v)?.name,
            },
            {
              name: 'location_id',
              label: 'Local',
              type: 'select',
              options: locations.map((l) => ({ value: l.id, label: l.name })),
              render: (v: string) => locations.find((l) => l.id === v)?.name,
            },
            {
              name: 'function_id',
              label: 'Função',
              type: 'select',
              options: functions.map((f) => ({ value: f.id, label: f.name })),
              render: (v: string) => functions.find((f) => f.id === v)?.name,
            },
          ] as FieldDef[],
        }
      case 'equipamentos':
        return {
          title: 'Equipamentos',
          tableName: 'equipment',
          fields: [
            { name: 'name', label: 'Equipamento', type: 'text' },
            { name: 'type', label: 'Tipo/Categoria', type: 'text' },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              render: (v: string) => plants.find((p) => p.id === v)?.name,
            },
            { name: 'quantity', label: 'Quantidade', type: 'number' },
          ] as FieldDef[],
        }
      case 'quadro-contratado':
        return {
          title: 'Quadro Contratado',
          tableName: 'contracted_headcount',
          fields: [
            {
              name: 'type',
              label: 'Tipo',
              type: 'select',
              options: [
                { value: 'colaborador', label: 'Colaborador' },
                { value: 'equipamento', label: 'Equipamento' },
              ],
            },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              render: (v: string) => plants.find((p) => p.id === v)?.name,
            },
            {
              name: 'function_id',
              label: 'Função (Se Colaborador)',
              type: 'select',
              options: functions.map((f) => ({ value: f.id, label: f.name })),
              render: (v: string) => functions.find((f) => f.id === v)?.name,
            },
            { name: 'quantity', label: 'Quantidade Prevista', type: 'number' },
          ] as FieldDef[],
        }
      case 'book-metas':
        return {
          title: 'Book de Metas',
          tableName: 'goals_book',
          fields: [
            { name: 'name', label: 'Nome da Meta', type: 'text' },
            { name: 'description', label: 'Descrição', type: 'text' },
            { name: 'is_active', label: 'Ativo?', type: 'toggle' },
          ] as FieldDef[],
        }
      default:
        return null
    }
  }

  const config = getCrudConfig()
  if (!config) return <Navigate to="/gestao-terceiros" replace />

  const fetchQuery = async () => {
    let q = supabase.from(config.tableName).select('*')
    if (config.tableName !== 'locations') {
      q = q.eq('client_id', profile.client_id)
    } else {
      q = q.in(
        'plant_id',
        plants.map((p) => p.id),
      )
    }
    const { data } = await q.order('created_at', { ascending: false })
    return data || []
  }

  const handleAdd = async (data: any) => {
    const payload = { ...data }
    if (config.tableName !== 'locations') payload.client_id = profile.client_id
    if (config.tableName === 'contracted_headcount') {
      if (!payload.function_id) delete payload.function_id
      if (!payload.location_id) delete payload.location_id
      if (!payload.equipment_id) delete payload.equipment_id
    }
    const { error } = await supabase.from(config.tableName).insert([payload])
    if (!error) {
      refetch()
      if (user)
        logAudit(profile.client_id, user.id, `Cadastro de ${config.title}`, JSON.stringify(data))
    }
    return !error
  }

  const handleRemove = (id: string) => {
    if (user)
      logAudit(profile.client_id, user.id, `Exclusão em ${config.title}`, `Registro ID: ${id}`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground capitalize">
          {config.title}
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie os registros de {config.title.toLowerCase()}.
        </p>
      </div>
      <CrudGeneric
        key={type}
        title={config.title}
        tableName={config.tableName}
        fields={config.fields}
        fetchQuery={fetchQuery}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </div>
  )
}
