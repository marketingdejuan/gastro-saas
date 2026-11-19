"use client";

import { useState } from "react";
import { calculateOrderTotals, CartItemInput } from "@repo/pricing";
import { ShoppingBag, Plus, Minus, MessageCircle, X, Check } from "lucide-react";

interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  modifiers: ModifierGroup[];
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface Props {
  tenant: {
    name: string;
    slug: string;
    currency: string;
    whatsappPhone: string | null;
    primaryColor: string;
  };
  categories: Category[];
}

export default function MenuStorefront({ tenant, categories }: Props) {
  const [cart, setCart] = useState<CartItemInput[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, ModifierOption[]>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: tenant.currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount);

  const toggleModifier = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedModifiers((prev) => {
      const current = prev[group.id] || [];
      const exists = current.some((o) => o.id === option.id);
      if (exists) {
        return { ...prev, [group.id]: current.filter((o) => o.id !== option.id) };
      }
      if (group.maxSelect === 1) {
        return { ...prev, [group.id]: [option] };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, option] };
    });
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const flatMods = Object.values(selectedModifiers)
      .flat()
      .map((m) => ({
        id: m.id,
        name: m.name,
        priceDelta: m.priceDelta,
        quantity: 1,
      }));

    setCart((prev) => [
      ...prev,
      {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        basePrice: selectedProduct.basePrice,
        quantity: 1,
        modifiers: flatMods,
      },
    ]);
    setSelectedProduct(null);
    setSelectedModifiers({});
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, idx) => (idx === index ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const totals = calculateOrderTotals({ items: cart });

  const sendWhatsAppOrder = () => {
    if (!tenant.whatsappPhone) return;
    const lines = cart.map((item, i) => {
      const modsText =
        item.modifiers && item.modifiers.length > 0
          ? " (" + item.modifiers.map((m) => "+" + m.name).join(", ") + ")"
          : "";
      return item.quantity + "x " + item.name + modsText + " - " + formatMoney(totals.itemsBreakdown[i].lineTotal);
    });

    const message = [
      "Hola *" + tenant.name + "*, quiero hacer un pedido:",
      "",
      ...lines,
      "",
      "*Total: " + formatMoney(totals.total) + "*",
      customerName ? "Cliente: " + customerName : "",
      deliveryAddress ? "Direccion: " + deliveryAddress : "Modalidad: Recoger en local",
    ]
      .filter(Boolean)
      .join("\n");

    const url = "https://wa.me/" + tenant.whatsappPhone + "?text=" + encodeURIComponent(message);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 text-neutral-900">
      <header
        className="sticky top-0 z-20 px-4 py-5 text-white shadow-md"
        style={{ backgroundColor: tenant.primaryColor }}
      >
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-sm text-white/90">Menu Digital - Pedidos directos sin comisiones</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 pt-6">
        {categories.map((cat) => (
          <section key={cat.id} className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-800">{cat.name}</h2>
            <div className="grid gap-3">
              {cat.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setSelectedModifiers({});
                  }}
                  className="flex items-start justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:border-neutral-300"
                >
                  <div className="pr-4">
                    <h3 className="font-semibold text-neutral-900">{product.name}</h3>
                    {product.description && (
                      <p className="mt-1 text-sm text-neutral-500">{product.description}</p>
                    )}
                    <p className="mt-2 font-bold text-neutral-900">
                      {formatMoney(product.basePrice)}
                    </p>
                  </div>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: tenant.primaryColor }}
                  >
                    <Plus className="h-5 w-5" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-2xl px-5 py-4 text-white shadow-xl"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="h-5 w-5" />
              Ver pedido ({cart.reduce((a, b) => a + b.quantity, 0)})
            </span>
            <span className="text-lg font-bold">{formatMoney(totals.total)}</span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
                <p className="text-sm text-neutral-500">{selectedProduct.description}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="rounded-full p-1 text-neutral-400">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-5 max-h-72 space-y-5 overflow-y-auto">
              {selectedProduct.modifiers.map((group) => (
                <div key={group.id}>
                  <p className="font-semibold text-neutral-800">{group.name}</p>
                  <div className="mt-2 space-y-2">
                    {group.options.map((opt) => {
                      const active = (selectedModifiers[group.id] || []).some((o) => o.id === opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleModifier(group, opt)}
                          className={"flex w-full items-center justify-between rounded-xl border p-3 text-sm " + (
                            active ? "border-neutral-900 bg-neutral-50 font-medium" : "border-neutral-200"
                          )}
                        >
                          <span>{opt.name}</span>
                          <span className="flex items-center gap-2">
                            +{formatMoney(opt.priceDelta)}
                            {active && <Check className="h-4 w-4 text-emerald-600" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addToCart}
              className="mt-6 w-full rounded-xl py-3.5 font-bold text-white"
              style={{ backgroundColor: tenant.primaryColor }}
            >
              Agregar al pedido
            </button>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-xl font-bold">Tu Pedido</h3>
              <button onClick={() => setIsCartOpen(false)}>
                <X className="h-6 w-6 text-neutral-400" />
              </button>
            </div>

            <div className="mt-4 max-h-60 space-y-3 overflow-y-auto">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-neutral-500">
                        {item.modifiers.map((m) => "+ " + m.name).join(", ")}
                      </p>
                    )}
                    <p className="text-sm font-bold">{formatMoney(totals.itemsBreakdown[idx].lineTotal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(idx, -1)} className="rounded-lg border bg-white p-1">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-5 text-center font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(idx, 1)} className="rounded-lg border bg-white p-1">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <input
                type="text"
                placeholder="Tu nombre"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm"
              />
              <input
                type="text"
                placeholder="Direccion de entrega (deja vacio si recoges)"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span>
              <span>{formatMoney(totals.total)}</span>
            </div>

            <button
              onClick={sendWhatsAppOrder}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-5 w-5" />
              Enviar pedido por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
