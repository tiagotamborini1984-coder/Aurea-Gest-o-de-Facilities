/**
 * translate-crash-guard.ts
 *
 * Previne crashes de renderização causados por mutações externas no DOM
 * (Google Translate, extensões de navegador como tradutores ou corretores ortográficos).
 *
 * Problema:
 * Quando o Google Translate ou outra extensão externa traduz ou altera nós de texto no DOM,
 * ela envolve ou move os nós em tags `<font>` ou semelhantes. Quando o React tenta
 * fazer reconcile posterior (`insertBefore` ou `removeChild`), o `referenceNode` ou `child`
 * já não pertence ao `parentNode` esperado pelo Virtual DOM, disparando o erro:
 * "NotFoundError: Failed to execute 'insertBefore' on 'Node': The node before which the
 * new node is to be inserted is not a child of this node."
 *
 * Solução de consenso (facebook/react#11538):
 * Se o nó foi movido/re-parentado por uma extensão ou tradutor externo, o método
 * intercepta de forma graciosa e segura:
 * - Em `removeChild`: se o nó não é filho deste nó, remove do nó pai real em que se encontra.
 * - Em `insertBefore`: se o nó de referência não for filho deste nó, faz appendChild seguro.
 *
 * Mantém 100% da integridade das operações normais do React quando os nós são válidos.
 */

declare global {
  interface Window {
    __translateCrashGuardInstalled?: boolean
  }
}

export function installTranslateCrashGuard() {
  if (typeof window === 'undefined' || typeof Node === 'undefined' || !Node.prototype) {
    return
  }

  if (window.__translateCrashGuardInstalled) {
    return
  }
  window.__translateCrashGuardInstalled = true

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      if (child && child.parentNode !== this) {
        if (child.parentNode) {
          return child.parentNode.removeChild(child) as T
        }
        return child
      }
      return originalRemoveChild.call(this, child) as T
    } catch (err) {
      console.warn('TranslateCrashGuard: interceptada falha em removeChild:', err)
      if (child && child.parentNode) {
        try {
          return child.parentNode.removeChild(child) as T
        } catch {
          // ignore
        }
      }
      return child
    }
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    try {
      if (referenceNode && referenceNode.parentNode !== this) {
        // O nó de referência foi re-parentado externamente (Google Translate ou extensão).
        // Fazer append preserva o nó inserido sem quebrar a árvore React.
        return originalInsertBefore.call(this, newNode, null) as T
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T
    } catch (err) {
      console.warn('TranslateCrashGuard: interceptada falha em insertBefore:', err)
      try {
        return originalInsertBefore.call(this, newNode, null) as T
      } catch {
        return newNode
      }
    }
  }
}
