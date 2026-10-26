import { useAppStore } from '@/store/AppContext'

export function useHasAccess(menuName: string) {
  const { profile } = useAppStore()
  if (!profile) return false
  if (profile.role === 'Administrador' || profile.role === 'Master') return true

  let userMenus: string[] = []
  if (Array.isArray(profile.accessible_menus)) {
    userMenus = profile.accessible_menus
  } else if (typeof profile.accessible_menus === 'string') {
    try {
      const parsed = JSON.parse(profile.accessible_menus)
      if (Array.isArray(parsed)) userMenus = parsed
    } catch {
      userMenus = []
    }
  }

  if (profile.role === 'Operacional' && (!userMenus || userMenus.length === 0)) {
    userMenus = [
      'Lançamentos',
      'Gestão de Encomendas',
      'Cadastros:Colaboradores',
      'Cadastros:Equipamentos',
      'Cadastros:Quadro Contratado',
      'Limpeza e Jardinagem',
      'Gestão de Tarefas',
      'Organograma e Fluxos',
      'Auditoria e Checklist',
      'Gestão de Imóveis',
      'Gestão de Lockers',
      'Book de Metas',
      'Gestão de Acidentes',
      'Gestão de Documentos',
      'Gestão de Ferramentas',
      'Gestão de EPIs',
      'Gestão de Férias',
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

  // Equivalência para variações de Gestão da Manutenção / Gestão de Manutenção / Gestão de Chamados
  const MAINTENANCE_MODULE_VARIATIONS = [
    'Gestão da Manutenção',
    'Gestão de Manutenção',
    'Gestão de Chamados',
  ]
  const userHasMaintenanceModule = userMenus.some(
    (m) =>
      MAINTENANCE_MODULE_VARIATIONS.includes(m) ||
      m.startsWith('Gestão da Manutenção:') ||
      m.startsWith('Gestão de Manutenção:') ||
      m.startsWith('Gestão de Chamados:'),
  )

  if (MAINTENANCE_MODULE_VARIATIONS.includes(menuName)) {
    if (userHasMaintenanceModule) {
      return true
    }
  }

  if (
    menuName.startsWith('Gestão da Manutenção:') ||
    menuName.startsWith('Gestão de Manutenção:') ||
    menuName.startsWith('Gestão de Chamados:')
  ) {
    if (userMenus.some((m) => MAINTENANCE_MODULE_VARIATIONS.includes(m))) {
      return true
    }
    const sub = menuName.split(':')[1]
    if (
      userMenus.includes(`Gestão da Manutenção:${sub}`) ||
      userMenus.includes(`Gestão de Manutenção:${sub}`) ||
      userMenus.includes(`Gestão de Chamados:${sub}`) ||
      userMenus.includes(sub)
    ) {
      return true
    }
  }

  // Submenu 'Painel de Chamados' chamado isoladamente
  if (menuName === 'Painel de Chamados') {
    if (
      userHasMaintenanceModule ||
      userMenus.includes('Painel de Chamados') ||
      userMenus.includes('Gestão da Manutenção:Painel de Chamados') ||
      userMenus.includes('Gestão de Manutenção:Painel de Chamados') ||
      userMenus.includes('Gestão de Chamados:Painel de Chamados')
    ) {
      return true
    }
  }

  // legacy mapping for Gestão de Terceiros submenus
  if (menuName.startsWith('Gestão de Terceiros:')) {
    const subName = menuName.split(':')[1]
    if (userMenus.includes(subName)) {
      return true
    }
    if (
      subName === 'Dashboard do Gestor' &&
      (userMenus.includes('Dashboard Gestor') ||
        userMenus.includes('Gestão de Terceiros:Dashboard Gestor'))
    ) {
      return true
    }
  }

  if (menuName.startsWith('Cadastros:') && userMenus.includes('Cadastros')) {
    return true
  }

  if (menuName.startsWith('Gestão de Tarefas:') && userMenus.includes('Gestão de Tarefas')) {
    return true
  }

  if (menuName.startsWith('Gestão de Terceiros:') && userMenus.includes('Gestão de Terceiros')) {
    return true
  }

  if (menuName.startsWith('Organograma e Fluxos:') && userMenus.includes('Organograma e Fluxos')) {
    return true
  }

  if (menuName.startsWith('Gestão de Estoque:') && userMenus.includes('Gestão de Estoque')) {
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

  if (
    menuName === 'Gestão de Terceiros' &&
    userMenus.some((m) => m.startsWith('Gestão de Terceiros'))
  ) {
    return true
  }

  if (
    menuName === 'Organograma e Fluxos' &&
    userMenus.some((m) => m.startsWith('Organograma e Fluxos'))
  ) {
    return true
  }

  if (menuName === 'Cadastros' && userMenus.some((m) => m.startsWith('Cadastros'))) {
    return true
  }

  if (
    menuName === 'Gestão de Estoque' &&
    userMenus.some((m) => m.startsWith('Gestão de Estoque'))
  ) {
    return true
  }

  return userMenus.includes(menuName)
}
