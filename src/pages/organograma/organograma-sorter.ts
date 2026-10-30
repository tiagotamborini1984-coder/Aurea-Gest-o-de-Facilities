/**
 * Utilitários para ordenação determinística e agrupamento de nós do organograma.
 */

export interface OrgCollaboratorLike {
  id?: string
  name?: string
  plant_id?: string | null
  plants?: { id?: string; name?: string } | null
  plants_list?: Array<{ id: string; name: string }> | null
  plant_ids?: string[] | null
  manager_id?: string | null
  children?: any[]
  [key: string]: any
}

/**
 * Retorna a chave de ordenação da planta para um colaborador de forma determinística.
 * Para colaboradores com múltiplas plantas (ex.: Taienny com Lucas e Sorriso),
 * seleciona a menor planta lexicograficamente para garantir estabilidade e agrupamento consistente.
 */
export function getCollaboratorPlantSortKey(node: OrgCollaboratorLike): string {
  if (node.plants_list && node.plants_list.length > 0) {
    const validNames = node.plants_list
      .map((p) => (p?.name || '').trim())
      .filter((n) => n.length > 0)

    if (validNames.length > 0) {
      // Ordena alfabeticamente para pegar a principal de forma estável
      validNames.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      return validNames[0]
    }
  }

  if (node.plants?.name?.trim()) {
    return node.plants.name.trim()
  }

  return 'ZZZ_SEM_PLANTA'
}

/**
 * Ordena uma lista de colaboradores agrupando primeiramente por Planta (ordem alfabética estável),
 * e secundariamente por Nome do Colaborador (ordem alfabética estável).
 * Mantém id como desempate final para total determinismo.
 */
export function sortCollaboratorsByPlantAndName<T extends OrgCollaboratorLike>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    const plantA = getCollaboratorPlantSortKey(a)
    const plantB = getCollaboratorPlantSortKey(b)
    const plantCmp = plantA.localeCompare(plantB, 'pt-BR', { sensitivity: 'base' })
    if (plantCmp !== 0) return plantCmp

    const nameA = (a.name || '').trim()
    const nameB = (b.name || '').trim()
    const nameCmp = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' })
    if (nameCmp !== 0) return nameCmp

    return (a.id || '').localeCompare(b.id || '')
  })
}

/**
 * Ordena recursivamente uma árvore de organograma por planta e depois por nome.
 */
export function sortTreeByPlantAndName<T extends OrgCollaboratorLike>(nodes: T[]): T[] {
  const sorted = sortCollaboratorsByPlantAndName(nodes)
  return sorted.map((node) => {
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: sortTreeByPlantAndName(node.children),
      }
    }
    return node
  })
}
