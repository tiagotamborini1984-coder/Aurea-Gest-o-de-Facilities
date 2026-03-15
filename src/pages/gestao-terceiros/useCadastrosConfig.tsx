import React, { useMemo } from 'react'
import { Building2, MapPin, Briefcase, Users, Wrench, ClipboardList, Target } from 'lucide-react'

export function useCadastrosConfig(
  type: string | undefined,
  plants: any[],
  locations: any[],
  functions: any[],
  equipment: any[],
) {
  return useMemo(() => {
    if (!type) return null

    const plantOptions = plants.map((p) => ({ value: p.id, label: p.name }))
    const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }))
    const functionOptions = functions.map((f) => ({ value: f.id, label: f.name }))
    const equipmentOptions = equipment.map((e) => ({ value: e.id, label: e.name }))

    switch (type) {
      case 'plantas':
        return {
          title: 'Plantas',
          subtitle: 'Unidades de operação e fábricas',
          icon: Building2,
          tableName: 'plants',
          searchFields: ['name', 'code', 'city'],
          columns: [
            { header: 'Nome', accessor: 'name' },
            { header: 'Código', accessor: 'code' },
            { header: 'Cidade', accessor: 'city' },
          ],
          fields: [
            { name: 'name', label: 'Nome da Planta', type: 'text' },
            { name: 'code', label: 'Código', type: 'text' },
            { name: 'city', label: 'Cidade', type: 'text' },
          ],
        }
      case 'locais':
        return {
          title: 'Locais',
          subtitle: 'Setores ou áreas dentro das plantas',
          icon: MapPin,
          tableName: 'locations',
          plantField: 'plant_id',
          searchFields: ['name', 'description'],
          columns: [
            { header: 'Nome', accessor: 'name' },
            {
              header: 'Descrição',
              accessor: 'description',
              render: (item: any) => item.description || '-',
            },
            {
              header: 'Planta',
              accessor: 'plant_id',
              render: (item: any) => plants.find((p) => p.id === item.plant_id)?.name || '-',
            },
          ],
          fields: [
            { name: 'plant_id', label: 'Planta', type: 'select', options: plantOptions },
            { name: 'name', label: 'Nome do Local', type: 'text' },
            { name: 'description', label: 'Descrição', type: 'text', required: false },
          ],
        }
      case 'funcoes':
        return {
          title: 'Funções',
          subtitle: 'Cargos e funções dos colaboradores',
          icon: Briefcase,
          tableName: 'functions',
          searchFields: ['name', 'description'],
          columns: [
            { header: 'Nome', accessor: 'name' },
            {
              header: 'Descrição',
              accessor: 'description',
              render: (item: any) => item.description || '-',
            },
          ],
          fields: [
            { name: 'name', label: 'Nome da Função', type: 'text' },
            { name: 'description', label: 'Descrição', type: 'text', required: false },
          ],
        }
      case 'colaboradores':
        return {
          title: 'Colaboradores',
          subtitle: 'Quadro de funcionários terceirizados',
          icon: Users,
          tableName: 'employees',
          plantField: 'plant_id',
          searchFields: ['name', 'company_name'],
          columns: [
            { header: 'Nome', accessor: 'name' },
            { header: 'Empresa', accessor: 'company_name' },
            {
              header: 'Planta',
              accessor: 'plant_id',
              render: (item: any) => plants.find((p) => p.id === item.plant_id)?.name || '-',
            },
            {
              header: 'Local',
              accessor: 'location_id',
              render: (item: any) => locations.find((l) => l.id === item.location_id)?.name || '-',
            },
            {
              header: 'Função',
              accessor: 'function_id',
              render: (item: any) => functions.find((f) => f.id === item.function_id)?.name || '-',
            },
          ],
          fields: [
            { name: 'name', label: 'Nome Completo', type: 'text' },
            { name: 'company_name', label: 'Empresa', type: 'text' },
            { name: 'plant_id', label: 'Planta', type: 'select', options: plantOptions },
            {
              name: 'location_id',
              label: 'Local',
              type: 'select',
              options: locationOptions,
              required: false,
            },
            {
              name: 'function_id',
              label: 'Função',
              type: 'select',
              options: functionOptions,
              required: false,
            },
          ],
        }
      case 'equipamentos':
        return {
          title: 'Equipamentos',
          subtitle: 'Maquinário e equipamentos alocados',
          icon: Wrench,
          tableName: 'equipment',
          plantField: 'plant_id',
          searchFields: ['name', 'type'],
          columns: [
            { header: 'Nome / ID', accessor: 'name' },
            { header: 'Tipo', accessor: 'type' },
            { header: 'Qtd.', accessor: 'quantity' },
            {
              header: 'Planta',
              accessor: 'plant_id',
              render: (item: any) => plants.find((p) => p.id === item.plant_id)?.name || '-',
            },
          ],
          fields: [
            { name: 'name', label: 'Nome / Identificação', type: 'text' },
            { name: 'type', label: 'Tipo / Categoria', type: 'text' },
            { name: 'quantity', label: 'Quantidade', type: 'number' },
            { name: 'plant_id', label: 'Planta', type: 'select', options: plantOptions },
          ],
        }
      case 'quadro-contratado':
        return {
          title: 'Quadro Contratado',
          subtitle: 'Dimensionamento do contrato (Headcount e Equipamentos)',
          icon: ClipboardList,
          tableName: 'contracted_headcount',
          plantField: 'plant_id',
          searchFields: ['type'],
          columns: [
            {
              header: 'Tipo',
              accessor: 'type',
              render: (item: any) => (
                <span
                  className={`capitalize font-medium px-2 py-0.5 rounded text-xs ${item.type === 'colaborador' ? 'bg-brand-deepBlue text-white' : 'bg-slate-200 text-slate-800'}`}
                >
                  {item.type}
                </span>
              ),
            },
            {
              header: 'Planta',
              accessor: 'plant_id',
              render: (item: any) => plants.find((p) => p.id === item.plant_id)?.name || '-',
            },
            {
              header: 'Local',
              accessor: 'location_id',
              render: (item: any) => locations.find((l) => l.id === item.location_id)?.name || '-',
            },
            {
              header: 'Função',
              accessor: 'function_id',
              render: (item: any) => functions.find((f) => f.id === item.function_id)?.name || '-',
            },
            {
              header: 'Equipamento',
              accessor: 'equipment_id',
              render: (item: any) => equipment.find((e) => e.id === item.equipment_id)?.name || '-',
            },
            {
              header: 'Qtd.',
              accessor: 'quantity',
              render: (item: any) => <span className="font-bold">{item.quantity}</span>,
            },
          ],
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
            { name: 'plant_id', label: 'Planta', type: 'select', options: plantOptions },
            {
              name: 'location_id',
              label: 'Local (Colaborador)',
              type: 'select',
              options: locationOptions,
              required: false,
              hidden: (form: any) => form.type === 'colaborador', // Hidden for colaborador as per requirement
            },
            {
              name: 'function_id',
              label: 'Função (Colaborador)',
              type: 'select',
              options: functionOptions,
              required: false,
              hidden: (form: any) => form.type === 'equipamento',
            },
            {
              name: 'equipment_id',
              label: 'Equipamento (Apenas p/ Equip.)',
              type: 'select',
              options: equipmentOptions,
              required: false,
              hidden: (form: any) => form.type === 'colaborador',
            },
            { name: 'quantity', label: 'Quantidade', type: 'number' },
          ],
        }
      case 'book-metas':
        return {
          title: 'Book de Metas',
          subtitle: 'Indicadores e metas mensais',
          icon: Target,
          tableName: 'goals_book',
          searchFields: ['name'],
          columns: [
            { header: 'Nome da Meta', accessor: 'name' },
            {
              header: 'Descrição',
              accessor: 'description',
              render: (item: any) => item.description || '-',
            },
            {
              header: 'Status',
              accessor: 'is_active',
              render: (item: any) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {item.is_active ? 'Ativo' : 'Inativo'}
                </span>
              ),
            },
          ],
          fields: [
            { name: 'name', label: 'Nome da Meta', type: 'text' },
            { name: 'description', label: 'Descrição', type: 'text', required: false },
            { name: 'is_active', label: 'Ativo', type: 'toggle', required: false },
          ],
        }
      default:
        return null
    }
  }, [type, plants, locations, functions, equipment])
}
