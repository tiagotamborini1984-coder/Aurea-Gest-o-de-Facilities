import { describe, it, expect } from 'vitest'
import { getPersonKey, compareEmployeeVersions, resolveActiveEmployees } from './employee-vigencia'

describe('employee-vigencia resolver', () => {
  it('deduplicates by registration_number and plant_id ignoring casing and spacing', () => {
    const k1 = getPersonKey({
      registration_number: ' REG-00003 ',
      name: 'Adriano Ferreira Teixeira',
      plant_id: 'plant-1',
    })
    const k2 = getPersonKey({
      registration_number: 'reg-00003',
      name: 'ADRIANO FERREIRA',
      plant_id: 'plant-1',
    })
    expect(k1).toBe(k2)
  })

  it('deduplicates by normalized name when registration_number is missing', () => {
    const k1 = getPersonKey({
      name: 'Paulo Magalhães',
      plant_id: 'plant-1',
    })
    const k2 = getPersonKey({
      name: 'PAULO MAGALHAES',
      plant_id: 'plant-1',
    })
    expect(k1).toBe(k2)
  })

  it('keeps the most recent version and drops inactive employees (Adriano Ferreira case)', () => {
    const records = [
      {
        id: '1',
        name: 'Adriano Ferreira Teixeira',
        registration_number: 'REG-00003',
        status: 'Inativo',
        reference_month: '2026-09-01',
        created_at: '2026-09-01T12:00:00Z',
        plant_id: 'SMT',
      },
      {
        id: '2',
        name: 'Adriano Ferreira Teixeira',
        registration_number: 'REG-00003',
        status: 'Inativo',
        reference_month: '2026-08-01',
        created_at: '2026-08-17T18:00:00Z',
        plant_id: 'SMT',
      },
      {
        id: '3',
        name: 'Adriano Ferreira Teixeira',
        registration_number: 'REG-00003',
        status: 'Ativo',
        reference_month: '2026-07-01',
        created_at: '2026-07-01T12:00:00Z',
        plant_id: 'SMT',
      },
      {
        id: '4',
        name: 'Adriano Ferreira Teixeira',
        registration_number: 'REG-00003',
        status: 'Ativo',
        reference_month: '2026-06-01',
        created_at: '2026-06-01T13:00:00Z',
        plant_id: 'SMT',
      },
      // Another employee who is currently active
      {
        id: '5',
        name: 'Colaborador Ativo Vigente',
        registration_number: 'REG-99999',
        status: 'Ativo',
        reference_month: '2026-09-01',
        created_at: '2026-09-01T12:00:00Z',
        plant_id: 'SMT',
      },
    ]

    const resolved = resolveActiveEmployees(records)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].registration_number).toBe('REG-99999')
    expect(resolved.some((r) => r.registration_number === 'REG-00003')).toBe(false)
  })

  it('drops Francisco Alves Bezerra who was Ativo in 04/05 and Inativo from 06 to 09', () => {
    const records = [
      {
        id: 'f-sep',
        name: 'Francisco Alves Bezerra',
        registration_number: 'REG-00103',
        status: 'Inativo',
        reference_month: '2026-09-01',
        created_at: '2026-09-01T12:00:00Z',
        plant_id: 'SMT',
      },
      {
        id: 'f-may',
        name: 'Francisco Alves Bezerra',
        registration_number: 'REG-00103',
        status: 'Ativo',
        reference_month: '2026-05-01',
        created_at: '2026-03-16T18:00:00Z',
        plant_id: 'SMT',
      },
      {
        id: 'f-apr',
        name: 'Francisco Alves Bezerra',
        registration_number: 'REG-00103',
        status: 'Ativo',
        reference_month: '2026-04-01',
        created_at: '2026-05-05T19:00:00Z',
        plant_id: 'SMT',
      },
    ]

    const resolved = resolveActiveEmployees(records)
    expect(resolved).toHaveLength(0)
  })

  it('correctly compares created_at when reference_month is the same', () => {
    const vOld = {
      id: 'old',
      status: 'Ativo',
      reference_month: '2026-08-01',
      created_at: '2026-08-01T10:00:00Z',
    }
    const vNew = {
      id: 'new',
      status: 'Inativo',
      reference_month: '2026-08-01',
      created_at: '2026-08-15T10:00:00Z',
    }
    expect(compareEmployeeVersions(vOld, vNew)).toBeGreaterThan(0) // vNew wins, so b comes first
    expect(compareEmployeeVersions(vNew, vOld)).toBeLessThan(0)
  })
})
