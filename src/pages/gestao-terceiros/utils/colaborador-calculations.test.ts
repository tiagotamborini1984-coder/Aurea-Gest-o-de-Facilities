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
    // Nova semântica: Dias Lançados = somatória de dias de presença (1)
    expect(result[0].loggedDays).toBe(1)
    expect(result[0].presencasCount).toBe(1)
    // Total Faltas = somatória de dias de faltas (1)
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
    // loggedDays = 2 presenças -> Média Presença = 1.0 (100%), Faltas = 0
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
    // No dia 16 venceu o log-2 (status: true), no dia 17 log-3 (status: true)
    // Dias Lançados = somatória de dias com presença = 2
    expect(row.loggedDays).toBe(2)
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
    // Dias Lançados = somatória de dias de presença (1 no dia 2026-05-10)
    expect(result[0].loggedDays).toBe(1)
    expect(result[0].presencasCount).toBe(1)
    // Total Faltas = somatória de dias de faltas (1 no dia 2026-05-11)
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
    // 2 dias presença (2026-05-02 e 2026-05-04), 1 dia falta (2026-05-03)
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
    // Nova regra exata do usuário:
    // "Dias Lançados deve ser igual a somatória que o colaborador teve presença no período selecionado" -> 2
    // "Total Faltas deve ser a somatório de dias que o colaborador teve de faltas no período." -> 1
    expect(row.loggedDays).toBe(2)
    expect(row.presencasCount).toBe(2)
    expect(row['Total Faltas']).toBe(1)
    // Total de dias avaliados na média = 2 + 1 = 3 dias registrados
    expect(row['Média Presenças']).toBeCloseTo(2 / 3, 4)
    expect(row['Média Faltas']).toBeCloseTo(1 / 3, 4)
    expect(row['Taxa Presença']).toBeCloseTo((2 / 3) * 100, 2)
    expect(row.Absenteísmo).toBeCloseTo((1 / 3) * 100, 2)
    expect(row.absenceDates).toEqual(['2026-05-03'])
  })

  it('demonstra que apenas dias com presença contam em Dias Lançados e apenas faltas em Total Faltas', () => {
    const employees = [
      {
        id: 'emp-test',
        name: 'Juliana Paes',
        plant_id: 'p1',
        status: 'Ativo',
      },
    ]

    // 5 dias com lançamento: 3 presenças e 2 faltas
    const logs = [
      {
        id: '1',
        reference_id: 'emp-test',
        plant_id: 'p1',
        type: 'staff',
        date: '2026-07-01',
        status: true,
      },
      {
        id: '2',
        reference_id: 'emp-test',
        plant_id: 'p1',
        type: 'staff',
        date: '2026-07-02',
        status: false,
      },
      {
        id: '3',
        reference_id: 'emp-test',
        plant_id: 'p1',
        type: 'staff',
        date: '2026-07-03',
        status: true,
      },
      {
        id: '4',
        reference_id: 'emp-test',
        plant_id: 'p1',
        type: 'staff',
        date: '2026-07-04',
        status: false,
      },
      {
        id: '5',
        reference_id: 'emp-test',
        plant_id: 'p1',
        type: 'staff',
        date: '2026-07-05',
        status: true,
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'p1', name: 'Planta Principal' }],
      effectiveSelectedPlants: ['p1'],
      matchesCompany: () => true,
      dateFrom: '2026-07-01',
      dateTo: '2026-07-10',
    })

    expect(result).toHaveLength(1)
    const row = result[0]
    expect(row.loggedDays).toBe(3) // 3 dias de presença
    expect(row.presencasCount).toBe(3)
    expect(row['Total Faltas']).toBe(2) // 2 dias de falta
    expect(row.absenceDates).toEqual(['2026-07-02', '2026-07-04'])
    expect(row['Média Presenças']).toBeCloseTo(3 / 5, 4)
    expect(row['Média Faltas']).toBeCloseTo(2 / 5, 4)
  })

  it('cenário Sorriso Abraham: consolida todas as 19 presenças e 2 faltas de Abraham em 21 dias lançados no período 01/10 a 29/10/2026', () => {
    // 4 versões históricas de Abraham Jose Marino
    const employees = [
      {
        id: 'emp-abr-1',
        name: 'Abraham Jose Marino',
        registration_number: 'REG-00001',
        plant_id: 'plant-sorriso',
        company_id: 'comp-azul',
        company_name: 'Azul Serviços',
        status: 'Ativo',
        reference_month: '2026-04-01',
        created_at: '2026-05-05T19:35:37.293Z',
      },
      {
        id: 'emp-abr-2',
        name: 'Abraham Jose Marino',
        registration_number: 'REG-00001',
        plant_id: 'plant-sorriso',
        company_id: 'comp-azul',
        company_name: 'Azul Serviços',
        status: 'Ativo',
        reference_month: '2026-05-01',
        created_at: '2026-03-16T18:03:39.898Z',
      },
      {
        id: 'emp-abr-3',
        name: 'Abraham Jose Marino',
        registration_number: 'REG-00001',
        plant_id: 'plant-sorriso',
        company_id: 'comp-azul',
        company_name: 'Azul Serviços',
        status: 'Ativo',
        reference_month: '2026-06-01',
        created_at: '2026-06-01T13:01:05.603Z',
      },
      {
        id: 'emp-abr-4',
        name: 'Abraham Jose Marino',
        registration_number: 'REG-00001',
        plant_id: 'plant-sorriso',
        company_id: 'comp-azul',
        company_name: 'Azul Serviços',
        status: 'Ativo',
        reference_month: '2026-07-01',
        created_at: '2026-07-01T12:53:55.027Z',
      },
    ]

    // 21 dias de lançamentos em outubro de 2026 (19 presenças e 2 faltas nos dias 01 e 29)
    const dates = [
      { date: '2026-10-01', status: false },
      { date: '2026-10-03', status: true },
      { date: '2026-10-05', status: true },
      { date: '2026-10-06', status: true },
      { date: '2026-10-09', status: true },
      { date: '2026-10-10', status: true },
      { date: '2026-10-13', status: true },
      { date: '2026-10-14', status: true },
      { date: '2026-10-15', status: true },
      { date: '2026-10-16', status: true },
      { date: '2026-10-17', status: true },
      { date: '2026-10-19', status: true },
      { date: '2026-10-20', status: true },
      { date: '2026-10-21', status: true },
      { date: '2026-10-22', status: true },
      { date: '2026-10-23', status: true },
      { date: '2026-10-24', status: true },
      { date: '2026-10-26', status: true },
      { date: '2026-10-27', status: true },
      { date: '2026-10-28', status: true },
      { date: '2026-10-29', status: false },
    ]

    const logs = dates.map((d, index) => ({
      id: `log-abr-${index}`,
      reference_id: 'emp-abr-4',
      plant_id: 'plant-sorriso',
      type: 'staff',
      date: d.date,
      status: d.status,
      created_at: `${d.date}T14:00:00Z`,
    }))

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-sorriso', name: 'SMT - SORRISO' }],
      effectiveSelectedPlants: ['plant-sorriso'],
      matchesCompany: () => true,
      dateFrom: '2026-10-01',
      dateTo: '2026-10-29',
    })

    expect(result).toHaveLength(1)
    const abraham = result[0]
    expect(abraham.Entidade).toBe('Abraham Jose Marino')
    expect(abraham.plantId).toBe('plant-sorriso')
    expect(abraham.plantName).toBe('SMT - SORRISO')
    // Dias Lançados deve ser exatamente 19 (presenças) e NÃO 2
    expect(abraham.loggedDays).toBe(19)
    expect(abraham.presencasCount).toBe(19)
    expect(abraham['Total Faltas']).toBe(2)
    // Presenças + Faltas = 19 + 2 = 21 dias registrados
    expect(abraham.loggedDays + abraham['Total Faltas']).toBe(21)
    expect(abraham['Média Presenças']).toBeCloseTo(19 / 21, 4)
    expect(abraham['Média Faltas']).toBeCloseTo(2 / 21, 4)
    expect(abraham['Taxa Presença']).toBeCloseTo((19 / 21) * 100, 2)
    expect(abraham.Absenteísmo).toBeCloseTo((2 / 21) * 100, 2)
    expect(abraham.absenceDates).toEqual(['2026-10-01', '2026-10-29'])
  })

  it('desempate no mesmo dia: retificação de falta para presença no mesmo dia prevalece pelo timestamp mais recente', () => {
    const employees = [
      {
        id: 'emp-retif',
        name: 'Carlos Retificado',
        registration_number: 'REG-9900',
        plant_id: 'plant-sorriso',
        status: 'Ativo',
      },
    ]

    const logs = [
      {
        id: 'log-old-falta',
        reference_id: 'emp-retif',
        plant_id: 'plant-sorriso',
        type: 'staff',
        date: '2026-10-15',
        status: false,
        created_at: '2026-10-15T08:00:00.000Z',
      },
      {
        id: 'log-new-presenca',
        reference_id: 'emp-retif',
        plant_id: 'plant-sorriso',
        type: 'staff',
        date: '2026-10-15',
        status: true,
        created_at: '2026-10-15T16:30:00.000Z',
      },
    ]

    const result = calculateColaboradorReport({
      employees,
      logs,
      plants: [{ id: 'plant-sorriso', name: 'SMT - SORRISO' }],
      effectiveSelectedPlants: ['plant-sorriso'],
      matchesCompany: () => true,
      dateFrom: '2026-10-01',
      dateTo: '2026-10-29',
    })

    expect(result).toHaveLength(1)
    expect(result[0].loggedDays).toBe(1)
    expect(result[0].presencasCount).toBe(1)
    expect(result[0]['Total Faltas']).toBe(0)
    expect(result[0]['Média Presenças']).toBe(1)
    expect(result[0].absenceDates).toEqual([])
  })
})
