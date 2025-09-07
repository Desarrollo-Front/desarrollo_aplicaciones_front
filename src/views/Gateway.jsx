import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "./Gateway.css";
import visaLogo from "../assets/logos/Visa.png";
import mcLogo from "../assets/logos/mastercard.png";
import amexLogo from "../assets/logos/amex.png";
import mpLogo from "../assets/logos/mercadopago.png";

export default function Gateway() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [method, setMethod] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardMask, setCardMask] = useState("");
  const [payment, setPayment] = useState(state ? {
    id: state.id,
    currency: state.currency,
    amount_subtotal: state.subtotal,
    taxes: state.taxesAndFees ?? 0,
    fees: 0,
    amount_total: state.total
  } : null);
  const [loading, setLoading] = useState(!state);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const authHeader =
          localStorage.getItem("authHeader") ||
          `${localStorage.getItem("tokenType") || "Bearer"} ${localStorage.getItem("token") || ""}`;
        const res = await fetch(`http://localhost:8080/api/payments/${id}`, {
          headers: { "Content-Type": "application/json", Authorization: authHeader }
        });
        if (!res.ok) throw new Error("No se pudo obtener el pago.");
        const p = await res.json();
        setPayment(p);
      } catch (e) {
        setError(e.message || "Error inesperado.");
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [id]);

  const money = (n, curr = "ARS", locale = "es-AR") =>
    new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(Number(n || 0));

  const resumen = useMemo(() => {
    if (!payment) return null;
    const currency = String(payment.currency || "ARS").toUpperCase();
    const subtotal = Number(payment.amount_subtotal || 0);
    const taxes = Number(payment.taxes || 0);
    const fees = Number(payment.fees || 0);
    const total = Number(payment.amount_total || subtotal + taxes + fees);
    return { subtotalFmt: money(subtotal, currency), taxesFmt: money(taxes + fees, currency), totalFmt: money(total, currency), currency };
  }, [payment]);

  const onSelectMethod = (m) => {
    setMethod(m);
    if (m === "card") setShowCardModal(true);
  };

  const comprar = async () => {
    if (!method) {
      alert("Elegí un método de pago.");
      return;
    }
    if (!payment) return;
    setProcessing(true);
    setError("");
    setOkMsg("");
    try {
      const authHeader =
        localStorage.getItem("authHeader") ||
        `${localStorage.getItem("tokenType") || "Bearer"} ${localStorage.getItem("token") || ""}`;
      const paymentMethodType = method === "card" ? "credit_card" : "bank_transfer";
      const res = await fetch(`http://localhost:8080/api/payments/${payment.id}/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          paymentMethodType,
          paymentMethodId: method === "card" ? "pm_demo" : "mp_transfer",
          captureImmediately: true,
          metadata: "{}"
        })
      });
      if (!res.ok) throw new Error("No se pudo confirmar el pago.");
      const updated = await res.json();
      setPayment(updated);
      setOkMsg("Pago confirmado correctamente.");
      navigate(`/pagos`);
    } catch (e) {
      setError(e.message || "Error al confirmar el pago.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="pl-wrap gw-wrap">
      <button className="pl-btn pl-btn--ghost gw-back" onClick={() => navigate("/pagos")}>← Volver</button>
      <h1 className="pl-title gw-title">Medio de pago</h1>

      {okMsg && <div className="gw-banner ok">{okMsg}</div>}
      {error && <div className="gw-banner warn">{error}</div>}

      <section className="gw-grid">
        <aside className="gw-card">
          <div className="gw-list">
            <label className={`gw-option ${method === "card" ? "is-on" : ""}`}>
              <input type="radio" name="method" checked={method === "card"} onChange={() => onSelectMethod("card")} />
              <div className="gw-option-main">
                <div className="gw-option-logos">
                  <img src={visaLogo} alt="Visa" className="gw-logo-img" />
                  <img src={mcLogo} alt="Mastercard" className="gw-logo-img" />
                  <img src={amexLogo} alt="American Express" className="gw-logo-img" />
                </div>
                <div className="gw-option-texts">
                  <div className="gw-ttl">Tarjetas de crédito y débito</div>
                  <div className={`gw-sub ${cardMask ? "gw-sub-strong" : ""}`}>
                    {cardMask || "Visa, Mastercard, American Express y más…"}
                  </div>
                </div>
              </div>
            </label>

            <label className={`gw-option ${method === "mp" ? "is-on" : ""}`}>
              <input type="radio" name="method" checked={method === "mp"} onChange={() => onSelectMethod("mp")} />
              <div className="gw-option-main">
                <div className="gw-option-logos">
                  <img src={mpLogo} alt="MercadoPago" className="gw-logo-gw-logo-img gw-logo-mp" />
                </div>
                <div className="gw-option-texts">
                  <div className="gw-ttl">MercadoPago</div>
                  <div className="gw-sub">Pagá con tarjeta, transferencia o saldo en cuenta.</div>
                </div>
              </div>
            </label>
          </div>
        </aside>

        <aside className="gw-card gw-summary">
          <header className="gw-sum-h">Resumen de la compra</header>
          {loading && <div className="gw-empty">Cargando…</div>}
          {!loading && error && <div className="gw-empty">{error}</div>}
          {!loading && !error && resumen && (
            <>
              <div className="gw-sum-row"><span>Subtotal</span><b>{resumen.subtotalFmt}</b></div>
              <div className="gw-sum-row"><span>Impuestos y cargos</span><b>{resumen.taxesFmt}</b></div>
              <div className="gw-sum-row gw-sum-total"><span>Total</span><b>{resumen.totalFmt}</b></div>
              <button className="pl-btn pl-btn--ver gw-buy" onClick={comprar} disabled={processing}>{processing ? "Procesando…" : "Comprar"}</button>
            </>
          )}
        </aside>
      </section>

      {showCardModal && (
        <CardModal
          currency={resumen?.currency || "ARS"}
          onClose={() => setShowCardModal(false)}
          onContinue={(form) => {
            const digits = form.number.replace(/\D/g, "");
            const last4 = digits.slice(-4).padStart(4, "•");
            const mask = `•••• •••• •••• ${last4}`;
            setCardMask(mask);
            setShowCardModal(false);
          }}
        />
      )}
    </div>
  );
}

function CardModal({ onClose, onContinue, currency }) {
  const [form, setForm] = useState({ number: "", name: "", exp: "", cvv: "", docType: "DNI", doc: "" });
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const ok =
      form.number.replace(/\s/g, "").length >= 12 &&
      form.name.trim().length > 3 &&
      /^\d{2}\/\d{2}$/.test(form.exp) &&
      form.cvv.length >= 3 &&
      form.doc.trim().length >= 6;
    setValid(ok);
  }, [form]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  return (
    <div className="gw-modal-ov" role="dialog" aria-modal="true">
      <div className="gw-modal">
        <header className="gw-modal-h">
          <div className="gw-modal-ttl">
            <span className="gw-logo gw-logo-card" />
            <b>Nueva tarjeta de crédito</b>
          </div>
          <button className="pl-btn pl-btn--ghost" onClick={onClose}>Cerrar</button>
        </header>

        <div className="gw-fields">
          <label className="gw-field">
            <span>Número de tarjeta</span>
            <input className="pl-input" name="number" placeholder="1234 1234 1234 1234" value={form.number} onChange={onChange} inputMode="numeric" autoFocus />
          </label>

          <label className="gw-field">
            <span>Nombre del titular</span>
            <input className="pl-input" name="name" placeholder="Ej.: María López" value={form.name} onChange={onChange} />
          </label>

          <div className="gw-row">
            <label className="gw-field">
              <span>Vencimiento</span>
              <input className="pl-input" name="exp" placeholder="MM/AA" value={form.exp} onChange={onChange} maxLength={5} />
            </label>

            <label className="gw-field">
              <span>Código de seguridad</span>
              <input className="pl-input" name="cvv" placeholder="Ej.: 123" value={form.cvv} onChange={onChange} maxLength={4} inputMode="numeric" />
            </label>
          </div>

          <div className="gw-row">
            <label className="gw-field">
              <span>Documento del titular</span>
              <select className="pl-input" name="docType" value={form.docType} onChange={onChange}>
                <option>DNI</option>
                <option>CUIL</option>
                <option>CUIT</option>
                <option>Pasaporte</option>
              </select>
            </label>
            <label className="gw-field">
              <span>&nbsp;</span>
              <input className="pl-input" name="doc" placeholder="99.999.999" value={form.doc} onChange={onChange} />
            </label>
          </div>
        </div>

        <div className="gw-modal-actions">
          <button className="pl-btn pl-btn--ver" onClick={() => onContinue(form)} disabled={!valid}>Continuar</button>
        </div>
        <small className="gw-help">Se realizará una verificación de tarjeta. Moneda: {currency}</small>
      </div>
    </div>
  );
}
