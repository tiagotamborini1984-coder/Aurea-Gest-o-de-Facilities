import { useParams, Navigate } from 'react-router-dom'
import { CrudGeneric, FieldDef } from '@/components/gestao-terceiros/CrudGeneric'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { logAudit } from '@/services/audit'
import {
  Loader2,
  Building2,
  MapPin,
  Briefcase,
  Users,
  Wrench,
  FileText,
  Target,
} from 'lucide-react'

export default function Cadastros() {
  const { type } = useParams()
  const { profile } = useAppStore()
  const { user } = useAuth()
  const { plants, locations, functions, equipment, loading, refetch } = useMasterData()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
      </div>
    )
  }
  if (!profile) return null

  const getCrudConfig = () => {
    switch (type) {
      case 'plantas':
        return {
          title: 'Plantas',
          subtitle: 'Cadastro e gestão das plantas de operação',
          tableName: 'plants',
          icon: Building2,
          plantField: 'id',
          searchFields: ['name', 'code', 'city'],
          fields: [
            { name: 'name', label: 'Nome da Planta', type: 'text', required: true },
            { name: 'code', label: 'Código', type: 'text', required: true },
            { name: 'city', label: 'Cidade', type: 'text', required: true },
          ] as FieldDef[],
        }
      case 'locais':
        return {
          title: 'Locais',
          subtitle: 'Cadastro e gestão de locais por planta',
          tableName: 'locations',
          icon: MapPin,
          plantField: 'plant_id',
          searchFields: ['name', 'description'],
          groupBy: (item: any) => plants.find((p) => p.id === item.plant_id)?.name || 'Sem Planta',
          fields: [
            { name: 'name', label: 'Nome do Local', type: 'text', required: true },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              required: true,
            },
            { name: 'description', label: 'Descrição', type: 'text', required: false },
          ] as FieldDef[],
        }
      case 'funcoes':
        return {
          title: 'Funções',
          subtitle: 'Cadastro e gestão de funções',
          tableName: 'functions',
          icon: Briefcase,
          plantField: '',
          searchFields: ['name', 'description'],
          fields: [
            { name: 'name', label: 'Nome da Função', type: 'text', required: true },
            { name: 'description', label: 'Descrição', type: 'text', required: false },
          ] as FieldDef[],
        }
      case 'colaboradores':
        return {
          title: 'Colaboradores',
          subtitle: 'Cadastro e gestão de colaboradores e empresas terceiras',
          tableName: 'employees',
          icon: Users,
          plantField: 'plant_id',
          searchFields: ['name', 'company_name'],
          groupBy: (item: any) =>
            functions.find((f) => f.id === item.function_id)?.name || 'Sem Função',
          fields: [
            { name: 'name', label: 'Nome', type: 'text', required: true },
            { name: 'company_name', label: 'Empresa Terceira', type: 'text', required: true },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              required: true,
            },
            {
              name: 'location_id',
              label: 'Local',
              type: 'select',
              options: locations.map((l) => ({
                value: l.id,
                label: `${l.name} (${plants.find((p) => p.id === l.plant_id)?.name})`,
              })),
              required: false,
            },
            {
              name: 'function_id',
              label: 'Função',
              type: 'select',
              options: functions.map((f) => ({ value: f.id, label: f.name })),
              required: false,
            },
          ] as FieldDef[],
        }
      case 'equipamentos':
        return {
          title: 'Equipamentos',
          subtitle: 'Cadastro e gestão de equipamentos por planta',
          tableName: 'equipment',
          icon: Wrench,
          plantField: 'plant_id',
          searchFields: ['name', 'type'],
          groupBy: (item: any) => item.type || 'Sem Categoria',
          fields: [
            { name: 'name', label: 'Equipamento', type: 'text', required: true },
            { name: 'type', label: 'Tipo/Categoria', type: 'text', required: true },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              required: true,
            },
            { name: 'quantity', label: 'Quantidade', type: 'number', required: true },
          ] as FieldDef[],
        }
      case 'quadro-contratado':
        return {
          title: 'Quadro Contratado',
          subtitle: 'Gestão de previsão de quadro e equipamentos',
          tableName: 'contracted_headcount',
          icon: FileText,
          plantField: 'plant_id',
          searchFields: ['type', 'quantity'],
          groupBy: (item: any) => (item.type === 'colaborador' ? 'Colaboradores' : 'Equipamentos'),
          fields: [
            {
              name: 'type',
              label: 'Tipo',
              type: 'select',
              options: [
                { value: 'colaborador', label: 'Colaborador' },
                { value: 'equipamento', label: 'Equipamento' },
              ],
              required: true,
            },
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              options: plants.map((p) => ({ value: p.id, label: p.name })),
              required: true,
            },
            {
              name: 'location_id',
              label: 'Local (Se Colaborador)',
              type: 'select',
              options: locations.map((l) => ({
                value: l.id,
                label: `${l.name} (${plants.find((p) => p.id === l.plant_id)?.name})`,
              })),
              required: false,
            },
            {
              name: 'function_id',
              label: 'Função (Se Colaborador)',
              type: 'select',
              options: functions.map((f) => ({ value: f.id, label: f.name })),
              required: false,
            },
            {
              name: 'equipment_id',
              label: 'Equipamento (Se Equipamento)',
              type: 'select',
              options: equipment.map((e) => ({
                value: e.id,
                label: `${e.name} (${plants.find((p) => p.id === e.plant_id)?.name})`,
              })),
              required: false,
            },
            { name: 'quantity', label: 'Quantidade Prevista', type: 'number', required: true },
          ] as FieldDef[],
        }
      case 'book-metas':
        return {
          title: 'Book de Metas',
          subtitle: 'Cadastro de metas e indicadores',
          tableName: 'goals_book',
          icon: Target,
          plantField: '',
          searchFields: ['name', 'description'],
          fields: [
            { name: 'name', label: 'Nome da Meta', type: 'text', required: true },
            { name: 'description', label: 'Descrição', type: 'text', required: false },
            { name: 'is_active', label: 'Ativo?', type: 'toggle', required: false },
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
      if (plants.length > 0) {
        q = q.in(
          'plant_id',
          plants.map((p) => p.id),
        )
      } else {
        return []
      }
    }
    const { data } = await q.order('created_at', { ascending: false })
    return data || []
  }

  const cleanPayloadRelations = (payload: any) => {
    const relationKeys = ['location_id', 'function_id', 'equipment_id', 'plant_id']
    relationKeys.forEach((k) => {
      if (payload[k] === '' || payload[k] === 'none') payload[k] = null
    })

    if (config.tableName === 'contracted_headcount') {
      if (!payload.function_id) payload.function_id = null
      if (!payload.location_id) payload.location_id = null
      if (!payload.equipment_id) payload.equipment_id = null
    }
  }

  const handleAdd = async (data: any) => {
    const payload = { ...data }
    if (config.tableName !== 'locations') payload.client_id = profile.client_id
    cleanPayloadRelations(payload)

    const { error } = await supabase.from(config.tableName).insert([payload])
    if (!error) {
      refetch()
      if (user)
        logAudit(
          profile.client_id as string,
          user.id,
          `Cadastro de ${config.title}`,
          JSON.stringify(payload),
        )
    } else {
      console.error('Insert error:', error)
    }
    return !error
  }

  const handleUpdate = async (id: string, data: any) => {
    const payload = { ...data }
    delete payload.id
    delete payload.created_at
    delete payload.client_id
    cleanPayloadRelations(payload)

    const { error } = await supabase.from(config.tableName).update(payload).eq('id', id)
    if (!error) {
      refetch()
      if (user)
        logAudit(
          profile.client_id as string,
          user.id,
          `Edição de ${config.title}`,
          JSON.stringify(payload),
        )
    } else {
      console.error('Update error:', error)
    }
    return !error
  }

  const handleRemove = (id: string) => {
    if (user && profile.client_id)
      logAudit(profile.client_id, user.id, `Exclusão em ${config.title}`, `Registro ID: ${id}`)
    refetch()
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 pt-6 px-4 sm:px-6 lg:px-8">
      <CrudGeneric
        key={type}
        title={config.title}
        subtitle={config.subtitle}
        tableName={config.tableName}
        icon={config.icon}
        fields={config.fields}
        plantField={config.plantField}
        searchFields={config.searchFields}
        groupBy={config.groupBy}
        plants={plants}
        fetchQuery={fetchQuery}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
      />
    </div>
  )
}
