'use client';

import React, { useMemo, useState } from 'react';
import { calculateOrderTotals, CartItemInput } from '@repo/pricing';

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number | string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface ProductModifier {
  id: string;
  sortOrder: number;
  modifierGroup: ModifierGroup;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | string;
  images?: string[];
  modifiers?: ProductModifier[];
}

export interface Category {
  id: string;
  name: string;
  products: Product[];
}

export interface TenantCatalog {
  id: string;
  name: string;
  slug: string;
  currency: string;
  whatsappPhone?: string | null;
  themeConfig?: {
    primaryColor?: string;
    mode?: string;
  } | null;
  categories: Category[];
}

interface CartEntry {
  key: string;
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedModifiers: {
    id: string;
    name: string;
    priceDelta: number;
  }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function formatMoney(value: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MenuStorefront({ tenant }: { tenant: TenantCatalog }) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [draftModifiers, setDraftModifiers] = useState<Record<string, ModifierOption>>({});
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const primaryColor = tenant.themeConfig?.primaryColor || '#E11D48';

  const pricingItems: CartItemInput[] = useMemo(
    () =>
      cart.map((entry) => ({
        productId: entry.productId,
        name: entry.name,
        basePrice: entry.basePrice,
        quantity: entry.quantity,
        modifiers: entry.selectedModifiers.map((m) => ({
          id: m.id,
          name: m.name,
          priceDelta: m.priceDelta,
          quantity: 1,
        })),
      })),
    [cart],
  );

  const totals = useMemo(
    () => calculateOrderTotals({ items: pricingItems }),
    [pricingItems],
  );

  const totalUnits = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (tenant.categories || [])
      .filter((cat) => activeCategoryId === 'ALL' || cat.id === activeCategoryId)
      .map((cat) => ({
        ...cat,
        products: (cat.products || []).filter(
          (prod) =>
            !q ||
            prod.name.toLowerCase().includes(q) ||
            (prod.description || '').toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [tenant.categories, activeCategoryId, searchQuery]);

  function openProductModal(product: Product) {
    setSelectedProduct(product);
    setDraftModifiers({});
  }

  function toggleModifier(option: ModifierOption) {
    setDraftModifiers((prev) => {
      const next = { ...prev };
      if (next[option.id]) {
        delete next[option.id];
      } else {
        next[option.id] = {
          ...option,
          priceDelta: Number(option.priceDelta),
        };
      }
      return next;
    });
  }

  function addConfiguredProduct() {
    if (!selectedProduct) return;
    const mods = Object.values(draftModifiers).map((m) => ({
      id: m.id,
      name: m.name,
      priceDelta: Number(m.priceDelta),
    }));
    const modKey = mods
      .map((m) => m.id)
      .sort()
      .join(',');
    const key = `${selectedProduct.id}::${modKey}`;
    const basePrice = Number(selectedProduct.basePrice);

    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: selectedProduct.id,
          name: selectedProduct.name,
          basePrice,
          quantity: 1,
          selectedModifiers: mods,
        },
      ];
    });

    setSelectedProduct(null);
    setDraftModifiers({});
    setCheckoutMessage(null);
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function handleConfirmAndWhatsApp() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setCheckoutMessage(null);

    let createdOrderNumber: number | null = null;

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: tenant.slug,
          customerName: customerName.trim() || 'Cliente Menu Digital',
          customerPhone: customerPhone.trim() || undefined,
          deliveryAddress: deliveryAddress.trim() || undefined,
          items: pricingItems,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        createdOrderNumber = data?.order?.orderNumber ?? null;
        setLastOrderNumber(createdOrderNumber);
        setCheckoutMessage(
          createdOrderNumber
            ? `Pedido #${createdOrderNumber} guardado en PostgreSQL.`
            : 'Pedido guardado en PostgreSQL.',
        );
      }
    } catch {
      setCheckoutMessage('No se pudo conectar al API, abriendo WhatsApp directo.');
    } finally {
      setSubmitting(false);
    }

    const lines: string[] = [
      `Hola *${tenant.name}*! 👋`,
      createdOrderNumber
        ? `Pedido *#${createdOrderNumber}*`
        : 'Nuevo pedido desde Menu Digital',
      customerName ? `Cliente: ${customerName}` : '',
      deliveryAddress ? `Entrega: ${deliveryAddress}` : 'Modalidad: Recoger / Local',
      '',
      '*Detalle:*',
      ...cart.map((item) => {
        const modsText =
          item.selectedModifiers.length > 0
            ? ` (${item.selectedModifiers.map((m) => m.name).join(', ')})`
            : '';
        return `• ${item.quantity}x ${item.name}${modsText}`;
      }),
      '',
      `*Total: ${formatMoney(totals.total, tenant.currency)}*`,
    ].filter(Boolean);

    const phone = (tenant.whatsappPhone || '573000000000').replace(/\D/g, '');
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      <header className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 opacity-25 blur-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 20% 20%, ${primaryColor}, transparent 60%)`,
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                Menu Digital · Pedido Directo
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                {tenant.name}
              </h1>
              <p className="text-sm text-slate-300">
                Arma tu pedido en segundos, agrega extras y envia por WhatsApp sin comisiones.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Mi Pedido</span>
              <span className="rounded-lg bg-black/25 px-2 py-0.5 text-xs font-bold">
                {totalUnits}
              </span>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar hamburguesas, combos, adiciones..."
              className="w-full sm:max-w-xs rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-white/40 backdrop-blur"
            />
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategoryId('ALL')}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeCategoryId === 'ALL'
                    ? 'bg-white text-slate-950'
                    : 'bg-white/10 text-slate-200 hover:bg-white/15'
                }`}
              >
                Todo el menu
              </button>
              {(tenant.categories || []).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    activeCategoryId === cat.id
                      ? 'bg-white text-slate-950'
                      : 'bg-white/10 text-slate-200 hover:bg-white/15'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 space-y-10">
        {filteredCategories.map((category) => (
          <section key={category.id} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {category.name}
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {category.products.length}{' '}
                {category.products.length === 1 ? 'producto' : 'productos'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {category.products.map((product) => {
                const priceNum = Number(product.basePrice);
                const hasModifiers =
                  product.modifiers && product.modifiers.length > 0;
                return (
                  <article
                    key={product.id}
                    onClick={() => openProductModal(product)}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md cursor-pointer"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                          {product.name}
                        </h3>
                        <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-900">
                          {formatMoney(priceNum, tenant.currency)}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs font-medium text-slate-500">
                        {hasModifiers
                          ? 'Personalizable con extras'
                          : 'Listo para agregar'}
                      </span>
                      <span
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        + Agregar
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {totalUnits > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-30 mx-auto max-w-3xl px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-white shadow-2xl transition hover:opacity-95 cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-xs font-bold">
                {totalUnits}
              </span>
              <span className="text-sm sm:text-base font-bold">
                Ver carrito y pedir
              </span>
            </div>
            <span className="text-sm sm:text-base font-extrabold">
              {formatMoney(totals.total, tenant.currency)}
            </span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedProduct.name}
                </h3>
                {selectedProduct.description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedProduct.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {selectedProduct.modifiers?.map((pm) => (
              <div key={pm.id} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    {pm.modifierGroup.name}
                  </p>
                  <span className="text-xs text-slate-400">Opcional</span>
                </div>
                <div className="space-y-2">
                  {pm.modifierGroup.options.map((opt) => {
                    const checked = Boolean(draftModifiers[opt.id]);
                    const deltaNum = Number(opt.priceDelta);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between rounded-xl border p-3 text-sm transition cursor-pointer ${
                          checked
                            ? 'border-slate-900 bg-slate-50 font-semibold'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModifier(opt)}
                            className="h-4 w-4 rounded accent-rose-600"
                          />
                          <span>{opt.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          +{formatMoney(deltaNum, tenant.currency)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addConfiguredProduct}
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              Agregar al pedido ·{' '}
              {formatMoney(
                Number(selectedProduct.basePrice) +
                  Object.values(draftModifiers).reduce(
                    (sum, m) => sum + Number(m.priceDelta),
                    0,
                  ),
                tenant.currency,
              )}
            </button>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col justify-between bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Tu Pedido</h2>
                  <p className="text-xs text-slate-500">{tenant.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Aun no agregas productos a tu orden.
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const unitWithMods =
                      item.basePrice +
                      item.selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
                    return (
                      <div
                        key={item.key}
                        className="rounded-xl border border-slate-200 p-3.5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.name}
                            </p>
                            {item.selectedModifiers.length > 0 && (
                              <p className="text-xs text-slate-500">
                                {item.selectedModifiers.map((m) => m.name).join(', ')}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-900">
                            {formatMoney(
                              unitWithMods * item.quantity,
                              tenant.currency,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, -1)}
                            className="h-7 w-7 rounded-lg bg-slate-100 text-sm font-bold text-slate-800 hover:bg-slate-200 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, 1)}
                            className="h-7 w-7 rounded-lg bg-slate-100 text-sm font-bold text-slate-800 hover:bg-slate-200 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="space-y-2.5 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Datos de entrega
                    </p>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Telefono (opcional)"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Direccion de entrega (vacio si recoges)"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              )}

              {checkoutMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
                  {checkoutMessage}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(totals.subtotal, tenant.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-extrabold text-slate-900">
                  <span>Total</span>
                  <span>{formatMoney(totals.total, tenant.currency)}</span>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmAndWhatsApp}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? 'Registrando pedido...'
                    : lastOrderNumber
                      ? `Enviar Pedido #${lastOrderNumber} por WhatsApp`
                      : 'Confirmar y enviar por WhatsApp'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
