import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getAccessibleColors, type AccessibleColors } from '@/lib/contrast-utils'

const DEFAULT_COLORS: AccessibleColors = {
  primary: '#1e3a8a',
  secondary: '#1f2937',
  primaryHover: '#1a2f73',
  primaryContrast: '#ffffff',
}

export function useClientColors(slug: string | undefined) {
  const [colors, setColors] = useState<AccessibleColors>(DEFAULT_COLORS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    let mounted = true
    const fetchColors = async () => {
      try {
        const { data } = await supabase.rpc('get_maintenance_public_options', { p_slug: slug })
        if (!mounted) return
        const clientData = (data as any)?.client
        if (clientData) {
          setColors(getAccessibleColors(clientData.primary_color, clientData.secondary_color))
        }
        setLoading(false)
      } catch {
        if (mounted) setLoading(false)
      }
    }
    fetchColors()
    return () => {
      mounted = false
    }
  }, [slug])

  return { colors, loading }
}
