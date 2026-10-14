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
})
