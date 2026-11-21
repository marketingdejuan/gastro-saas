'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface OrderItemModifier {
  id: string;
  modifierNameSnapshot: string;
  priceDelta: number | string;
  quantity: number;
}

interface OrderItem {
  id: string;
  productNameSnapshot: string;
  unitPrice: number | string;
  quantity: number;
  modifiers: OrderItemModifier[];
}

interface OrderRecord {
  id: string;
  orderNumber: number;
  type: 'DELIVERY' | 'TAKEOUT' | 'DINE_IN' | 'WHATSAPP';
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  total: number | string;
  createdAt: string;
  items: OrderItem[];
}

interface CatalogProductRow {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  isAvailable: boolean;
  categoryName: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  PENDING: { label: 'Nuevo / Pendiente', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  ACCEPTED: { label: 'Aceptado', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  PREPARING: { label: 'En cocina', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  READY: { label: 'Listo para entregar', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  DELIVERED: { label: 'Entregado', badge: 'bg-slate-200 text-slate-700 border-slate-300' },
  CANCELLED: { label: 'Cancelado', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MerchantAdminPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || 'la-hamburgueseria';

  const [tab, setTab] = useState<'ORDERS' | 'CATALOG' | 'SETTINGS'>('ORDERS');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED'>('ALL');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [products, setProducts] = useState<CatalogProductRow[]>([]);
  const [storeOpen, setStoreOpen] = useState<boolean>(true);
  const [togglingStore, setTogglingStore] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const [categoryName, setCategoryName] = useState('Hamburguesas');
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [storeName, setStoreName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#E11D48');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/orders/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/orders/catalog/${slug}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignorar error de red transitorio
    }
  }, [slug]);

  const fetchStoreInfo = useCallback(async () => {
    try {
      const [statusRes, tenantsRes] = await Promise.all([
        fetch(`${API_URL}/orders/store/${slug}/status`),
        fetch(`${API_URL}/orders/tenants`),
      ]);
      if (statusRes.ok) {
        const st = await statusRes.json();
        if (typeof st?.isOpen === 'boolean') setStoreOpen(st.isOpen);
        if (st?.name) setStoreName(st.name);
      }
      if (tenantsRes.ok) {
        const list = await tenantsRes.json();
        const found = Array.isArray(list) ? list.find((t) => t.slug === slug) : null;
        if (found) {
          if (found.name) setStoreName(found.name);
          if (found.whatsappPhone) setWhatsappPhone(found.whatsappPhone);
          if (found.primaryColor) setPrimaryColor(found.primaryColor);
        }
      }
    } catch {
      // Ignorar error transitorio
    }
  }, [slug]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchStoreInfo();
    const timer = setInterval(fetchOrders, 8000);
    return () => clearInterval(timer);
  }, [fetchOrders, fetchProducts, fetchStoreInfo]);

  async function handleToggleStore() {
    setTogglingStore(true);
    try {
      const nextState = !storeOpen;
      const res = await fetch(`${API_URL}/orders/store/${slug}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: nextState }),
      });
      if (res.ok) {
        setStoreOpen(nextState);
      }
    } finally {
      setTogglingStore(false);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    setConfigFeedback(null);
    try {
      const res = await fetch(`${API_URL}/orders/store/${slug}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          whatsappPhone,
          primaryColor,
        }),
      });
      if (res.ok) {
        setConfigFeedback('Ajustes guardados. Recarga el menú público para ver los cambios.');
      }
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleStatusChange(orderId: string, nextStatus: string) {
    await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchOrders();
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim() || !productPrice) return;
    setSavingProduct(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API_URL}/orders/catalog/${slug}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName,
          name: productName,
          description: productDesc,
          basePrice: Number(productPrice),
        }),
      });
      if (res.ok) {
        setProductName('');
        setProductDesc('');
        setProductPrice('');
        setFeedback('Producto agregado al menú público correctamente.');
        fetchProducts();
      }
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleToggleAvailability(prod: CatalogProductRow) {
    await fetch(`${API_URL}/orders/catalog/products/${prod.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !prod.isAvailable }),
    });
    fetchProducts();
  }

  async function handleAdjustPrice(prod: CatalogProductRow, delta: number) {
    const nextPrice = Math.max(0, Number(prod.basePrice) + delta);
    await fetch(`${API_URL}/orders/catalog/products/${prod.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ basePrice: nextPrice }),
    });
    fetchProducts();
  }

  const visibleOrders = useMemo(() => {
    if (orderFilter === 'ACTIVE') {
      return orders.filter(
        (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED',
      );
    }
    if (orderFilter === 'DELIVERED') {
      return orders.filter((o) => o.status === 'DELIVERED');
    }
    return orders;
  }, [orders, orderFilter]);

  const metrics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const activeOrders = validOrders.filter((o) => o.status !== 'DELIVERED').length;
    const totalSales = validOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const avgTicket = validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0;
    const deliveryCount = validOrders.filter((o) => o.type === 'DELIVERY').length;
    const takeoutCount = validOrders.filter((o) => o.type !== 'DELIVERY').length;

    return {
      totalOrders: orders.length,
      activeOrders,
      totalSales,
      avgTicket,
      deliveryCount,
      takeoutCount,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                Admin Comercio
              </span>
              <span className="text-xs text-slate-400">/{slug}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Panel de Control · Dueño de Negocio
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={togglingStore}
              onClick={handleToggleStore}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold border transition cursor-pointer ${
                storeOpen
                  ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  : 'border-rose-400/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  storeOpen ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              {storeOpen ? 'Tienda Abierta' : 'Tienda Cerrada'}
            </button>
            <button
              type="button"
              onClick={() => {
                fetchOrders();
                fetchProducts();
                fetchStoreInfo();
              }}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition cursor-pointer"
            >
              ↻ Actualizar
            </button>
            <Link
              href={`/${slug}`}
              className="rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-rose-600/25 hover:opacity-95 transition"
            >
              Ver Menú Público ↗
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ventas Totales
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {formatMoney(metrics.totalSales)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ticket Promedio
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {formatMoney(metrics.avgTicket)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pedidos Activos en Cocina
            </p>
            <p className="mt-2 text-3xl font-black text-amber-600">
              {metrics.activeOrders}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Modalidad (Domicilio / Local)
            </p>
            <p className="mt-2 text-2xl font-black text-slate-800">
              🛵 {metrics.deliveryCount} · 🛍️ {metrics.takeoutCount}
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('ORDERS')}
              className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                tab === 'ORDERS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              📋 Pedidos en Tiempo Real ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('CATALOG');
                fetchProducts();
              }}
              className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                tab === 'CATALOG'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              🍔 Catálogo y Disponibilidad ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('SETTINGS')}
              className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                tab === 'SETTINGS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              ⚙ Ajustes de Tienda
            </button>
          </div>

          {tab === 'ORDERS' && (
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'Todos' },
                  { id: 'ACTIVE', label: 'Activos' },
                  { id: 'DELIVERED', label: 'Entregados' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === 'ORDERS' && (
          <section className="space-y-4">
            {loading ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
                Cargando pedidos...
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
                <p className="text-base font-extrabold text-slate-800">
                  No hay pedidos en este filtro
                </p>
                <p className="text-sm text-slate-500">
                  Haz un pedido de prueba desde el menú público o cambia el filtro.
                </p>
                <Link
                  href={`/${slug}`}
                  className="inline-block rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white"
                >
                  Ir a hacer un pedido de prueba
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleOrders.map((order) => {
                  const statusInfo = STATUS_LABELS[order.status] || {
                    label: order.status,
                    badge: 'bg-slate-100 text-slate-800',
                  };
                  return (
                    <article
                      key={order.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-slate-900">
                              Pedido #{order.orderNumber}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.badge}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            👤 {order.customerName || 'Cliente'}{' '}
                            {order.customerPhone ? `· ${order.customerPhone}` : ''}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.type === 'DELIVERY'
                              ? `🛵 Domicilio: ${order.deliveryAddress || 'Por confirmar'}`
                              : '🛍️ Recoger en local'}{' '}
                            {order.notes ? `· ${order.notes}` : ''}
                          </p>
                        </div>

                        <span className="text-base font-black text-emerald-700">
                          {formatMoney(Number(order.total))}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <span className="font-bold text-slate-800">
                              {item.quantity}x {item.productNameSnapshot}
                            </span>
                            {item.modifiers?.length > 0 && (
                              <span className="text-xs text-slate-500">
                                {' '}
                                ({item.modifiers.map((m) => m.modifierNameSnapshot).join(', ')})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'PREPARING')}
                          className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 cursor-pointer"
                        >
                          🔥 Preparando
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'READY')}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          ✅ Listo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                          className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 cursor-pointer"
                        >
                          📦 Entregado
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'CATALOG' && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs h-fit">
              <h2 className="text-lg font-black text-slate-900">
                Crear nuevo producto
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Se publicará inmediatamente en /{slug}.
              </p>

              <form onSubmit={handleCreateProduct} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ej: Hamburguesas, Bebidas, Combos"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ej: Doble Bacon Smash"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                    placeholder="Doble carne 150g, queso cheddar fundido, tocineta crocante..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Precio (COP)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="28000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                  />
                </div>

                {feedback && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
                    ✅ {feedback}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProduct}
                  className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-500/25 hover:opacity-95 transition cursor-pointer"
                >
                  {savingProduct ? 'Guardando...' : '+ Publicar producto en el menú'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">
                  Productos en el menú ({products.length})
                </h2>
              </div>

              <div className="space-y-3">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          {prod.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          {prod.categoryName}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            prod.isAvailable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {prod.isAvailable ? 'Disponible' : 'Pausado'}
                        </span>
                      </div>
                      <p className="text-xs font-black text-emerald-700">
                        {formatMoney(Number(prod.basePrice))}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdjustPrice(prod, -1000)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        -$1k
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustPrice(prod, 1000)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        +$1k
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(prod)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-extrabold text-white cursor-pointer ${
                          prod.isAvailable
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {prod.isAvailable ? 'Pausar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === 'SETTINGS' && (
          <section className="max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-black text-slate-900">
              Ajustes generales de la tienda
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Actualiza el nombre público, el WhatsApp de recepción de pedidos y el color principal.
            </p>

            <form onSubmit={handleSaveConfig} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del restaurante
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp de pedidos (con código de país)
                </label>
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="573001234567"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Color principal (HEX)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {configFeedback && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
                  ✅ {configFeedback}
                </div>
              )}

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-extrabold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                {savingConfig ? 'Guardando ajustes...' : 'Guardar ajustes de tienda'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
