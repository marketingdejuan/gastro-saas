'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  currency: string;
  whatsappPhone: string | null;
  primaryColor?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const COLOR_PRESETS = [
  { label: 'Rosa Gastro', hex: '#E11D48' },
  { label: 'Naranja Fuego', hex: '#EA580C' },
  { label: 'Esmeralda', hex: '#059669' },
  { label: 'Índigo', hex: '#4F46E5' },
];

export default function HomePage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTenant, setSearchTenant] = useState('');

  const [name, setName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('573001234567');
  const [primaryColor, setPrimaryColor] = useState('#EA580C');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<TenantSummary | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/orders/tenants`);
      if (res.ok) {
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignorar error de red inicial
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setErrorMsg(null);
    setCreatedTenant(null);

    try {
      const res = await fetch(`${API_URL}/orders/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          whatsappPhone: whatsappPhone.trim() || undefined,
          primaryColor,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(data?.message || 'No se pudo crear el restaurante.');
        return;
      }

      setCreatedTenant(data);
      setName('');
      await loadTenants();
    } catch {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setCreating(false);
    }
  }

  async function handleCopyStoreLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // Ignorar bloqueo de portapapeles
    }
  }

  const filteredTenants = useMemo(() => {
    const q = searchTenant.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }, [tenants, searchTenant]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-12">
        <header className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-amber-300">
            <span>⚡ SaaS Multi-Comercio · Pedido Directo por WhatsApp</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Crea tiendas de pedidos directos{' '}
            <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              sin comisiones
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Administra múltiples restaurantes, personaliza colores, gestiona pedidos en vivo y
            publica productos al instante.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          <section className="lg:col-span-5 rounded-3xl border border-white/10 bg-slate-900/90 p-6 sm:p-7 shadow-2xl space-y-5">
            <div>
              <h2 className="text-xl font-black text-white">
                + Registrar nuevo restaurante
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Genera su enlace público, sede principal y panel administrativo.
              </p>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nombre del restaurante
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Brasa y Parrilla"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  WhatsApp de pedidos (con código de país)
                </label>
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="573001234567"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Color principal de marca
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const active = primaryColor === preset.hex;
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setPrimaryColor(preset.hex)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                          active
                            ? 'border-white bg-white/15 text-white'
                            : 'border-white/10 bg-slate-950/60 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span className="truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/70 p-3 text-xs font-bold text-rose-200">
                  {errorMsg}
                </div>
              )}

              {createdTenant && (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/50 p-4 space-y-2.5">
                  <p className="text-xs font-extrabold text-emerald-300">
                    ✅ Restaurante &ldquo;{createdTenant.name}&rdquo; creado
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${createdTenant.slug}`}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      Abrir Menú
                    </Link>
                    <Link
                      href={`/${createdTenant.slug}/admin`}
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                    >
                      Ir a Panel Dueño
                    </Link>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-500/20 hover:opacity-95 transition cursor-pointer"
              >
                {creating ? 'Creando restaurante...' : 'Crear Restaurante Ahora'}
              </button>
            </form>
          </section>

          <section className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-white">
                Restaurantes activos ({tenants.length})
              </h2>
              <input
                type="text"
                value={searchTenant}
                onChange={(e) => setSearchTenant(e.target.value)}
                placeholder="🔍 Buscar restaurante..."
                className="w-full sm:w-56 rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-orange-400"
              />
            </div>

            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center text-sm text-slate-400">
                Cargando restaurantes...
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
                No se encontraron restaurantes con ese filtro.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredTenants.map((tenant) => (
                  <article
                    key={tenant.id}
                    className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 shadow-lg flex flex-col justify-between gap-4 hover:border-white/20 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: tenant.primaryColor || '#E11D48',
                            }}
                          />
                          /{tenant.slug}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyStoreLink(tenant.slug)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
                        >
                          {copiedSlug === tenant.slug ? '✓ Copiado' : 'Copiar link'}
                        </button>
                      </div>
                      <h3 className="text-lg font-extrabold text-white">
                        {tenant.name}
                      </h3>
                      {tenant.whatsappPhone && (
                        <p className="text-xs text-slate-400">
                          WhatsApp: +{tenant.whatsappPhone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <Link
                        href={`/${tenant.slug}`}
                        className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-2 text-center text-xs font-extrabold text-white hover:opacity-95 transition"
                      >
                        Ver Menú
                      </Link>
                      <Link
                        href={`/${tenant.slug}/admin`}
                        className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-center text-xs font-bold text-white hover:bg-white/15 transition"
                      >
                        Panel Dueño
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
