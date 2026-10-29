import { describe, it, expect } from 'vitest'
import {
  calculateColaboradorReport,
  normalizeDate,
  getPersonDedupeKey,
} from './colaborador-calculations'

describe('colaborador-calculations for Relatórios', () => {
  it('deduplica versões históricas do mesmo colaborador gerando apenas UMA linha', () => {
    const employees = [
      {
        id: 'emp-v1',
        name: 'João da Silva',
        registration_number: 'REG-100',
        plant_id: 'plant-1',
        reference_month: '2026-05-01',
        status: 'Ativo',
        created_at: '2026-05-01T10:00:00Z',
      },
      {
        id: 'emp-v2',
        name: 'João da Silva',
        registration_number: 'REG-100',
        plant_id: 'plant-1',
        reference_month: '2026-06-01',
        status: 'Ativo',
        created_at: '2026-06-01T10:00:00Z',
      },
    ]

    const logs = [
      {
        id: 'l1',
        reference_id: 'emp-v1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-10',
        status: true,
        created_at: '2026-05-10T08:00:00Z',
      },
      {
        id: 'l2',
        reference_id: 'emp-v2',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-06-05',
        status: false,
        created_at: '2026-06-05T08:00:00Z',
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-1', name: 'Planta Alfa' }],
      effectiveSelectedPlants: ['plant-1'],
      matchesCompany: () => true,
      dateFrom: '2026-05-01',
      dateTo: '2026-06-30',
    })

    expect(result).toHaveLength(1)
    expect(result[0].Entidade).toBe('João da Silva')
    expect(result[0].loggedDays).toBe(2)
    expect(result[0].presencasCount).toBe(1)
    expect(result[0]['Total Faltas']).toBe(1)
    expect(result[0]['Média Presenças']).toBeCloseTo(0.5, 4)
    expect(result[0]['Média Faltas']).toBeCloseTo(0.5, 4)
    expect(result[0].absenceDates).toEqual(['2026-06-05'])
  })

  it('dias sem lançamento não contam como ausência (média usa apenas dias registrados)', () => {
    const employees = [
      {
        id: 'emp-1',
        name: 'Maria Souza',
        registration_number: 'REG-200',
        plant_id: 'plant-1',
        reference_month: '2026-05-01',
        status: 'Ativo',
        created_at: '2026-05-01T10:00:00Z',
      },
    ]

    // Período de 10 dias, mas apenas 2 lançamentos salvos (ambos presença)
    const logs = [
      {
        id: 'l1',
        reference_id: 'emp-1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-02',
        status: true,
        created_at: '2026-05-02T08:00:00Z',
      },
      {
        id: 'l2',
        reference_id: 'emp-1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-03',
        status: true,
        created_at: '2026-05-03T08:00:00Z',
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-1', name: 'Planta Alfa' }],
      effectiveSelectedPlants: ['plant-1'],
      matchesCompany: () => true,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-10',
    })

    expect(result).toHaveLength(1)
    // loggedDays = 2, ambos presença -> Média Presença = 1.0 (100%), Faltas = 0
    expect(result[0].loggedDays).toBe(2)
    expect(result[0]['Média Presenças']).toBe(1)
    expect(result[0]['Média Faltas']).toBe(0)
    expect(result[0]['Total Faltas']).toBe(0)
    expect(result[0].absenceDates).toHaveLength(0)
  })

  it('deduplica lançamentos repetidos do mesmo colaborador na mesma data mantendo o mais recente', () => {
    const employees = [
      {
        id: 'emp-1',
        name: 'Carlos Lima',
        plant_id: 'plant-1',
        status: 'Ativo',
      },
    ]

    // Dois logs no mesmo dia: primeiro marcou falta, depois retificou para presença com timestamp posterior
    const logs = [
      {
        id: 'l-old',
        reference_id: 'emp-1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-05',
        status: false,
        created_at: '2026-05-05T08:00:00Z',
      },
      {
        id: 'l-new',
        reference_id: 'emp-1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-05',
        status: true,
        created_at: '2026-05-05T14:30:00Z',
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-1', name: 'Planta Alfa' }],
      effectiveSelectedPlants: ['plant-1'],
      matchesCompany: () => true,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-10',
    })

    expect(result).toHaveLength(1)
    expect(result[0].loggedDays).toBe(1)
    expect(result[0].presencasCount).toBe(1)
    expect(result[0]['Total Faltas']).toBe(0)
    expect(result[0]['Média Presenças']).toBe(1)
    expect(result[0].absenceDates).toEqual([])
  })

  it('filtra rigorosamente por planta vinculada e por empresa', () => {
    const employees = [
      {
        id: 'emp-p1',
        name: 'Ana Silva',
        company_id: 'c1',
        company_name: 'Empresa A',
        plant_id: 'plant-1',
        status: 'Ativo',
      },
      {
        id: 'emp-p2',
        name: 'Beto Rocha',
        company_id: 'c2',
        company_name: 'Empresa B',
        plant_id: 'plant-2',
        status: 'Ativo',
      },
    ]

    const logs = [
      {
        id: 'l1',
        reference_id: 'emp-p1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-02',
        status: true,
      },
      {
        id: 'l2',
        reference_id: 'emp-p2',
        plant_id: 'plant-2',
        type: 'staff',
        date: '2026-05-02',
        status: true,
      },
    ]

    // Filtrar apenas planta-1
    const resultPlant1 = calculateColaboradorReport({
      employees,
      logs,
      plants: [
        { id: 'plant-1', name: 'Planta 1' },
        { id: 'plant-2', name: 'Planta 2' },
      ],
      effectiveSelectedPlants: ['plant-1'],
      matchesCompany: () => true,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-10',
    })

    expect(resultPlant1).toHaveLength(1)
    expect(resultPlant1[0].Entidade).toBe('Ana Silva')

    // Filtrar por empresa B
    const resultCompB = calculateColaboradorReport({
      employees,
      logs,
      plants: [
        { id: 'plant-1', name: 'Planta 1' },
        { id: 'plant-2', name: 'Planta 2' },
      ],
      effectiveSelectedPlants: ['plant-1', 'plant-2'],
      matchesCompany: (cId, cName) => cId === 'c2' || cName === 'Empresa B',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-10',
    })

    expect(resultCompB).toHaveLength(1)
    expect(resultCompB[0].Entidade).toBe('Beto Rocha')
  })

  it('lida com múltiplos lançamentos no mesmo dia vinculados a versões históricas diferentes do colaborador', () => {
    // Caso real: colaborador com 3 versões históricas no banco.
    // Lançamentos foram feitos referenciando IDs diferentes em dias iguais e distintos.
    const employees = [
      {
        id: 'emp-v1',
        name: 'Josias Silva Cerqueira',
        registration_number: 'REG-00158',
        plant_id: 'plant-1',
        reference_month: '2026-04-01',
        status: 'Ativo',
        created_at: '2026-04-01T10:00:00Z',
      },
      {
        id: 'emp-v2',
        name: 'Josias Silva Cerqueira',
        registration_number: 'REG-00158',
        plant_id: 'plant-1',
        reference_month: '2026-05-01',
        status: 'Ativo',
        created_at: '2026-05-01T10:00:00Z',
      },
      {
        id: 'emp-v3',
        name: 'Josias Silva Cerqueira',
        registration_number: 'REG-00158',
        plant_id: 'plant-1',
        reference_month: '2026-06-01',
        status: 'Ativo',
        created_at: '2026-06-01T10:00:00Z',
      },
    ]

    // 2 logs no dia 2026-06-16 (um com emp-v1 e outro com emp-v2)
    // 1 log no dia 2026-06-17 (com emp-v3)
    // Total de dias no período = 10 dias, mas apenas 2 dias com lançamento
    const logs = [
      {
        id: 'log-1',
        reference_id: 'emp-v1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-06-16',
        status: false,
        created_at: '2026-06-16T13:37:25Z',
      },
      {
        id: 'log-2',
        reference_id: 'emp-v2',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-06-16',
        status: true,
        created_at: '2026-06-16T15:16:23Z', // mais recente: retificou para presença
      },
      {
        id: 'log-3',
        reference_id: 'emp-v3',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-06-17',
        status: true,
        created_at: '2026-06-17T09:00:00Z',
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-1', name: 'Planta 1' }],
      effectiveSelectedPlants: ['plant-1'],
      matchesCompany: () => true,
      dateFrom: '2026-06-10',
      dateTo: '2026-06-20',
    })

    expect(result).toHaveLength(1)
    const row = result[0]
    expect(row.Entidade).toBe('Josias Silva Cerqueira')
    // Dias lançados deve ser exatamente 2 (2026-06-16 e 2026-06-17), NÃO 3 logs
    expect(row.loggedDays).toBe(2)
    // No dia 16 venceu o log-2 (status: true)
    expect(row.presencasCount).toBe(2)
    expect(row['Total Faltas']).toBe(0)
    expect(row['Média Presenças']).toBe(1)
    expect(row['Média Faltas']).toBe(0)
    expect(row['Taxa Presença']).toBe(100)
    expect(row.Absenteísmo).toBe(0)
    expect(row.absenceDates).toEqual([])
  })

  it('unifica versão sem matrícula quando uma versão mais recente possui matrícula preenchida', () => {
    const employees = [
      {
        id: 'emp-old',
        name: 'Maria Antonieta',
        registration_number: null, // sem matrícula na versão antiga
        plant_id: 'plant-1',
        reference_month: '2026-01-01',
        status: 'Ativo',
        created_at: '2026-01-01T10:00:00Z',
      },
      {
        id: 'emp-new',
        name: 'Maria Antonieta',
        registration_number: 'REG-999',
        plant_id: 'plant-1',
        reference_month: '2026-05-01',
        status: 'Ativo',
        created_at: '2026-05-01T10:00:00Z',
      },
    ]

    const logs = [
      {
        id: 'l1',
        reference_id: 'emp-old',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-10',
        status: true,
        created_at: '2026-05-10T10:00:00Z',
      },
      {
        id: 'l2',
        reference_id: 'emp-new',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-11',
        status: false,
        created_at: '2026-05-11T10:00:00Z',
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-1', name: 'Planta 1' }],
      effectiveSelectedPlants: ['plant-1'],
      matchesCompany: () => true,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-20',
    })

    expect(result).toHaveLength(1)
    expect(result[0].Entidade).toBe('Maria Antonieta')
    expect(result[0].loggedDays).toBe(2)
    expect(result[0].presencasCount).toBe(1)
    expect(result[0]['Total Faltas']).toBe(1)
    expect(result[0]['Média Presenças']).toBeCloseTo(0.5, 4)
    expect(result[0].absenceDates).toEqual(['2026-05-11'])
  })

  it('garante que dias sem lançamento não inflam faltas nem dias lançados e média é exata', () => {
    const employees = [
      {
        id: 'emp-1',
        name: 'Roberto Carlos',
        plant_id: 'plant-1',
        status: 'Ativo',
      },
    ]

    // Período de 30 dias (2026-05-01 a 2026-05-30), mas o colaborador teve apenas 3 dias com lançamento:
    // 2 dias presença, 1 dia falta
    const logs = [
      {
        id: 'l1',
        reference_id: 'emp-1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-02',
        status: true,
        created_at: '2026-05-02T08:00:00Z',
      },
      {
        id: 'l2',
        reference_id: 'emp-1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-03',
        status: false,
        created_at: '2026-05-03T08:00:00Z',
      },
      {
        id: 'l3',
        reference_id: 'emp-1',
        plant_id: 'plant-1',
        type: 'staff',
        date: '2026-05-04',
        status: true,
        created_at: '2026-05-04T08:00:00Z',
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-1', name: 'Planta Alfa' }],
      effectiveSelectedPlants: ['plant-1'],
      matchesCompany: () => true,
      dateFrom: '2026-05-01',
      dateTo: '2026-05-30',
    })

    expect(result).toHaveLength(1)
    const row = result[0]
    expect(row.loggedDays).toBe(3)
    expect(row.presencasCount).toBe(2)
    expect(row['Total Faltas']).toBe(1)
    // Presenças (2) + Faltas (1) = Dias Lançados (3)
    expect(row.presencasCount + row['Total Faltas']).toBe(row.loggedDays)
    expect(row['Média Presenças']).toBeCloseTo(2 / 3, 4)
    expect(row['Média Faltas']).toBeCloseTo(1 / 3, 4)
    expect(row['Taxa Presença']).toBeCloseTo((2 / 3) * 100, 2)
    expect(row.Absenteísmo).toBeCloseTo((1 / 3) * 100, 2)
    expect(row.absenceDates).toEqual(['2026-05-03'])
  })
})
