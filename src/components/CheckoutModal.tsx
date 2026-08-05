"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, cartSubtotal } from "@/lib/cartStore";
import { useUIStore, useToastStore } from "@/lib/uiStore";
import { formatPKR } from "@/lib/types";
import { trackFbEvent } from "@/lib/fbPixel";
import type { BankDetails } from "@/lib/settings";

type FieldKey = "name" | "phone" | "city" | "address";

type OrderResult = {
  orderNumber: string;
  total: number;
  paymentMethod: "COD" | "BANK_TRANSFER";
  bankDetails: BankDetails | null;
};

export default function CheckoutModal({
  shippingFee,
  freeShippingThreshold,
}: {
  shippingFee: number;
  freeShippingThreshold: number;
}) {
  const { checkoutOpen, closeCheckout } = useUIStore();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const show = useToastStore((s) => s.show);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [payMethod, setPayMethod] = useState<"COD" | "BANK_TRANSFER">("COD");
  const [errors, setErrors] = useState<Set<FieldKey>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResult | null>(null);

  useEffect(() => {
    if (!checkoutOpen) return;
    trackFbEvent("InitiateCheckout", {
      content_ids: items.map((i) => i.productId),
      value: cartSubtotal(items),
      currency: "PKR",
      num_items: items.reduce((n, i) => n + i.qty, 0),
    });
    // Fire once per time the checkout modal is opened — not on every cart
    // edit made while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen]);

  const sub = cartSubtotal(items);
  const ship = sub === 0 || sub >= freeShippingThreshold ? 0 : shippingFee;
  const grand = sub + ship;

  function validate(): boolean {
    const bad = new Set<FieldKey>();
    if (name.trim().length < 2) bad.add("name");
    if (!/[0-9]{9,}/.test(phone.replace(/[^0-9]/g, ""))) bad.add("phone");
    if (city.trim().length < 2) bad.add("city");
    if (address.trim().length < 8) bad.add("address");
    setErrors(bad);
    return bad.size === 0;
  }

  async function placeOrder() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          city,
          address,
          paymentMethod: payMethod,
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Something went wrong. Please try again.");
        return;
      }
      trackFbEvent("Purchase", {
        content_ids: items.map((i) => i.productId),
        content_type: "product",
        value: data.total,
        currency: "PKR",
        num_items: items.reduce((n, i) => n + i.qty, 0),
      });
      setResult(data);
    } catch {
      setServerError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function finishOrder() {
    clearCart();
    closeCheckout();
    show("Order confirmed — thank you!");
    // reset local form state for next time
    setTimeout(() => {
      setName("");
      setPhone("");
      setCity("");
      setAddress("");
      setPayMethod("COD");
      setErrors(new Set());
      setResult(null);
      setServerError(null);
    }, 300);
  }

  if (!checkoutOpen && !result) return null;

  return (
    <div className={`modal ${checkoutOpen ? "open" : ""}`}>
      <div className="modal-box">
        <div className="modal-head">
          <h3>{result ? "Order placed" : "Checkout"}</h3>
          <button className="close-btn" onClick={closeCheckout} aria-label="Close checkout">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {result ? (
            <div className="confirm-box">
              <div className="big">✓</div>
              <h3>Order placed</h3>
              <div className="order-no">{result.orderNumber}</div>
              <p>
                Shukriya, {name}! Your order of {formatPKR(result.total)} is confirmed.{" "}
                {result.paymentMethod === "COD"
                  ? "Keep cash ready — delivery in 2–4 working days."
                  : "Bank details are below — please transfer to confirm your order."}{" "}
                Save your order number to track it any time.
              </p>
              {result.bankDetails && (
                <div className="summary" style={{ textAlign: "left" }}>
                  <div className="summary-row">
                    <span>Bank</span>
                    <span>{result.bankDetails.bankName}</span>
                  </div>
                  <div className="summary-row">
                    <span>Account title</span>
                    <span>{result.bankDetails.accountTitle}</span>
                  </div>
                  <div className="summary-row">
                    <span>Account number</span>
                    <span>{result.bankDetails.accountNumber}</span>
                  </div>
                  <div className="summary-row">
                    <span>IBAN</span>
                    <span>{result.bankDetails.iban}</span>
                  </div>
                  <div className="summary-row">
                    <span>Branch</span>
                    <span>{result.bankDetails.branch}</span>
                  </div>
                </div>
              )}
              <button className="confirm-close" onClick={finishOrder}>
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              <div className="summary">
                {items.map((i) => (
                  <div className="summary-row" key={i.variantId}>
                    <span>
                      {i.qty}× {i.name} ({i.size})
                    </span>
                    <span>{formatPKR(i.unitPrice * i.qty)}</span>
                  </div>
                ))}
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{ship === 0 ? "Free" : formatPKR(ship)}</span>
                </div>
                <div className="summary-row grand">
                  <span>Total</span>
                  <span>{formatPKR(grand)}</span>
                </div>
              </div>

              <div className={`field ${errors.has("name") ? "invalid" : ""}`}>
                <label htmlFor="inName">Full name</label>
                <input id="inName" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                <span className="err">Please enter your name</span>
              </div>
              <div className="form-row">
                <div className={`field ${errors.has("phone") ? "invalid" : ""}`}>
                  <label htmlFor="inPhone">Phone (WhatsApp)</label>
                  <input
                    id="inPhone"
                    type="tel"
                    placeholder="03XX-XXXXXXX"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <span className="err">Enter a valid phone number</span>
                </div>
                <div className={`field ${errors.has("city") ? "invalid" : ""}`}>
                  <label htmlFor="inCity">City</label>
                  <input
                    id="inCity"
                    type="text"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <span className="err">Please enter your city</span>
                </div>
              </div>
              <div className={`field ${errors.has("address") ? "invalid" : ""}`}>
                <label htmlFor="inAddr">Delivery address</label>
                <textarea
                  id="inAddr"
                  rows={2}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <span className="err">Please enter your address</span>
              </div>
              <div className="field">
                <label>Payment method</label>
                <div className="pay-options">
                  <button
                    type="button"
                    className={`pay-opt ${payMethod === "COD" ? "selected" : ""}`}
                    onClick={() => setPayMethod("COD")}
                  >
                    Cash on delivery
                  </button>
                  <button
                    type="button"
                    className={`pay-opt ${payMethod === "BANK_TRANSFER" ? "selected" : ""}`}
                    onClick={() => setPayMethod("BANK_TRANSFER")}
                  >
                    Bank transfer
                  </button>
                </div>
              </div>
              <div className="note">
                {payMethod === "COD"
                  ? "Pay the rider in cash when your order arrives."
                  : "We'll show our bank details once your order is confirmed."}
              </div>
              {serverError && (
                <div className="note" style={{ color: "var(--sale)" }}>
                  {serverError}
                </div>
              )}
              <br />
              <button className="place-btn" onClick={placeOrder} disabled={submitting || items.length === 0}>
                {submitting ? "Placing order…" : "Place order"}
              </button>
              <div className="note">
                By ordering you agree to our{" "}
                <Link href="/info/terms" target="_blank">
                  terms
                </Link>{" "}
                and{" "}
                <Link href="/info/returns" target="_blank">
                  exchange policy
                </Link>
                .
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
