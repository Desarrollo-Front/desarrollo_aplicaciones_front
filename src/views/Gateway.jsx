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
  const [payment, setPayment] = useState(
    state
      ? {
          id: state.id,
          currency: state.currency,
          amount_subtotal: state.subtotal,
          taxes: state.taxesAndFees ?? 0,
          fees: 0,
          amount_total: state.total,
        }
      : null,
  );
  const [loading, setLoading] = useState(!state);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [cardData, setCardData] = useState(null);

  const api = (path, opts = {}) => {
    const authHeader =
      localStorage.getItem("authHeader") ||
      `${localStorage.getItem("tokenType") || "Bearer"} ${localStorage.getItem("token") || ""}`;
    const base = "http://localhost:8080";
    return fetch(`${base}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(opts.headers || {}),
      },
      ...opts,
    });
  };

  const fetchJsonOrText = async (res) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        return await res.json();
      } catch {
        return await res.text();
      }
    }
    return await res.text();
  };

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await api(`/api/payments/${id}`);
        if (!res.ok)
          throw new Error(
            (await fetchJsonOrText(res)) || "No se pudo obtener el pago.",
          );
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
    new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(
      Number(n || 0),
    );

  const resumen = useMemo(() => {
    if (!payment) return null;
    const currency = String(payment.currency || "ARS").toUpperCase();
    const subtotal = Number(payment.amount_subtotal || 0);
    const taxes = Number(payment.taxes || 0);
    const fees = Number(payment.fees || 0);
    const total = Number(payment.amount_total || subtotal + taxes + fees);
    return {
      subtotalFmt: money(subtotal, currency),
      taxesFmt: money(taxes + fees, currency),
      totalFmt: money(total, currency),
      currency,
    };
  }, [payment]);

  const onSelectMethod = (m) => {
    setMethod(m);
    if (m === "card") setShowCardModal(true);
  };

  const setPaymentMethod = async (paymentId, type) => {
    const body =
      type === "CREDIT_CARD" || type === "DEBIT_CARD"
        ? {
            paymentMethodType: type,
            cardNumber: cardData?.cardNumber,
            cardHolderName: cardData?.cardHolderName,
            expirationMonth: cardData?.expirationMonth,
            expirationYear: cardData?.expirationYear,
            cvv: cardData?.cvv,
          }
        : { paymentMethodType: "MERCADO_PAGO" };

    const res = await api(`/api/payments/${paymentId}/payment-method`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg =
        res.headers.get("Error-Message") || (await fetchJsonOrText(res));
      throw new Error(msg || "No se pudo asignar el método de pago.");
    }
    return res.json();
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
      const type =
        method === "card"
          ? cardData?.kind === "debit"
            ? "DEBIT_CARD"
            : "CREDIT_CARD"
          : "MERCADO_PAGO";

      if ((type === "CREDIT_CARD" || type === "DEBIT_CARD") && !cardData)
        throw new Error("Falta completar la tarjeta.");

      await setPaymentMethod(payment.id, type);

      const res2 = await api(`/api/payments/${payment.id}/confirm`, {
        method: "PUT",
      });
      if (!res2.ok) {
        const serverMsg = res2.headers.get("Error-Message");
        const fallback = await fetchJsonOrText(res2);
        throw new Error(
          serverMsg || fallback || "No se pudo confirmar el pago.",
        );
      }

      const updated = await res2.json();
      setPayment(updated);
      setOkMsg("Pago confirmado correctamente.");
      navigate(`/pagos`);
    } catch (e) {
      setError(e.message || "Error al procesar el pago.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="pl-wrap gw-wrap">
      <button
        className="pl-btn pl-btn--ghost gw-back"
        onClick={() => navigate("/pagos")}
      >
        ← Volver
      </button>
      <h1 className="pl-title gw-title">Medio de pago</h1>

      {okMsg && <div className="gw-banner ok">{okMsg}</div>}
      {error && <div className="gw-banner warn">{error}</div>}

      <section className="gw-grid">
        <aside className="gw-card">
          <div className="gw-list">
            <label className={`gw-option ${method === "card" ? "is-on" : ""}`}>
              <input
                type="radio"
                name="method"
                checked={method === "card"}
                onChange={() => onSelectMethod("card")}
              />
              <div className="gw-option-main">
                <div className="gw-option-logos">
                  <img src={visaLogo} alt="Visa" className="gw-logo-img" />
                  <img src={mcLogo} alt="Mastercard" className="gw-logo-img" />
                  <img
                    src={amexLogo}
                    alt="American Express"
                    className="gw-logo-img"
                  />
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
              <input
                type="radio"
                name="method"
                checked={method === "mp"}
                onChange={() => onSelectMethod("mp")}
              />
              <div className="gw-option-main">
                <div className="gw-option-logos">
                  <img
                    src={mpLogo}
                    alt="MercadoPago"
                    className="gw-logo-img gw-logo-mp"
                  />
                </div>
                <div className="gw-option-texts">
                  <div className="gw-ttl">MercadoPago</div>
                  <div className="gw-sub">Pagá con billetera, saldo o QR.</div>
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
              <div className="gw-sum-row">
                <span>Subtotal</span>
                <b>{resumen.subtotalFmt}</b>
              </div>
              <div className="gw-sum-row">
                <span>Impuestos y cargos</span>
                <b>{resumen.taxesFmt}</b>
              </div>
              <div className="gw-sum-row gw-sum-total">
                <span>Total</span>
                <b>{resumen.totalFmt}</b>
              </div>
              <button
                className="pl-btn pl-btn--ver gw-buy"
                onClick={comprar}
                disabled={processing}
              >
                {processing ? "Procesando…" : "Comprar"}
              </button>
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
            const [mm, yy] = (form.exp || "").split("/");
            setCardData({
              kind: form.kind,
              cardNumber: digits,
              cardHolderName: form.name.trim(),
              expirationMonth: Number(mm),
              expirationYear: 2000 + Number(yy),
              cvv: form.cvv.trim(),
            });
            setShowCardModal(false);
          }}
        />
      )}
    </div>
  );
}

function CardModal({ onClose, onContinue, currency }) {
  const [form, setForm] = useState({
    kind: "credit",
    number: "",
    name: "",
    exp: "",
    cvv: "",
    docType: "DNI",
    doc: "",
  });
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
            <b>Nueva tarjeta</b>
          </div>
          <button className="pl-btn pl-btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="gw-fields">
          <label className="gw-field">
            <span>Tipo de tarjeta</span>
            <select
              className="pl-input"
              name="kind"
              value={form.kind}
              onChange={onChange}
            >
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
            </select>
          </label>

          <label className="gw-field">
            <span>Número de tarjeta</span>
            <input
              className="pl-input"
              name="number"
              placeholder="1234 1234 1234 1234"
              value={form.number}
              onChange={onChange}
              inputMode="numeric"
              autoFocus
            />
          </label>

          <label className="gw-field">
            <span>Nombre del titular</span>
            <input
              className="pl-input"
              name="name"
              placeholder="Ej.: María López"
              value={form.name}
              onChange={onChange}
            />
          </label>

          <div className="gw-row">
            <label className="gw-field">
              <span>Vencimiento</span>
              <input
                className="pl-input"
                name="exp"
                placeholder="MM/AA"
                value={form.exp}
                onChange={onChange}
                maxLength={5}
              />
            </label>

            <label className="gw-field">
              <span>Código de seguridad</span>
              <input
                className="pl-input"
                name="cvv"
                placeholder="Ej.: 123"
                value={form.cvv}
                onChange={onChange}
                maxLength={4}
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="gw-row">
            <label className="gw-field">
              <span>Documento del titular</span>
              <select
                className="pl-input"
                name="docType"
                value={form.docType}
                onChange={onChange}
              >
                <option>DNI</option>
                <option>CUIL</option>
                <option>CUIT</option>
                <option>Pasaporte</option>
              </select>
            </label>
            <label className="gw-field">
              <span>&nbsp;</span>
              <input
                className="pl-input"
                name="doc"
                placeholder="99.999.999"
                value={form.doc}
                onChange={onChange}
              />
            </label>
          </div>
        </div>

        <div className="gw-modal-actions">
          <button
            className="pl-btn pl-btn--ver"
            onClick={() => onContinue(form)}
            disabled={!valid}
          >
            Continuar
          </button>
        </div>
        <small className="gw-help">
          Se realizará una verificación de tarjeta. Moneda: {currency}
        </small>
      </div>
    </div>
  );
}
