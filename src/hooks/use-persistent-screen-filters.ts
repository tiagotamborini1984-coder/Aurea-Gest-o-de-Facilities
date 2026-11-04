import { useEffect, useRef, useState } from 'react'

/**
 * Persistência de filtros por tela.
 *
 * Resolve a perda de filtros ao alternar para outra janela/programa,
 * recarregar a página (F5) ou remontar o componente: os valores ficam
 * salvos em localStorage sob a chave `aurea_filters:<tela>` e são
 * restaurados automaticamente no primeiro render do hook (lazy init),
 * sem "flash" de dados sem filtro.
 *
 * A restauração é defensiva: o valor salvo só é aceito quando a FORMA
 * do campo bate com a do padrão da tela (string com string, array com
 * array, boolean com boolean...). Qualquer valor malformado, corrompido
 * ou de um formato antigo é descartado silenciosamente e cai no default
 * — nunca quebra a montagem da tela (ex.: "Cannot read properties of
 * undefined").
 */

const PREFIX = 'aurea_filters'

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?/

/** String que parece uma data (yyyy-mm-dd[THH:mm]) e que o Date aceita. */
function isPlausibleDateStr(v: unknown): boolean {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false
  const t = Date.parse(v.length === 10 ? `${v}T12:00:00Z` : v)
  return !Number.isNaN(t)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Valida um campo restaurado contra o default da tela.
 * Retorna o valor saneado ou `undefined` quando deve cair no default.
 */
function sanitizeField(key: string, saved: unknown, def: unknown): unknown {
  // Formato de data esperado (default é string tipo yyyy-mm-dd): exige string
  // parseável como data — objeto/number/lixo volta para o default.
  if (typeof def === 'string' && DATE_RE.test(def)) {
    return typeof saved === 'string' && isPlausibleDateStr(saved) ? saved : undefined
  }

  if (typeof def === 'string') {
    // String simples: aceita qualquer string não vazia (lista/tabs usam '').
    return typeof saved === 'string' ? saved : undefined
  }

  if (typeof def === 'number') {
    return typeof saved === 'number' && Number.isFinite(saved) ? saved : undefined
  }

  if (typeof def === 'boolean') {
    return typeof saved === 'boolean' ? saved : undefined
  }

  if (Array.isArray(def)) {
    // Array: aceita apenas array cujos itens sejam primitivos/strings simples
    // (ids, nomes). Itens estranhos derrubam o campo inteiro -> default.
    if (!Array.isArray(saved)) return undefined
    const ok = saved.every(
      (it) =>
        typeof it === 'string' ||
        typeof it === 'number' ||
        typeof it === 'boolean' ||
        (isPlainObject(it) && Object.values(it).every((v) => typeof v !== 'object' || v === null)),
    )
    return ok ? saved : undefined
  }

  if (isPlainObject(def)) {
    // Objeto (ex.: intervalo de datas { from, to }): aceita apenas objeto puro
    // com valores primitivos — Date, classes ou estruturas aninhadas caem fora.
    if (!isPlainObject(saved)) return undefined
    const entries = Object.entries(saved).filter(
      ([, v]) =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null,
    )
    return entries.length === Object.keys(saved).length ? saved : undefined
  }

  // Default null/undefined: aceita primitivos simples e objetos planos com
  // valores primitivos (ex.: intervalo de datas { from, to } serializado).
  // Para intervalos de data, exige strings parseáveis como data.
  if (typeof def !== 'object' || def === null) {
    if (
      typeof saved === 'string' ||
      typeof saved === 'number' ||
      typeof saved === 'boolean' ||
      saved === null
    ) {
      return saved
    }
    if (isPlainObject(saved)) {
      const entries = Object.entries(saved)
      const allPrimitive = entries.every(
        ([, v]) =>
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null,
      )
      const datesOk = entries.every(([k, v]) => {
        if ((k === 'from' || k === 'to') && typeof v === 'string' && v.length > 0) {
          return isPlausibleDateStr(v)
        }
        return true
      })
      if (allPrimitive && datesOk) return saved
    }
  }

  // Qualquer outra forma (objeto solto onde se esperava escalar, Date
  // serializado, estrutura antiga etc.) é descartada — campo volta ao default.
  console.warn(
    `[usePersistentScreenFilters] filtro "${key}" com formato inesperado; usando default.`,
  )
  return undefined
}

export interface ScreenFilterStore<T extends Record<string, unknown>> {
  /** Valores atuais (restaurados do storage na montagem). */
  values: T
  /**
   * Salva um ou mais campos do filtro desta tela.
   * Aceita também função de atualização `(prev) => patch`, no formato
   * Dispatch<SetStateAction> — varios filhos (Checkbox etc.) chamam o setter
   * no formato funcional; antes da v0.0.1832 a função era PARADA como valor
   * do campo (values.selectedPlants virava uma function) e a tela quebrava
   * com "Cannot read properties of function ..." ao filtrar.
   */
  set: (patch: Partial<T> | ((prev: T) => Partial<T>)) => void
  /** Restaura os padrões e limpa o armazenamento desta tela. */
  reset: () => void
}

export function usePersistentScreenFilters<T extends Record<string, unknown>>(
  screenId: string,
  defaults: T,
): ScreenFilterStore<T> {
  const storageKey = `${PREFIX}:${screenId}`

  // defaults costuma ser um literal inline (nova identidade a cada render);
  // o ref evita que o reset dependa da identidade do objeto da tela.
  const defaultsRef = useRef<T>(defaults)
  useEffect(() => {
    defaultsRef.current = defaults
  }, [defaults])

  const [values, setValues] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (isPlainObject(parsed)) {
          const next: Record<string, unknown> = { ...defaults }
          let malformed = false
          for (const key of Object.keys(defaults)) {
            if (!(key in parsed)) continue
            const safe = sanitizeField(key, parsed[key], defaults[key])
            if (safe === undefined) {
              malformed = true
              continue // cai no default desta tela
            }
            next[key] = safe
          }
          if (malformed) {
            // Reescreve o storage já saneado para não repetir o aviso a cada F5.
            try {
              localStorage.setItem(storageKey, JSON.stringify(next))
            } catch {
              // ignore
            }
          }
          return next as T
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

  const set = (patch: Partial<T> | ((prev: T) => Partial<T>)) => {
    setValues((prev) => {
      const resolved = typeof patch === 'function' ? patch(prev) : patch
      // Compatibilidade com Dispatch<SetStateAction> por campo: os wrappers
      // das telas repassam o argumento recebido direto para o campo, então um
      // updater `(prevCampo) => proximoCampo` precisa ser resolvido aqui
      // contra o valor ATUAL do campo — e não gravado como função no estado
      // (o que derrubava a tela com TypeError ao filtrar).
      const safe: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(resolved || {})) {
        const next =
          typeof v === 'function' ? (v as (p: unknown) => unknown)(prev[k as keyof T]) : v
        if (typeof next !== 'function') safe[k] = next
      }
      return { ...prev, ...safe }
    })
  }

  const reset = () => {
    setValues({ ...defaultsRef.current })
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
