'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { calculateOrderTotals, CartItemInput } from '@repo/pricing';

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number | string;
}

export interface SerializedModifierGroup {
  id: string;
  name: string;
  minSelect?: number;
  maxSelect?: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | string;
  images?: string[];
  modifiers?: SerializedModifierGroup[];
}

export interface Category {
  id: string;
  name: string;
  products: Product[];
}

export interface TenantCatalog {
  id?: string;
  name: string;
  slug: string;
  currency: string;
  whatsappPhone?: string | null;
  primaryColor?: string;
  isOpen?: boolean;
  themeConfig?: {
    primaryColor?: string;
    mode?: string;
  } | null;
  categories?: Category[];
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

export default function MenuStorefront({
  tenant,
  categories: propCategories,
}: {
  tenant: TenantCatalog;
  categories?: Category[];
}) {
  const categories = useMemo(
    () => propCategories ?? tenant.categories ?? [],
    [propCategories, tenant.categories],
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [draftModifiers, setDraftModifiers] = useState<Record<string, ModifierOption>>({});
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [orderMode, setOrderMode] = useState<'DELIVERY' | 'TAKEOUT'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<
    'Efectivo' | 'Nequi / Daviplata' | 'Transferencia'
  >('Efectivo');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const primaryColor =
    tenant.primaryColor || tenant.themeConfig?.primaryColor || '#E11D48';

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
    return categories
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
  }, [categories, activeCategoryId, searchQuery]);

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
    setErrorMessage(null);
  }

  function quickAddProduct(e: React.MouseEvent, product: Product) {
    e.stopPropagation();
    if (product.modifiers && product.modifiers.length > 0) {
      openProductModal(product);
      return;
    }
    const key = `${product.id}::`;
    const basePrice = Number(product.basePrice);
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
          productId: product.id,
          name: product.name,
          basePrice,
          quantity: 1,
          selectedModifiers: [],
        },
      ];
    });
    setErrorMessage(null);
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

  function resetOrderFlow() {
    setCart([]);
    setLastOrderNumber(null);
    setCheckoutMessage(null);
    setErrorMessage(null);
    setDrawerOpen(false);
  }

  async function handleConfirmAndWhatsApp() {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setErrorMessage('Por favor escribe tu nombre para identificar el pedido.');
      return;
    }

    if (orderMode === 'DELIVERY' && !deliveryAddress.trim()) {
      setErrorMessage('Indica tu dirección de entrega para pedidos a domicilio.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    setCheckoutMessage(null);

    let createdOrderNumber: number | null = null;

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: tenant.slug,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          deliveryAddress:
            orderMode === 'DELIVERY' ? deliveryAddress.trim() : undefined,
          notes: `Pago: ${paymentMethod}`,
          items: pricingItems,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        createdOrderNumber = data?.order?.orderNumber ?? null;
        setLastOrderNumber(createdOrderNumber);
        setCheckoutMessage(
          createdOrderNumber
            ? `Pedido #${createdOrderNumber} guardado y listo para WhatsApp (${paymentMethod}).`
            : `Pedido guardado y listo para WhatsApp (${paymentMethod}).`,
        );
      }
    } catch {
      setCheckoutMessage('Pedido preparado para enviar por WhatsApp.');
    } finally {
      setSubmitting(false);
    }

    const lines: string[] = [
      `Hola *${tenant.name}*! 👋`,
      createdOrderNumber
        ? `Pedido *#${createdOrderNumber}*`
        : 'Nuevo pedido desde Menu Digital',
      `Cliente: ${customerName.trim()}`,
      customerPhone.trim() ? `Teléfono: ${customerPhone.trim()}` : '',
      orderMode === 'DELIVERY'
        ? `Entrega: Domicilio (${deliveryAddress.trim()})`
        : 'Entrega: Recoger en tienda',
      `Pago: ${paymentMethod}`,
      '',
      '*Detalle del pedido:*',
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
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-28">
      <header className="relative overflow-hidden bg-slate-950 text-white shadow-xl">
        <div
          className="absolute inset-0 opacity-30 blur-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 15% 20%, ${primaryColor}, transparent 55%), radial-gradient(circle at 85% 30%, #f97316, transparent 50%)`,
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/15 transition"
                >
                  ← Comercios
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <span className={`h-2 w-2 rounded-full ${tenant.isOpen === false ? "bg-rose-400" : "bg-emerald-400 animate-pulse"}`} />
                  {tenant.isOpen === false ? "Cerrado temporalmente · Solo menú" : "Abierto ahora · Pedido Directo"}
                </span>
                <Link
                  href={`/${tenant.slug}/admin`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/20 transition"
                >
                  ⚙ Panel Dueño
                </Link>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {tenant.name}
              </h1>
              <p className="text-sm text-slate-300">
                Elige tus favoritos, personaliza extras y confirma tu orden en segundos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-600/30 transition hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
            >
              <span>🛒 Mi Pedido</span>
              <span className="rounded-xl bg-black/25 px-2.5 py-0.5 text-xs font-black">
                {totalUnits}
              </span>
            </button>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar en el menú..."
                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-rose-400 focus:bg-white/15 backdrop-blur transition"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategoryId('ALL')}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  activeCategoryId === 'ALL'
                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                Todo el menú
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    activeCategoryId === cat.id
                      ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
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
        {filteredCategories.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-2 shadow-xs">
            <p className="text-base font-bold text-slate-800">
              No encontramos productos con esa búsqueda
            </p>
            <p className="text-sm text-slate-500">
              Prueba con otro término o selecciona &ldquo;Todo el menú&rdquo;.
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-6 w-1.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    {category.name}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-bold text-slate-700">
                  {category.products.length}{' '}
                  {category.products.length === 1 ? 'opción' : 'opciones'}
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
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-rose-300 hover:shadow-xl cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors">
                            {product.name}
                          </h3>
                          <span className="shrink-0 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-sm font-black text-emerald-700">
                            {formatMoney(priceNum, tenant.currency)}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between pt-3.5 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {hasModifiers ? '✨ Con adiciones' : '⚡ Entrega rápida'}
                        </span>
                        <div className="flex items-center gap-2">
                          {hasModifiers && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openProductModal(product);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                              Personalizar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => quickAddProduct(e, product)}
                            className="rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-rose-500/20 hover:opacity-95 transition cursor-pointer"
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {totalUnits > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-30 mx-auto max-w-3xl px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 px-6 py-4 text-white shadow-2xl shadow-rose-600/35 transition hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/25 text-xs font-black">
                {totalUnits}
              </span>
              <span className="text-sm sm:text-base font-extrabold">
                Ver mi carrito y finalizar
              </span>
            </div>
            <span className="text-base sm:text-lg font-black">
              {formatMoney(totals.total, tenant.currency)}
            </span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-slate-950/70 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600">
                  Personaliza tu orden
                </span>
                <h3 className="mt-1 text-xl font-black text-slate-900">
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
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedProduct.modifiers?.map((group) => (
              <div key={group.id} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-800">
                    {group.name}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                    Opcional
                  </span>
                </div>
                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const checked = Boolean(draftModifiers[opt.id]);
                    const deltaNum = Number(opt.priceDelta);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between rounded-2xl border p-3.5 text-sm transition cursor-pointer ${
                          checked
                            ? 'border-rose-500 bg-rose-50/60 font-bold text-slate-900'
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
                        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-extrabold text-emerald-700 border border-slate-200">
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
              className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 py-4 text-sm font-extrabold text-white shadow-lg shadow-rose-500/25 transition hover:opacity-95 cursor-pointer"
            >
              Agregar al carrito ·{' '}
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
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col justify-between bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Tu Pedido</h2>
                  <p className="text-xs font-medium text-slate-500">{tenant.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-700">Tu carrito está vacío</p>
                  <p className="text-xs text-slate-500">
                    Agrega productos del menú para iniciar tu orden.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    {cart.map((item) => {
                      const unitWithMods =
                        item.basePrice +
                        item.selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
                      return (
                        <div
                          key={item.key}
                          className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-extrabold text-slate-900">
                                {item.name}
                              </p>
                              {item.selectedModifiers.length > 0 && (
                                <p className="text-xs text-slate-500">
                                  + {item.selectedModifiers.map((m) => m.name).join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-black text-slate-900">
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
                              className="h-8 w-8 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2.5 text-xs font-extrabold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, 1)}
                              className="h-8 w-8 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      ¿Cómo quieres recibirlo?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderMode('DELIVERY')}
                        className={`rounded-xl py-2.5 text-xs font-extrabold border transition cursor-pointer ${
                          orderMode === 'DELIVERY'
                            ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        🛵 Domicilio
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderMode('TAKEOUT')}
                        className={`rounded-xl py-2.5 text-xs font-extrabold border transition cursor-pointer ${
                          orderMode === 'TAKEOUT'
                            ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        🛍️ Recoger en local
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Tus datos
                    </p>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre completo *"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Teléfono / WhatsApp"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                    />
                    {orderMode === 'DELIVERY' && (
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Dirección y barrio de entrega *"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Método de pago
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Efectivo', 'Nequi / Daviplata', 'Transferencia'] as const).map(
                        (method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`rounded-xl px-2 py-2 text-[11px] font-bold border transition cursor-pointer ${
                              paymentMethod === method
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {method}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-bold text-rose-700">
                  ⚠️ {errorMessage}
                </div>
              )}

              {checkoutMessage && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-800 space-y-2">
                  <p>✅ {checkoutMessage}</p>
                  <button
                    type="button"
                    onClick={resetOrderFlow}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-emerald-800 cursor-pointer"
                  >
                    Vaciar carrito y hacer otro pedido
                  </button>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(totals.subtotal, tenant.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-black text-slate-900">
                  <span>Total a pagar</span>
                  <span>{formatMoney(totals.total, tenant.currency)}</span>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmAndWhatsApp}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? 'Guardando pedido...'
                    : lastOrderNumber
                      ? `📲 Reenviar Pedido #${lastOrderNumber} por WhatsApp`
                      : '📲 Confirmar y pedir por WhatsApp'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
