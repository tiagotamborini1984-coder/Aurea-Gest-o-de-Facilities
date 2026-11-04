import { useEffect, useState } from 'react'

/**
 * Persistência de filtros por tela.
 *
 * Resolve a perda de filtros ao alternar para outra janela/programa,
 * recarregar a página (F5) ou remontar o componente: os valores ficam
 * salvos em localStorage sob a chave `aurea_filters:<tela>` e são
 * restaurados automaticamente no primeiro render do hook (lazy init),
 * sem "flash" de dados sem filtro.
 */

const PREFIX = 'aurea_filters'

export interface ScreenFilterStore<T extends Record<string, unknown>> {
  /** Valores atuais (restaurados do storage na montagem). */
  values: T
  /** Salva um ou mais campos do filtro desta tela. */
  set: (patch: Partial<T>) => void
  /** Restaura os padrões e limpa o armazenamento desta tela. */
  reset: () => void
}

export function usePersistentScreenFilters<T extends Record<string, unknown>>(
  screenId: string,
  defaults: T,
): ScreenFilterStore<T> {
  const storageKey = `${PREFIX}:${screenId}`

  const [values, setValues] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          return { ...defaults, ...parsed }
        }
      }
    } catch {
      // localStorage bloqueado ou JSON corrompido: segue com os padrões
    }
    return { ...defaults }
  })

  // Grava a cada mudança (inclusive o primeiro render, para semear o storage).
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(values))
    } catch {
      // ignore
    }
  }, [storageKey, values])

  const set = (patch: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...patch }))
  }

  const reset = () => {
    setValues({ ...defaults })
  }

  return { values, set, reset }
}

/**
 * Cria um par [valor, setter] a partir de um campo persistido. O setter
 * aceita o novo valor direto ou uma função de atualização, como um setState,
 * para ser compatível com os componentes que recebem Dispatch<SetStateAction>.
 */
export function useFilterField<T extends Record<string, unknown>, K extends keyof T & string>(
  store: ScreenFilterStore<T>,
  key: K,
): [T[K], (value: T[K] | ((prev: T[K]) => T[K])) => void] {
  const setValue = (value: T[K] | ((prev: T[K]) => T[K])) => {
    const next =
      typeof value === 'function' ? (value as (prev: T[K]) => T[K])(store.values[key]) : value
    store.set({ [key]: next } as unknown as Partial<T>)
  }
  return [store.values[key], setValue]
}
