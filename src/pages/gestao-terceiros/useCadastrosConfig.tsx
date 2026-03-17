import React, { useMemo } from 'react'
import {
  Building2,
  MapPin,
  Wrench,
  ClipboardList,
  Target,
  GraduationCap,
  Building,
} from 'lucide-react'

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
      case 'empresas':
        return {
          title: 'Empresas Parceiras',
          singularName: 'Empresa',
          subtitle: 'Cadastro de prestadores de serviço e terceiros',
          icon: Building,
          tableName: 'companies',
          searchFields: ['name', 'service_type'],
          columns: [
            { header: 'Nome da Empresa', accessor: 'name' },
            { header: 'Tipo de Serviço', accessor: 'service_type' },
          ],
          fields: [
            { name: 'name', label: 'Nome da Empresa', type: 'text' },
            { name: 'service_type', label: 'Tipo de Serviço', type: 'text' },
          ],
        }
      case 'plantas':
        return {
          title: 'Plantas',
          singularName: 'Planta',
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
          singularName: 'Local',
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
            { name: 'name', label: 'Nome do Local', type: 'text' },
            { name: 'plant_id', label: 'Planta', type: 'select', options: plantOptions },
            { name: 'description', label: 'Descrição', type: 'textarea', required: false },
          ],
        }
      case 'equipamentos':
        return {
          title: 'Equipamentos',
          singularName: 'Equipamento',
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
      case 'book-metas':
        return {
          title: 'Book de Metas',
          singularName: 'Meta',
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
            { name: 'description', label: 'Descrição', type: 'textarea', required: false },
            { name: 'is_active', label: 'Ativo', type: 'toggle', required: false },
          ],
        }
      case 'treinamentos':
        return {
          title: 'Catálogo de Treinamentos',
          singularName: 'Treinamento',
          subtitle: 'Gerencie os programas de capacitação e certificações',
          icon: GraduationCap,
          tableName: 'trainings' as any,
          searchFields: ['name', 'description'],
          columns: [
            { header: 'Nome', accessor: 'name' },
            {
              header: 'Validade',
              accessor: 'validity_months',
              render: (item: any) =>
                item.validity_months ? `${item.validity_months} meses` : 'Sem validade',
            },
            {
              header: 'Descrição',
              accessor: 'description',
              render: (item: any) => item.description || '-',
            },
          ],
          fields: [
            { name: 'name', label: 'Nome do Treinamento', type: 'text' },
            { name: 'validity_months', label: 'Validade (meses)', type: 'number', required: false },
            { name: 'description', label: 'Descrição', type: 'textarea', required: false },
          ],
        }
      default:
        return null
    }
  }, [type, plants, locations, functions, equipment])
}
