import { useAppStore } from '@/store/AppContext'

export function useHasAccess(menuName: string) {
  const { profile } = useAppStore()
  if (!profile) return false
  if (profile.role === 'Administrador' || profile.role === 'Master') return true

  let userMenus = profile.accessible_menus || []
  if (profile.role === 'Operacional' && (!userMenus || userMenus.length === 0)) {
    userMenus = [
      'Lançamentos',
      'Encomendas',
      'Cadastros:Colaboradores',
      'Cadastros:Equipamentos',
      'Cadastros:Quadro Contratado',
      'Limpeza e Jardinagem',
    ]
  }

  if (menuName.startsWith('Cadastros:') && userMenus.includes('Cadastros')) {
    return true
  }

  return userMenus.includes(menuName)
}
