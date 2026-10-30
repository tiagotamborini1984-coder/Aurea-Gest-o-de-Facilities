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

  it('Critério 5: Caso concreto Auxiliar de Limpeza Industrial — mantém quadro ativo cumulativo quando não há reenvio no mês', () => {
    // Simulação do caso reportado pelo Tiago:
    // O cargo "Auxiliar de Limpeza Industrial" possui múltiplos colaboradores ativos cadastrados em meses anteriores
    // (ex: Agosto ou Setembro), mas no mês de Outubro apenas 1 teve importação/registro explícito no próprio mês.
    // O Efetivo Atual de Outubro DEVE considerar todos os colaboradores ativos vigentes (não apenas o 1 reimportado).
    const funcLimpeza = { id: 'func-limpeza-ind', name: 'Auxiliar de Limpeza Industrial' }
    const localFunctions = [...functions, funcLimpeza]

    const plantMatriz = 'plant-1'

    const testEmployees = [
      // 5 colaboradores ativos registrados em 2026-08 (Agosto)
      {
        id: 'emp-limp-1',
        name: 'Abraham Jose',
        registration_number: 'ALI-001',
        function_id: funcLimpeza.id,
        plant_id: plantMatriz,
        status: 'ATIVO',
        reference_month: '2026-08-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-08-05T10:00:00Z',
      },
      {
        id: 'emp-limp-2',
        name: 'Alcineia Santos',
        registration_number: 'ALI-002',
        function_id: funcLimpeza.id,
        plant_id: plantMatriz,
        status: 'ATIVO',
        reference_month: '2026-08-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-08-05T10:00:00Z',
      },
      {
        id: 'emp-limp-3',
        name: 'Ateones Pereira',
        registration_number: 'ALI-003',
        function_id: funcLimpeza.id,
        plant_id: plantMatriz,
        status: 'ATIVO',
        reference_month: '2026-08-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-08-05T10:00:00Z',
      },
      {
        id: 'emp-limp-4',
        name: 'Dorikeles Silva',
        registration_number: 'ALI-004',
        function_id: funcLimpeza.id,
        plant_id: plantMatriz,
        status: 'ATIVO',
        reference_month: '2026-08-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-08-05T10:00:00Z',
      },
      // Em 2026-10 (Outubro), apenas Gleidson foi lançado com reference_month = 2026-10
      {
        id: 'emp-limp-5',
        name: 'Gleidson Oliveira',
        registration_number: 'ALI-005',
        function_id: funcLimpeza.id,
        plant_id: plantMatriz,
        status: 'ATIVO',
        reference_month: '2026-10-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-10-02T10:00:00Z',
      },
      // E um colaborador de outro cargo que foi desligado
      {
        id: 'emp-limp-6',
        name: 'Marcos Ex',
        registration_number: 'ALI-006',
        function_id: funcLimpeza.id,
        plant_id: plantMatriz,
        status: 'INATIVO',
        reference_month: '2026-09-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-09-10T10:00:00Z',
      },
    ]

    const { result } = renderHook(() =>
      useCargoCalculations({
        employees: testEmployees,
        contracted: [],
        functions: localFunctions,
        plants,
        companies,
        selectedPlants: [plantMatriz],
        selectedFunctionId: funcLimpeza.id,
        selectedCompanies: [],
        dateFrom: '2026-08-01',
        dateTo: '2026-10-31',
      }),
    )

    const cargoLimpeza = result.current.cargos.find((c) => c.functionId === funcLimpeza.id)
    expect(cargoLimpeza).toBeDefined()

    // O efetivo atual (em Outubro de 2026) NÃO pode ser apenas 1.
    // Deve ser 5 (os 4 cadastrados em Agosto que continuam ativos + 1 admitido em Outubro, ignorando o inativo Marcos)
    expect(cargoLimpeza?.currentEfetivo).toBe(5)

    // Verifica a série histórica:
    // 2026-08: 4 ativos
    // 2026-09: 4 ativos (Marcos foi inativo)
    // 2026-10: 5 ativos (Gleidson somou)
    const series = cargoLimpeza?.series || []
    const pontoAgo = series.find((p) => p.monthKey === '2026-08')
    const pontoSet = series.find((p) => p.monthKey === '2026-09')
    const pontoOut = series.find((p) => p.monthKey === '2026-10')

    expect(pontoAgo?.efetivo).toBe(4)
    expect(pontoSet?.efetivo).toBe(4)
    expect(pontoOut?.efetivo).toBe(5)
  })

  it('Critério 6: Unificação de versões históricas sem matrícula vs com matrícula', () => {
    // Um colaborador lançado no passado sem matrícula e depois atualizado com matrícula não duplica a contagem
    const funcCozinheiro = { id: 'func-cozinha', name: 'Cozinheiro Geral' }
    const testEmployees = [
      {
        id: 'emp-v1',
        name: 'Carlos da Silva',
        registration_number: null, // sem matrícula no início
        function_id: funcCozinheiro.id,
        plant_id: 'plant-1',
        status: 'ATIVO',
        reference_month: '2026-07-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-07-01T10:00:00Z',
      },
      {
        id: 'emp-v2',
        name: 'Carlos da Silva',
        registration_number: 'MAT-999', // mesma pessoa com matrícula
        function_id: funcCozinheiro.id,
        plant_id: 'plant-1',
        status: 'ATIVO',
        reference_month: '2026-08-01',
        company_name: 'Prestadora Alpha',
        created_at: '2026-08-01T10:00:00Z',
      },
    ]

    const { result } = renderHook(() =>
      useCargoCalculations({
        employees: testEmployees,
        contracted: [],
        functions: [funcCozinheiro],
        plants,
        companies,
        selectedPlants: ['plant-1'],
        selectedFunctionId: funcCozinheiro.id,
        selectedCompanies: [],
        dateFrom: '2026-07-01',
        dateTo: '2026-08-31',
      }),
    )

    const cargo = result.current.cargos.find((c) => c.functionId === funcCozinheiro.id)
    // Efetivo atual deve ser 1 pessoa (não 2)
    expect(cargo?.currentEfetivo).toBe(1)
  })
})
