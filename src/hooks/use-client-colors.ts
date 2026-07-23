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
    supabase
      .rpc('get_maintenance_public_options', { p_slug: slug })
      .then(({ data }) => {
        if (!mounted) return
        if (data?.client) {
          setColors(getAccessibleColors(data.client.primary_color, data.client.secondary_color))
        }
        setLoading(false)
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [slug])

  return { colors, loading }
}
