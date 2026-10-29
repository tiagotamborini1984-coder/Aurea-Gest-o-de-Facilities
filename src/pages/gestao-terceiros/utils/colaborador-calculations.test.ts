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
})
