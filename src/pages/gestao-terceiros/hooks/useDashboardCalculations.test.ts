import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardCalculations } from './useDashboardCalculations'

describe('useDashboardCalculations - Ausentes e Colaboradores Inativos', () => {
  const plants = [{ id: 'plant-1', name: 'SMT - SORRISO' }]
  const locations = [{ id: 'loc-1', name: 'Escritório', plant_id: 'plant-1' }]

  it('exclui do card de ausentes e dos detalhes colaborador com versão vigente Inativo', () => {
    // Beatriz Silva Santana:
    // Versão recente (2026-10-01): Inativo
    // Versão anterior (2026-09-01): Ativo
    // Um log de ausência (status=false) vinculado ao ID da versão de 09/2026 em 2026-10-13
    const employees = [
      {
        id: 'beatriz-v2-inativo',
        name: 'Beatriz Silva Santana',
        registration_number: 'REG-001',
        plant_id: 'plant-1',
        reference_month: '2026-10-01',
        status: 'Inativo',
        created_at: '2026-10-01T19:50:00Z',
      },
      {
        id: 'beatriz-v1-ativo',
        name: 'Beatriz Silva Santana',
        registration_number: 'REG-001',
        plant_id: 'plant-1',
        reference_month: '2026-09-01',
        status: 'Ativo',
        created_at: '2026-09-01T12:00:00Z',
      },
      // Colaborador que permanece Ativo
      {
        id: 'carlos-v1-ativo',
        name: 'Carlos Oliveira',
        registration_number: 'REG-002',
        plant_id: 'plant-1',
        reference_month: '2026-10-01',
        status: 'Ativo',
        created_at: '2026-10-01T10:00:00Z',
      },
    ]

    const logs = [
      // Log de ausência da Beatriz (referenciando a ID antiga ou qualquer versão)
      {
        id: 'log-1',
        plant_id: 'plant-1',
        type: 'staff',
        reference_id: 'beatriz-v1-ativo',
        status: false,
        date: '2026-10-13',
      },
      // Log de ausência de Carlos (que está Ativo vigente)
      {
        id: 'log-2',
        plant_id: 'plant-1',
        type: 'staff',
        reference_id: 'carlos-v1-ativo',
        status: false,
        date: '2026-10-13',
      },
    ]

    const contracted = [
      {
        plant_id: 'plant-1',
        type: 'colaborador',
        reference_month: '2026-10-01',
        quantity: 2,
      },
    ]

    const { result } = renderHook(() =>
      useDashboardCalculations(
        logs,
        [],
        contracted,
        plants,
        locations,
        employees,
        [],
        [],
        ['plant-1'],
        [],
        'colaboradores',
        '2026-10-01',
        '2026-10-14',
      ),
    )

    // Apenas Carlos deve constar como ausente em 2026-10-13!
    // Beatriz foi inativada na versão mais recente, então NÃO entra no card nem no Ver Detalhes.
    const periodAbsents = result.current.metrics.periodAbsentsList
    expect(periodAbsents).toHaveLength(1)
    expect(periodAbsents[0].refName).toBe('Carlos Oliveira')

    // Média de ausentes bate com 1 ocorrência / 1 dia com logs = 1
    expect(result.current.metrics.ausente).toBe('1')

    // Na dailyTrend para 2026-10-13
    const dayTrend = result.current.dailyTrend.find((d) => d.date === '2026-10-13')
    expect(dayTrend).toBeDefined()
    expect(dayTrend?.ausentes).toBe(1)
  })

  it('desempate no MESMO mês de referência escolhe a versão com created_at DESC (a mais recente)', () => {
    // Elizangela com 2 versões em 2026-07-01:
    // Criada 2026-07-09: Ativo
    // Criada 2026-07-01: Inativo
    // O desempate deve escolher Ativo (created_at mais recente)
    const employees1 = [
      {
        id: 'eliza-1',
        name: 'Elizangela Ferreira',
        registration_number: 'REG-86',
        plant_id: 'plant-1',
        reference_month: '2026-07-01',
        status: 'Inativo',
        created_at: '2026-07-01T12:00:00Z',
      },
      {
        id: 'eliza-2',
        name: 'Elizangela Ferreira',
        registration_number: 'REG-86',
        plant_id: 'plant-1',
        reference_month: '2026-07-01',
        status: 'Ativo',
        created_at: '2026-07-09T19:54:00Z',
      },
    ]

    const logs1 = [
      {
        id: 'log-e1',
        plant_id: 'plant-1',
        type: 'staff',
        reference_id: 'eliza-1',
        status: false,
        date: '2026-07-10',
      },
    ]

    const { result: res1 } = renderHook(() =>
      useDashboardCalculations(
        logs1,
        [],
        [],
        plants,
        locations,
        employees1,
        [],
        [],
        ['plant-1'],
        [],
        'colaboradores',
        '2026-07-01',
        '2026-07-15',
      ),
    )

    // Como a mais recente é Ativo, ela aparece nos ausentes
    expect(res1.current.metrics.periodAbsentsList).toHaveLength(1)

    // Agora o caso inverso: criada depois sendo Inativo
    const employees2 = [
      {
        id: 'eliza-1',
        name: 'Elizangela Ferreira',
        registration_number: 'REG-86',
        plant_id: 'plant-1',
        reference_month: '2026-07-01',
        status: 'Ativo',
        created_at: '2026-07-01T12:00:00Z',
      },
      {
        id: 'eliza-2',
        name: 'Elizangela Ferreira',
        registration_number: 'REG-86',
        plant_id: 'plant-1',
        reference_month: '2026-07-01',
        status: 'Inativo',
        created_at: '2026-07-09T19:54:00Z',
      },
    ]

    const { result: res2 } = renderHook(() =>
      useDashboardCalculations(
        logs1,
        [],
        [],
        plants,
        locations,
        employees2,
        [],
        [],
        ['plant-1'],
        [],
        'colaboradores',
        '2026-07-01',
        '2026-07-15',
      ),
    )

    // Como a mais recente é Inativo, NÃO aparece nos ausentes
    expect(res2.current.metrics.periodAbsentsList).toHaveLength(0)
    expect(res2.current.metrics.ausente).toBe('0')
  })

  it('cálculo por equipamento: deduplica registros no mesmo dia, vincula à planta e não conta dia sem lançamento como falta', () => {
    const equip = [
      {
        id: 'trator-1',
        name: 'Trator CBT 8440',
        plant_id: 'plant-1',
        quantity: 1,
        status: 'ativo',
      },
      {
        id: 'escavadeira-2',
        name: 'Escavadeira CAT 320',
        plant_id: 'plant-2',
        quantity: 1,
        status: 'ativo',
      },
    ]

    // Logs contendo:
    // - trator-1 em 2026-10-10 duplicado (2 logs no mesmo dia, o mais recente true)
    // - trator-1 em 2026-10-11 status false (falta real/indisponível)
    // - escavadeira-2 em plant-1 (equipamento pertence a plant-2, log com plant_id errado não deve contar para plant-1)
    const eqLogs = [
      {
        id: 'log-eq-dup1',
        plant_id: 'plant-1',
        type: 'equipment',
        reference_id: 'trator-1',
        status: false,
        date: '2026-10-10',
        created_at: '2026-10-10T08:00:00Z',
      },
      {
        id: 'log-eq-dup2',
        plant_id: 'plant-1',
        type: 'equipment',
        reference_id: 'trator-1',
        status: true,
        date: '2026-10-10',
        created_at: '2026-10-10T09:00:00Z',
      },
      {
        id: 'log-eq-2',
        plant_id: 'plant-1',
        type: 'equipment',
        reference_id: 'trator-1',
        status: false,
        date: '2026-10-11',
        created_at: '2026-10-11T08:00:00Z',
      },
      {
        id: 'log-eq-wrong-plant',
        plant_id: 'plant-1',
        type: 'equipment',
        reference_id: 'escavadeira-2',
        status: true,
        date: '2026-10-10',
        created_at: '2026-10-10T08:00:00Z',
      },
    ]

    const { result } = renderHook(() =>
      useDashboardCalculations(
        eqLogs,
        [],
        [],
        plants,
        locations,
        [],
        equip,
        [],
        ['plant-1'],
        [],
        'equipamentos',
        '2026-10-01',
        '2026-10-31',
      ),
    )

    // equipmentStats deve ter apenas o trator-1 (pois plant-1 foi selecionada)
    const stats = result.current.equipmentStats
    expect(stats).toHaveLength(1)
    const tratorStats = stats.find((s: any) => s.id === 'trator-1')
    expect(tratorStats).toBeDefined()

    // O trator teve 2 dias de registro (2026-10-10: disponível após dedup, 2026-10-11: indisponível)
    // Dias sem registro no mês (de 1 a 9, e 12 a 31) NÃO devem inflar faltas.
    expect(tratorStats?.mediaPresenca).toBe(0.5) // 1 dia presente em 2 dias registrados = 0.5
    expect(tratorStats?.mediaFalta).toBe(0.5) // 1 dia falta em 2 dias registrados = 0.5
    expect(tratorStats?.taxaDisp).toBe(50) // 50% de disponibilidade
  })

  it('reprodução de outubro/2026: presentes deve ser compatível com a média contratada quando logs completos forem fornecidos', () => {
    // Simula uma planta com 200 contratados
    const plantsOct = [{ id: 'plant-oct', name: 'Planta Oct' }]
    const contractedOct = [
      {
        plant_id: 'plant-oct',
        type: 'colaborador',
        reference_month: '2026-10-01',
        quantity: 200,
      },
    ]

    // Simula 20 colaboradores com logs diários em 2 dias úteis
    const employeesOct: any[] = []
    const logsOct: any[] = []

    for (let i = 1; i <= 200; i++) {
      const empId = `emp-${i}`
      employeesOct.push({
        id: empId,
        name: `Colaborador ${i}`,
        registration_number: `REG-${i}`,
        plant_id: 'plant-oct',
        reference_month: '2026-10-01',
        status: 'Ativo',
        created_at: '2026-10-01T00:00:00Z',
      })

      // Dia 1: 195 presentes, 5 faltas
      logsOct.push({
        id: `log-d1-${i}`,
        plant_id: 'plant-oct',
        type: 'staff',
        reference_id: empId,
        status: i <= 195,
        date: '2026-10-01',
        created_at: '2026-10-01T08:00:00Z',
      })

      // Dia 2: 197 presentes, 3 faltas
      logsOct.push({
        id: `log-d2-${i}`,
        plant_id: 'plant-oct',
        type: 'staff',
        reference_id: empId,
        status: i <= 197,
        date: '2026-10-02',
        created_at: '2026-10-02T08:00:00Z',
      })
    }

    const { result } = renderHook(() =>
      useDashboardCalculations(
        logsOct,
        [],
        contractedOct,
        plantsOct,
        [],
        employeesOct,
        [],
        [],
        ['plant-oct'],
        [],
        'colaboradores',
        '2026-10-01',
        '2026-10-31',
      ),
    )

    // Contratado = 200
    expect(result.current.metrics.contratado).toBe('200')
    // Média de presentes: (195 + 197) / 2 = 196
    expect(result.current.metrics.presente).toBe('196')
    // Não pode haver abismo entre contratado e presentes
    const presNum = parseFloat(result.current.metrics.presente)
    const contNum = parseFloat(result.current.metrics.contratado)
    expect(presNum).toBeGreaterThan(150)
    expect(Math.abs(contNum - presNum)).toBeLessThan(10)
  })

  it('deduplicação de lançamentos no mesmo dia preserva o created_at mais recente (timestamp ISO)', () => {
    const plantsTest = [{ id: 'p1', name: 'Planta 1' }]
    const contracted = [
      {
        plant_id: 'p1',
        type: 'colaborador',
        reference_month: '2026-10-01',
        quantity: 1,
      },
    ]
    const employees = [
      {
        id: 'e1',
        name: 'João Silva',
        plant_id: 'p1',
        reference_month: '2026-10-01',
        status: 'Ativo',
        created_at: '2026-10-01T00:00:00Z',
      },
    ]

    // Primeiro lançamento do dia foi falta (status: false), mas retificado 1h depois como presente (status: true)
    const logs = [
      {
        id: 'log-1',
        plant_id: 'p1',
        type: 'staff',
        reference_id: 'e1',
        status: false,
        date: '2026-10-05',
        created_at: '2026-10-05T08:00:00Z',
      },
      {
        id: 'log-2',
        plant_id: 'p1',
        type: 'staff',
        reference_id: 'e1',
        status: true,
        date: '2026-10-05',
        created_at: '2026-10-05T09:00:00Z',
      },
    ]

    const { result } = renderHook(() =>
      useDashboardCalculations(
        logs,
        [],
        contracted,
        plantsTest,
        [],
        employees,
        [],
        [],
        ['p1'],
        [],
        'colaboradores',
        '2026-10-01',
        '2026-10-31',
      ),
    )

    // A versão mais recente (status: true) deve prevalecer!
    expect(result.current.metrics.presente).toBe('1')
    expect(result.current.metrics.ausente).toBe('0')
  })
})
