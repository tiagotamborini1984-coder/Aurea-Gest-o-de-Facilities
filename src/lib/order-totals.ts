// Totais de pedido de estoque (Gestão de Pedidos / Meus Pedidos).
// Fonte: inventory_request_items (quantity = qtd solicitada,
// reserved_quantity = qtd reservada/atendida) x inventory_products.item_value.

export function getOrderRequestedTotal(items: any[] | null | undefined): number {
  if (!items || items.length === 0) return 0
  return items.reduce(
    (acc: number, item: any) => acc + (item?.product?.item_value ?? 0) * (item?.quantity ?? 0),
    0,
  )
}

export function getOrderReservedTotal(items: any[] | null | undefined): number {
  if (!items || items.length === 0) return 0
  return items.reduce(
    (acc: number, item: any) =>
      acc + (item?.product?.item_value ?? 0) * (item?.reserved_quantity ?? item?.quantity ?? 0),
    0,
  )
}

// Total reservado considerando valores ainda não salvos (edição em andamento),
// usado no modal de processamento enquanto o gestor ajusta as quantidades.
export function getOrderReservedTotalFromQuantities(
  items: any[] | null | undefined,
  reservedQuantities: Record<string, number>,
): number {
  if (!items || items.length === 0) return 0
  return items.reduce((acc: number, item: any) => {
    const qty = reservedQuantities[item?.id] ?? item?.reserved_quantity ?? item?.quantity ?? 0
    return acc + (item?.product?.item_value ?? 0) * qty
  }, 0)
}
