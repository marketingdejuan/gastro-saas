import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
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

      <main className="mx-auto max-w-5xl px-6 py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-300">
          Plataforma Multi-Restaurante · Pedidos Directos por WhatsApp
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Tu menú digital moderno y{' '}
          <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
            panel de control en tiempo real
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300">
          Recibe pedidos sin comisiones, personaliza adiciones y administra tu cocina y catálogo desde un solo lugar.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/la-hamburgueseria"
            className="rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 px-7 py-4 text-sm font-extrabold text-white shadow-xl shadow-rose-600/25 hover:opacity-95 transition"
          >
            Abrir Menú del Restaurante →
          </Link>
          <Link
            href="/la-hamburgueseria/admin"
            className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-bold text-white hover:bg-white/15 transition"
          >
            Entrar al Sitio Administrativo
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        GastroFlow SaaS · Multi-tenant Storefront & Merchant Admin
      </footer>
    </div>
  );
}
