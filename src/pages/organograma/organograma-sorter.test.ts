import { describe, it, expect } from 'vitest'
import { getCollaboratorPlantSortKey, sortCollaboratorsByPlantAndName } from './organograma-sorter'

describe('organograma-sorter', () => {
  it('extracts correct plant sort key for single plant', () => {
    const c1 = {
      name: 'Gabriel',
      plants_list: [{ id: 'p1', name: 'SMT - SORRISO' }],
    }
    expect(getCollaboratorPlantSortKey(c1)).toBe('SMT - SORRISO')
  })

  it('extracts stable plant sort key for multiple plants (e.g. Taienny)', () => {
    const taienny = {
      name: 'Taienny',
      plants_list: [
        { id: 'p1', name: 'SMT - SORRISO' },
        { id: 'p2', name: 'LRV - LUCAS DO RIO VERDE' },
      ],
    }
    // Alphabetically first plant among her plants: "LRV - LUCAS DO RIO VERDE"
    expect(getCollaboratorPlantSortKey(taienny)).toBe('LRV - LUCAS DO RIO VERDE')
  })

  it('falls back to plants.name or Sem Planta', () => {
    const c1 = { name: 'Raquel', plants: { name: 'QUE - QUERÊNCIA' } }
    const c2 = { name: 'Sem' }
    expect(getCollaboratorPlantSortKey(c1)).toBe('QUE - QUERÊNCIA')
    expect(getCollaboratorPlantSortKey(c2)).toBe('ZZZ_SEM_PLANTA')
  })

  it('sorts nodes grouped by plant first, then by name', () => {
    const list = [
      { id: '1', name: 'Gabriel Viana', plants: { name: 'SMT - SORRISO' } },
      { id: '2', name: 'Johnny Henrique', plants: { name: 'LRV - LUCAS DO RIO VERDE' } },
      { id: '3', name: 'Raquel Urtiga', plants: { name: 'QUE - QUERÊNCIA' } },
      { id: '4', name: 'Ramon Silva', plants: { name: 'LRV - LUCAS DO RIO VERDE' } },
      { id: '5', name: 'Rosangela Rita', plants: { name: 'SMT - SORRISO' } },
    ]

    const sorted = sortCollaboratorsByPlantAndName(list)
    expect(sorted.map((c) => c.name)).toEqual([
      'Johnny Henrique',
      'Ramon Silva',
      'Raquel Urtiga',
      'Gabriel Viana',
      'Rosangela Rita',
    ])
  })

  it('handles Taienny correctly without duplicating or disappearing', () => {
    const list = [
      {
        id: '1',
        name: 'Gabriel Viana',
        plants_list: [{ id: 'p1', name: 'SMT - SORRISO' }],
      },
      {
        id: '2',
        name: 'Johnny Henrique',
        plants_list: [{ id: 'p2', name: 'LRV - LUCAS DO RIO VERDE' }],
      },
      {
        id: '3',
        name: 'Taienny Marquezolo',
        plants_list: [
          { id: 'p1', name: 'SMT - SORRISO' },
          { id: 'p2', name: 'LRV - LUCAS DO RIO VERDE' },
        ],
      },
    ]

    const sorted = sortCollaboratorsByPlantAndName(list)
    // Both Johnny and Taienny have sort key LRV - LUCAS DO RIO VERDE (first plant alphabetically)
    // Between Johnny and Taienny, alphabetical by name: Johnny, then Taienny
    // Then Gabriel (SMT - SORRISO)
    expect(sorted.map((c) => c.name)).toEqual([
      'Johnny Henrique',
      'Taienny Marquezolo',
      'Gabriel Viana',
    ])
    expect(sorted.length).toBe(3)
  })
})
