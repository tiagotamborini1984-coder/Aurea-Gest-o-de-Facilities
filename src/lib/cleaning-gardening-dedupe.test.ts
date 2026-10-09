/**
 * Testes unitários para a função de deduplicação e consolidação de cronogramas
 * de Limpeza e Jardinagem.
 */
import { describe, it, expect } from 'vitest'
import {
  deduplicateSchedules,
  mergeDuplicateSchedules,
  getScheduleDedupeKey,
} from '@/lib/cleaning-gardening-dedupe'

describe('cleaning-gardening-dedupe', () => {
  it('deduplicates schedules with same plant, date, time and area', () => {
    const list = [
      {
        id: 'original-realizado',
        plant_id: 'plant-1',
        area_id: 'area-1',
        activity_date: '2026-09-10',
        start_time: '07:00:00',
        description: 'limpezas das vias internas com soprador',
        status: 'Realizado',
        evidence_urls: ['https://example.com/photo1.jpg'],
        justification: null,
        created_at: '2026-08-26T10:00:00Z',
      },
      {
        id: 'duplicata-nao-realizado',
        plant_id: 'plant-1',
        area_id: 'area-1',
        activity_date: '2026-09-10',
        start_time: '07:00:00',
        description: 'limpezas das vias internas com soprador',
        status: 'Não Realizado',
        evidence_urls: null,
        justification: 'Sem preenchimento',
        created_at: '2026-10-05T17:48:00Z',
      },
    ]

    const result = deduplicateSchedules(list)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('original-realizado')
    expect(result[0].status).toBe('Realizado')
    expect(result[0].evidence_urls).toEqual(['https://example.com/photo1.jpg'])
  })

  it('keeps distinct activities when time or area differ', () => {
    const list = [
      {
        id: 'sched-1',
        plant_id: 'plant-1',
        area_id: 'area-1',
        activity_date: '2026-09-10',
        start_time: '07:00:00',
        description: 'Atividade 1',
        status: 'Realizado',
      },
      {
        id: 'sched-2',
        plant_id: 'plant-1',
        area_id: 'area-1',
        activity_date: '2026-09-10',
        start_time: '08:00:00',
        description: 'Atividade 2',
        status: 'Não Realizado',
      },
      {
        id: 'sched-3',
        plant_id: 'plant-1',
        area_id: 'area-2',
        activity_date: '2026-09-10',
        start_time: '07:00:00',
        description: 'Atividade 3',
        status: 'Pendente',
      },
    ]

    const result = deduplicateSchedules(list)
    expect(result).toHaveLength(3)
  })

  it('preserves urgent flag if any duplicate is urgent', () => {
    const list = [
      {
        id: 'sched-1',
        plant_id: 'plant-1',
        area_id: 'area-1',
        activity_date: '2026-09-10',
        start_time: '07:00:00',
        description: 'Atividade normal',
        status: 'Realizado',
        is_urgent: false,
      },
      {
        id: 'sched-2',
        plant_id: 'plant-1',
        area_id: 'area-1',
        activity_date: '2026-09-10',
        start_time: '07:00:00',
        description: 'Atividade urgente',
        status: 'Não Realizado',
        is_urgent: true,
      },
    ]

    const result = deduplicateSchedules(list)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('Realizado')
    expect(result[0].is_urgent).toBe(true)
  })

  it('generates consistent dedupe keys ignoring seconds in start_time', () => {
    const key1 = getScheduleDedupeKey({
      id: '1',
      plant_id: 'p1',
      area_id: 'a1',
      activity_date: '2026-09-10',
      start_time: '07:00:00',
      description: 'Test',
      status: 'Pendente',
    })
    const key2 = getScheduleDedupeKey({
      id: '2',
      plant_id: 'p1',
      area_id: 'a1',
      activity_date: '2026-09-10',
      start_time: '07:00',
      description: 'Test',
      status: 'Realizado',
    })

    expect(key1).toBe(key2)
  })
})
