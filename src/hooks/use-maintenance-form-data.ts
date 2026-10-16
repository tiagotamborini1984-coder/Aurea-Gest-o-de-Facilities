import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useMaintenanceFormData(clientId: string | null) {
  const [plants, setPlants] = useState<any[]>([])
  const [allAreas, setAllAreas] = useState<any[]>([])
  const [allLocations, setAllLocations] = useState<any[]>([])
  const [allSublocations, setAllSublocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientId) {
      setPlants([])
      setAllAreas([])
      setAllLocations([])
      setAllSublocations([])
      return
    }
    let mounted = true
    setLoading(true)
    Promise.allSettled([
      supabase
        .from('plants')
        .select('id, name, code, city')
        .eq('client_id', clientId)
        .order('name'),
      supabase
        .from('maintenance_areas')
        .select('id, name, plant_id')
        .eq('client_id', clientId)
        .order('name'),
      supabase
        .from('locations')
        .select('id, name, plant_id')
        .eq('client_id', clientId)
        .order('name'),
      supabase
        .from('maintenance_sublocations')
        .select('id, name, location_id, area_id')
        .eq('client_id', clientId)
        .order('name'),
    ])
      .then(([p, a, l, s]) => {
        if (!mounted) return
        if (p.status === 'fulfilled') setPlants(p.value.data || [])
        if (a.status === 'fulfilled') setAllAreas(a.value.data || [])
        if (l.status === 'fulfilled') setAllLocations(l.value.data || [])
        if (s.status === 'fulfilled') setAllSublocations(s.value.data || [])
      })
      .catch(() => {
        if (!mounted) return
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [clientId])

  const getAreasForPlant = useMemo(
    () => (plantId: string) => allAreas.filter((a) => a.plant_id === plantId),
    [allAreas],
  )
  const getLocationsForPlant = useMemo(
    () => (plantId: string) => allLocations.filter((l) => l.plant_id === plantId),
    [allLocations],
  )
  const getSublocationsForLocation = useMemo(
    () => (locationId: string) => allSublocations.filter((s) => s.location_id === locationId),
    [allSublocations],
  )
  const getSubareasForArea = useMemo(
    () => (areaId: string) =>
      allSublocations
        .filter((s) => s.area_id === areaId)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [allSublocations],
  )

  return {
    plants,
    allAreas,
    allSublocations,
    getAreasForPlant,
    getLocationsForPlant,
    getSublocationsForLocation,
    getSubareasForArea,
    loading,
  }
}
