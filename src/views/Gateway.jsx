import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Gateway.css";

export default function Gateway() {
  const { id } = useParams();             // /pago/:id
  const navigate = useNavigate();

  // método elegido: 'card' | 'mp' | null
  const [method, setMethod] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // (opcional) datos del pago: podrías traerlos del backend /api/payments/:id
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  // DEMO: si no querés fetch por ahora, dejamos valores de fallback
  useEffect(() => {
    // TODO: si tenés endpoint de detalle, hacé el fetch acá y seteá payment
    // const authHeader = localStorage.getItem("authHeader");
    // const res = await fetch(`http://localhost:8080/api/payments/${id}`, { headers: { Authorization: authHeader }});
    // const data = await res.json(); setPayment(data);

    // Fallback para que se vea lindo:
    setPayment({
      id,
      title: `Pago #${id}`,
      image: "", // podrías mostrar un thumb si tenés
      currency: "ARS",
      subtotal: 5000,
      taxes: 500,
      total: 5500,
    });
    setLoading(false);
  }, [id]);

  const money = (n, curr = "ARS", locale = "es-AR") =>
    new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);

  const resumen = useMemo(() => {
    if (!payment) return null;
    const { currency, subtotal, taxes, total } = payment;
    return {
      subtotalFmt: money(subtotal, currency),
      taxesFmt: money(taxes, currency),
      totalFmt: money(total, currency),
      currency,
    };
  }, [payment]);

  const onSelectMethod = (m) => {
    setMethod(m);
    if (m === "card") setShowCardModal(true); // abrir modal al tocar tarjeta
  };

  const comprar = () => {
    if (method === "card") {
      setShowCardModal(true);
    } else if (method === "mp") {
      // TODO: redirección / init MP
      alert("Aquí iniciarías el flujo de MercadoPago.");
    } else {
      alert("Elegí un método de pago.");
    }
  };

  return (
    <div className="pl-wrap gw-wrap">
      {/* Volver */}
      <button className="pl-btn pl-btn--ghost gw-back" onClick={() => navigate("/pagos")}>
        ← Volver
      </button>

      <h1 className="pl-title gw-title">Medio de pago</h1>

      <section className="gw-grid">
        {/* Columna: métodos */}
        <aside className="gw-card">
          <div className="gw-list">
            {/* Tarjeta */}
            <label className={`gw-option ${method === "card" ? "is-on" : ""}`}>
              <input
                type="radio"
                name="method"
                checked={method === "card"}
                onChange={() => onSelectMethod("card")}
              />
              <div className="gw-option-main">
                <div className="gw-option-logos">
                  <span className="gw-logo gw-visa" />
                  <span className="gw-logo gw-master" />
                  <span className="gw-logo gw-amex" />
                  <span className="gw-logo gw-card" />
                </div>
                <div className="gw-option-texts">
                  <div className="gw-ttl">Tarjetas de crédito y débito</div>
                  <div className="gw-sub">Visa, Mastercard, American Express y más…</div>
                </div>
              </div>
            </label>

            {/* MP / billetera */}
            <label className={`gw-option ${method === "mp" ? "is-on" : ""}`}>
              <input
                type="radio"
                name="method"
                checked={method === "mp"}
                onChange={() => onSelectMethod("mp")}
              />
              <div className="gw-option-main">
                <div className="gw-option-logos">
                  <span className="gw-logo gw-mp" />
                </div>
                <div className="gw-option-texts">
                  <div className="gw-ttl">MercadoPago</div>
                  <div className="gw-sub">Pagá con tarjeta, transferencia o saldo en cuenta.</div>
                </div>
              </div>
            </label>
          </div>
        </aside>

        {/* Columna: resumen */}
        <aside className="gw-card gw-summary">
          <header className="gw-sum-h">Resumen de la compra</header>

          {loading || !resumen ? (
            <div className="gw-empty">Cargando…</div>
          ) : (
            <>
              <div className="gw-sum-row">
                <span>Subtotal</span>
                <b>{resumen.subtotalFmt}</b>
              </div>
              <div className="gw-sum-row">
                <span>Impuestos</span>
                <b>{resumen.taxesFmt}</b>
              </div>
              <div className="gw-sum-row gw-sum-total">
                <span>Total</span>
                <b>{resumen.totalFmt}</b>
              </div>

              <button className="pl-btn pl-btn--ver gw-buy" onClick={comprar}>
                Comprar
              </button>

              
            </>
          )}
        </aside>
      </section>

      {/* MODAL TARJETA */}
      {showCardModal && (
        <CardModal
          currency={payment?.currency || "ARS"}
          onClose={() => setShowCardModal(false)}
          onContinue={() => {
            setShowCardModal(false);
            alert("Continuar con tokenización/confirmación de tarjeta.");
          }}
        />
      )}
    </div>
  );
}

/* -------- Modal de Tarjeta -------- */

function CardModal({ onClose, onContinue, currency }) {
  const [form, setForm] = useState({
    number: "",
    name: "",
    exp: "",
    cvv: "",
    docType: "DNI",
    doc: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  return (
    <div className="gw-modal-ov" role="dialog" aria-modal="true">
      <div className="gw-modal">
        <header className="gw-modal-h">
          <div className="gw-modal-ttl">
            <span className="gw-logo gw-card" />
            <b>Nueva tarjeta de crédito</b>
          </div>
          <button className="pl-btn pl-btn--ghost" onClick={onClose}>Cerrar</button>
        </header>

        <div className="gw-fields">
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
              <select className="pl-input" name="docType" value={form.docType} onChange={onChange}>
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
          <button className="pl-btn pl-btn--ver" onClick={onContinue}>
            Continuar
          </button>
        </div>
        <small className="gw-help">Se realizará una verificación de tarjeta. Moneda: {currency}</small>
      </div>
    </div>
  );
}
