"use client";

import { useCartStore, cartSubtotal } from "@/lib/cartStore";
import { useUIStore } from "@/lib/uiStore";
import { formatPKR } from "@/lib/types";

export default function CartDrawer({
  shippingFee,
  freeShippingThreshold,
}: {
  shippingFee: number;
  freeShippingThreshold: number;
}) {
  const items = useCartStore((s) => s.items);
  const changeQty = useCartStore((s) => s.changeQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const { cartOpen, searchOpen, closeCart, openCheckout } = useUIStore();

  const sub = cartSubtotal(items);
  const ship = sub === 0 || sub >= freeShippingThreshold ? 0 : shippingFee;
  const grand = sub + ship;

  return (
    <>
      <div className={`overlay ${cartOpen || searchOpen ? "open" : ""}`} onClick={closeCart} />
      <aside className={`drawer ${cartOpen ? "open" : ""}`} aria-label="Shopping cart">
        <div className="drawer-head">
          <h3>Packing slip</h3>
          <button className="close-btn" onClick={closeCart} aria-label="Close cart">
            ✕
          </button>
        </div>
        <div className="drawer-items">
          {items.length === 0 ? (
            <div className="empty-msg">
              Your cart is empty.
              <br />
              Nothing packed yet.
            </div>
          ) : (
            items.map((i) => (
              <div className="cart-item" key={i.variantId}>
                <div>
                  <div className="ci-name">{i.name}</div>
                  <div className="ci-meta">
                    Size {i.size} · {formatPKR(i.unitPrice)} each{i.salePct ? ` · ${i.salePct}% off` : ""}
                  </div>
                  <div className="ci-controls">
                    <button className="qty-btn" onClick={() => changeQty(i.variantId, -1)} aria-label="Decrease quantity">
                      −
                    </button>
                    <span className="ci-qty">{i.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(i.variantId, 1)} aria-label="Increase quantity">
                      +
                    </button>
                    <button className="remove-btn" onClick={() => removeItem(i.variantId)}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="ci-price">{formatPKR(i.unitPrice * i.qty)}</div>
              </div>
            ))
          )}
        </div>
        <div className="drawer-foot">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{formatPKR(sub)}</span>
          </div>
          <div className="total-row">
            <span>Shipping</span>
            <span>{ship === 0 ? (sub > 0 ? "Free" : formatPKR(0)) : formatPKR(ship)}</span>
          </div>
          <div className="total-row grand">
            <span>Total</span>
            <span>{formatPKR(grand)}</span>
          </div>
          <button className="checkout-btn" disabled={items.length === 0} onClick={openCheckout}>
            Proceed to checkout
          </button>
        </div>
      </aside>
    </>
  );
}
