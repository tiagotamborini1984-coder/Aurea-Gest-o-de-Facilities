import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCargoCalculations } from './useCargoCalculations'

describe('useCargoCalculations - Filtro de Empresa e Cargos Vinculados', () => {
  const plants = [
    { id: 'plant-1', name: 'Planta Sorriso' },
    { id: 'plant-2', name: 'Planta Sinop' },
  ]

  const companies = [
    { id: 'comp-alpha', name: 'Prestadora Alpha' },
    { id: 'comp-beta', name: 'Prestadora Beta' },
  ]

  const functions = [
    { id: 'cargo-cozinheiro', name: 'Cozinheiro' },
    { id: 'cargo-auxiliar', name: 'Auxiliar de Limpeza' },
    { id: 'cargo-porteiro', name: 'Porteiro' },
    { id: 'cargo-jardineiro', name: 'Jardineiro' },
  ]

  // Alpha tem Cozinheiro e Auxiliar de Limpeza
  // Beta tem Porteiro
  // Jardineiro só tem quadro contratado em Beta
  const employees = [
    {
      id: 'emp-1',
      name: 'João Cozinheiro',
      function_id: 'cargo-cozinheiro',
      company_id: 'comp-alpha',
      company_name: 'Prestadora Alpha',
      plant_id: 'plant-1',
      reference_month: '2026-10-01',
      status: 'Ativo',
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'emp-2',
      name: 'Maria Auxiliar',
      function_id: 'cargo-auxiliar',
      company_id: 'comp-alpha',
      company_name: 'Prestadora Alpha',
      plant_id: 'plant-2',
      reference_month: '2026-10-01',
      status: 'Ativo',
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'emp-3',
      name: 'Pedro Porteiro',
      function_id: 'cargo-porteiro',
      company_id: 'comp-beta',
      company_name: 'Prestadora Beta',
      plant_id: 'plant-1',
      reference_month: '2026-10-01',
      status: 'Ativo',
      created_at: '2026-10-01T10:00:00Z',
    },
  ]

  const contracted = [
    {
      id: 'cont-1',
      function_id: 'cargo-cozinheiro',
      company_id: 'comp-alpha',
      plant_id: 'plant-1',
      type: 'colaborador',
      reference_month: '2026-10-01',
      quantity: 2,
    },
    {
      id: 'cont-2',
      function_id: 'cargo-jardineiro',
      company_id: 'comp-beta',
      plant_id: 'plant-1',
      type: 'colaborador',
      reference_month: '2026-10-01',
      quantity: 1,
    },
  ]

  it('Critério 1: Selecionando uma empresa no filtro, lista somente os cargos vinculados a ela', () => {
    // Filtrando Prestadora Alpha
    const { result } = renderHook(() =>
      useCargoCalculations({
        employees,
        contracted,
        functions,
        plants,
        companies,
        selectedPlants: [],
        selectedFunctionId: 'all',
        selectedCompanies: ['Prestadora Alpha'],
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
      }),
    )

    const cargoNames = result.current.cargos.map((c) => c.functionName)
    // Cozinheiro e Auxiliar de Limpeza pertencem a Alpha
    expect(cargoNames).toContain('Cozinheiro')
    expect(cargoNames).toContain('Auxiliar de Limpeza')
    // Porteiro e Jardineiro (Beta) NÃO devem aparecer
    expect(cargoNames).not.toContain('Porteiro')
    expect(cargoNames).not.toContain('Jardineiro')
  })

  it('Critério 2: Com empresa + planta selecionadas, só aparecem cargos vinculados àquela empresa naquela planta', () => {
    // Filtrando Prestadora Alpha + Planta Sorriso (plant-1)
    const { result } = renderHook(() =>
      useCargoCalculations({
        employees,
        contracted,
        functions,
        plants,
        companies,
        selectedPlants: ['plant-1'],
        selectedFunctionId: 'all',
        selectedCompanies: ['Prestadora Alpha'],
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
      }),
    )

    const cargoNames = result.current.cargos.map((c) => c.functionName)
    // Na plant-1, Alpha só tem Cozinheiro (Auxiliar está na plant-2)
    expect(cargoNames).toEqual(['Cozinheiro'])
  })

  it('Critério 3: Sem empresa selecionada, a lista continua mostrando todos os cargos com dados', () => {
    // Nenhuma empresa selecionada
    const { result } = renderHook(() =>
      useCargoCalculations({
        employees,
        contracted,
        functions,
        plants,
        companies,
        selectedPlants: [],
        selectedFunctionId: 'all',
        selectedCompanies: [],
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
      }),
    )

    const cargoNames = result.current.cargos.map((c) => c.functionName)
    // Todos os 4 cargos têm dados (colaboradores ou quadro)
    expect(cargoNames).toContain('Cozinheiro')
    expect(cargoNames).toContain('Auxiliar de Limpeza')
    expect(cargoNames).toContain('Porteiro')
    expect(cargoNames).toContain('Jardineiro')
  })

  it('Critério 4: Os números do resumo e totais batem com os cargos filtrados', () => {
    // Filtrando Prestadora Beta
    const { result } = renderHook(() =>
      useCargoCalculations({
        employees,
        contracted,
        functions,
        plants,
        companies,
        selectedPlants: [],
        selectedFunctionId: 'all',
        selectedCompanies: ['Prestadora Beta'],
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
      }),
    )

    // Beta tem Porteiro (1 ativo, 0 ideal) e Jardineiro (0 ativos, 1 ideal => deficit 1)
    expect(result.current.totals.totalCargosAnalisados).toBe(2)
    expect(result.current.totals.totalDeficitAtual).toBe(1)
    expect(result.current.totals.cargosAbaixoAtualmente).toBe(1)
  })
})
