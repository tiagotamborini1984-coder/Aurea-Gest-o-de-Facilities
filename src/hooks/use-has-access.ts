import { useAppStore } from '@/store/AppContext'

export function useHasAccess(menuName: string) {
  const { profile } = useAppStore()
  if (!profile) return false
  if (profile.role === 'Administrador' || profile.role === 'Master') return true

  let userMenus = profile.accessible_menus || []
  if (profile.role === 'Operacional' && (!userMenus || userMenus.length === 0)) {
    userMenus = [
      'Lançamentos',
      'Gestão de Encomendas',
      'Cadastros:Colaboradores',
      'Cadastros:Equipamentos',
      'Cadastros:Quadro Contratado',
      'Limpeza e Jardinagem',
      'Gestão de Tarefas',
      'Auditoria e Checklist',
    ]
  }

  // legacy mapping for old 'Painel' and 'Tipos' keys
  if (
    menuName === 'Gestão de Tarefas:Painel de Chamados' &&
    userMenus.includes('Gestão de Tarefas:Painel')
  ) {
    return true
  }
  if (
    menuName === 'Gestão de Tarefas:Tipos de Chamado' &&
    userMenus.includes('Gestão de Tarefas:Tipos')
  ) {
    return true
  }

  if (menuName === 'Gestão de Encomendas' && userMenus.includes('Encomendas')) {
    return true
  }

  if (menuName.startsWith('Cadastros:') && userMenus.includes('Cadastros')) {
    return true
  }

  if (menuName.startsWith('Gestão de Tarefas:') && userMenus.includes('Gestão de Tarefas')) {
    return true
  }

  if (
    menuName.startsWith('Auditoria e Checklist:') &&
    userMenus.includes('Auditoria e Checklist')
  ) {
    return true
  }

  if (
    menuName === 'Gestão de Tarefas' &&
    userMenus.some((m) => m.startsWith('Gestão de Tarefas'))
  ) {
    return true
  }

  if (
    menuName === 'Auditoria e Checklist' &&
    userMenus.some((m) => m.startsWith('Auditoria e Checklist'))
  ) {
    return true
  }

  if (menuName === 'Cadastros' && userMenus.some((m) => m.startsWith('Cadastros'))) {
    return true
  }

  return userMenus.includes(menuName)
}
