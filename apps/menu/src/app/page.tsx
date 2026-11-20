'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  currency: string;
  whatsappPhone?: string | null;
  primaryColor?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const COLOR_PRESETS = [
  { label: 'Rosa Gastro', value: '#E11D48' },
  { label: 'Naranja Fuego', value: '#EA580C' },
  { label: 'Esmeralda', value: '#059669' },
  { label: 'Índigo', value: '#4F46E5' },
];

export default function HomePage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [name, setName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('573001234567');
  const [primaryColor, setPrimaryColor] = useState('#E11D48');
  const [creating, setCreating] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<TenantItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/orders/tenants`);
      if (res.ok) {
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : []);
      }
    } catch {
      // Mantener lista actual si el API está iniciando
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
          name,
          whatsappPhone,
          primaryColor,
          currency: 'COP',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.message || 'No se pudo crear el restaurante.');
      } else {
        setCreatedTenant(data);
        setName('');
        loadTenants();
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e]" />
            <span className="text-lg font-extrabold tracking-tight">
              Gastro<span className="text-rose-500">Flow</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/la-hamburgueseria"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              Ver Tienda Demo
            </Link>
            <Link
              href="/la-hamburgueseria/admin"
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition"
            >
              Panel Dueño
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl w-full px-6 py-12 space-y-12">
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-300">
            SaaS Multi-Restaurante · Tienda Digital + Panel del Dueño
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Crea tiendas de pedidos directos{' '}
            <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              sin comisiones
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300">
            Administra múltiples restaurantes, personaliza colores, gestiona pedidos en vivo y publica productos al instante.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-5 h-fit">
            <div>
              <h2 className="text-xl font-black text-white">
                + Registrar nuevo restaurante
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Genera su enlace público, sede principal y panel administrativo.
              </p>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre del restaurante
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pizzería Don Luigi"
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  WhatsApp de pedidos (con código de país)
                </label>
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="573001234567"
                  className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Color principal de marca
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setPrimaryColor(preset.value)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                        primaryColor === preset.value
                          ? 'border-white bg-white/15 text-white'
                          : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: preset.value }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs font-semibold text-rose-200">
                  {errorMsg}
                </div>
              )}

              {createdTenant && (
                <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/30 p-4 space-y-2.5 text-xs">
                  <p className="font-extrabold text-emerald-300">
                    ✅ Restaurante &ldquo;{createdTenant.name}&rdquo; creado
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/${createdTenant.slug}`}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 font-extrabold text-slate-950"
                    >
                      Abrir Menú (/{createdTenant.slug}) →
                    </Link>
                    <Link
                      href={`/${createdTenant.slug}/admin`}
                      className="rounded-lg bg-white/15 px-3 py-1.5 font-bold text-white"
                    >
                      Abrir Panel Dueño
                    </Link>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/25 hover:opacity-95 transition cursor-pointer"
              >
                {creating ? 'Creando comercio...' : 'Crear Restaurante Ahora'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">
                Restaurantes activos ({tenants.length || 1})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(tenants.length > 0
                ? tenants
                : [
                    {
                      id: 'demo',
                      name: 'La Hamburguesería Demo',
                      slug: 'la-hamburgueseria',
                      currency: 'COP',
                      primaryColor: '#E11D48',
                    },
                  ]
              ).map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-between gap-4 hover:border-white/25 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: t.primaryColor || '#E11D48' }}
                      />
                      <span className="text-xs font-mono text-slate-400">
                        /{t.slug}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-white">{t.name}</h3>
                    {t.whatsappPhone && (
                      <p className="text-xs text-slate-400">
                        WhatsApp: +{t.whatsappPhone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <Link
                      href={`/${t.slug}`}
                      className="flex-1 text-center rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-2 text-xs font-extrabold text-white hover:opacity-95 transition"
                    >
                      Ver Menú
                    </Link>
                    <Link
                      href={`/${t.slug}/admin`}
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/15 transition"
                    >
                      Panel Dueño
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        GastroFlow SaaS · Multi-tenant Storefront & Merchant Admin
      </footer>
    </div>
  );
}
