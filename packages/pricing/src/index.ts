export interface CartModifierInput {
  id: string;
  name: string;
  priceDelta: number;
  quantity: number;
}

export interface CartItemInput {
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  modifiers?: CartModifierInput[];
}

export interface OrderTotalsInput {
  items: CartItemInput[];
  deliveryFee?: number;
  discountAmount?: number;
  taxRate?: number; // Ej: 0.08 para 8% impoconsumo o 0.19 para IVA
}

export interface OrderTotalsResult {
  itemsBreakdown: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitTotal: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  deliveryFee: number;
  total: number;
}

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotalsResult {
  const itemsBreakdown = input.items.map((item) => {
    const qty = Math.max(1, Math.floor(item.quantity));
    const modifiersUnitSum = (item.modifiers ?? []).reduce(
      (acc, mod) => acc + mod.priceDelta * Math.max(1, Math.floor(mod.quantity)),
      0,
    );
    const unitTotal = item.basePrice + modifiersUnitSum;
    const lineTotal = unitTotal * qty;
    return {
      productId: item.productId,
      name: item.name,
      quantity: qty,
      unitTotal,
      lineTotal,
    };
  });

  const subtotal = itemsBreakdown.reduce((acc, row) => acc + row.lineTotal, 0);
  const discountTotal = Math.min(subtotal, Math.max(0, input.discountAmount ?? 0));
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const taxTotal = Math.round(taxableBase * Math.max(0, input.taxRate ?? 0));
  const deliveryFee = Math.max(0, input.deliveryFee ?? 0);
  const total = taxableBase + taxTotal + deliveryFee;

  return {
    itemsBreakdown,
    subtotal,
    discountTotal,
    taxTotal,
    deliveryFee,
    total,
  };
}
