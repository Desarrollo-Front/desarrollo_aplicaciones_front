import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './Gateway.css';
import visaLogo from '../assets/logos/Visa.png';
import mcLogo from '../assets/logos/mastercard.png';
import amexLogo from '../assets/logos/amex.png';
import mpLogo from '../assets/logos/mercadopago.png';

export default function Gateway() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [method, setMethod] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardMask, setCardMask] = useState('');
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
      : null
  );
  const [loading, setLoading] = useState(!state);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [cardData, setCardData] = useState(null);

  const api = (path, opts = {}) => {
    const authHeader =
      localStorage.getItem('authHeader') ||
      `${localStorage.getItem('tokenType') || 'Bearer'} ${localStorage.getItem('token') || ''}`;
    const base = 'http://18.191.118.13:8080';
    return fetch(`${base}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        ...(opts.headers || {}),
      },
      ...opts,
    });
  };

  const fetchJsonOrText = async (res) => {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        return await res.json();
      } catch {
        return await res.text();
      }
    }
    return await res.text();
  };

  useEffect(() => {
    if (state) {
      setLoading(false);
      return;
    }
    const fetchPayment = async () => {
      try {
        const res = await api(`/api/payments/${id}`);
        if (!res.ok) throw new Error((await fetchJsonOrText(res)) || 'No se pudo obtener el pago.');
        const p = await res.json();
        setPayment(p);
      } catch (e) {
        setError(e.message || 'Error inesperado.');
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [id, state]);

  const money = (n, curr = 'ARS', locale = 'es-AR') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: curr }).format(Number(n || 0));

  const resumen = useMemo(() => {
    if (!payment) return null;
    const currency = String(payment.currency || 'ARS').toUpperCase();
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
    if (m === 'card') setShowCardModal(true);
  };

  const setPaymentMethod = async (paymentId, type) => {
    const body =
      type === 'CREDIT_CARD' || type === 'DEBIT_CARD'
        ? {
            paymentMethodType: type,
            cardNumber: cardData?.cardNumber,
            cardHolderName: cardData?.cardHolderName,
            expirationMonth: cardData?.expirationMonth,
            expirationYear: cardData?.expirationYear,
            cvv: cardData?.cvv,
          }
        : { paymentMethodType: 'MERCADO_PAGO' };

    const res = await api(`/api/payments/${paymentId}/payment-method`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = res.headers.get('Error-Message') || (await fetchJsonOrText(res));
      throw new Error(msg || 'No se pudo asignar el método de pago.');
    }
    return res.json();
  };

  const comprar = async () => {
    if (!method) {
      alert('Elegí un método de pago.');
      return;
    }
    if (!payment) return;

    setProcessing(true);
    setError('');
    setOkMsg('');

    try {
      const type =
        method === 'card'
          ? cardData?.kind === 'debit'
            ? 'DEBIT_CARD'
            : 'CREDIT_CARD'
          : 'MERCADO_PAGO';

      if ((type === 'CREDIT_CARD' || type === 'DEBIT_CARD') && !cardData)
        throw new Error('Falta completar la tarjeta.');

      await setPaymentMethod(payment.id, type);

      const res2 = await api(`/api/payments/${payment.id}/confirm`, {
        method: 'PUT',
      });
      if (!res2.ok) {
        const serverMsg = res2.headers.get('Error-Message');
        const fallback = await fetchJsonOrText(res2);
        throw new Error(serverMsg || fallback || 'No se pudo confirmar el pago.');
      }

      const updated = await res2.json();
      setPayment(updated);
      setOkMsg('Pago confirmado correctamente.');
      navigate(`/pagos`);
    } catch (e) {
      setError(e.message || 'Error al procesar el pago.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="gx-wrap">
      <div className="gx-head">
        <button className="gx-btn gx-btn--ghost gx-back" onClick={() => navigate('/pagos')}>
          ← Volver
        </button>
        <h1 className="gx-title">Medio de pago</h1>
        <div className="gx-spacer" />
      </div>

      {okMsg && <div className="gx-banner gx-banner--ok"><i className="ri-check-line" /> {okMsg}</div>}
      {error && <div className="gx-banner gx-banner--warn"><i className="ri-error-warning-line" /> {error}</div>}

      <section className="gx-grid">
        <aside className="gx-card">
          <div className="gx-list">
            <label className={`gx-option ${method === 'card' ? 'is-on' : ''}`}>
              <input
                type="radio"
                name="method"
                checked={method === 'card'}
                onChange={() => onSelectMethod('card')}
              />
              <div className="gx-option-main">
                <div className="gx-logos">
                  <img src={visaLogo} alt="Visa" className="gx-logo-img" />
                  <img src={mcLogo} alt="Mastercard" className="gx-logo-img" />
                  <img src={amexLogo} alt="American Express" className="gx-logo-img" />
                </div>
                <div className="gx-texts">
                  <div className="gx-ttl">Tarjetas de crédito y débito</div>
                  <div className={`gx-sub ${cardMask ? 'gx-sub-strong' : ''}`}>
                    {cardMask || 'Visa, Mastercard, American Express y más…'}
                  </div>
                </div>
              </div>
            </label>

            <label className={`gx-option ${method === 'mp' ? 'is-on' : ''}`}>
              <input
                type="radio"
                name="method"
                checked={method === 'mp'}
                onChange={() => onSelectMethod('mp')}
              />
              <div className="gx-option-main">
                <div className="gx-logos">
                  <img src={mpLogo} alt="MercadoPago" className="gx-logo-img gx-logo-mp" />
                </div>
                <div className="gx-texts">
                  <div className="gx-ttl">MercadoPago</div>
                  <div className="gx-sub">Pagá con billetera, saldo o QR.</div>
                </div>
              </div>
            </label>
          </div>
        </aside>

        <aside className="gx-card gx-summary">
          <header className="gx-sum-h">Resumen de la compra</header>
          {loading && <div className="gx-empty">Cargando…</div>}
          {!loading && error && <div className="gx-empty">{error}</div>}
          {!loading && !error && resumen && (
            <>
              <div className="gx-sum-row">
                <span>Subtotal</span>
                <b>{resumen.subtotalFmt}</b>
              </div>
              <div className="gx-sum-row">
                <span>Impuestos y cargos</span>
                <b>{resumen.taxesFmt}</b>
              </div>
              <div className="gx-sum-row gx-sum-total">
                <span>Total</span>
                <b>{resumen.totalFmt}</b>
              </div>
              <button className="gx-btn gx-btn--pri gx-buy" onClick={comprar} disabled={processing}>
                {processing ? 'Procesando…' : 'Comprar'}
              </button>
            </>
          )}
        </aside>
      </section>

      {showCardModal && (
        <CardModal
          currency={resumen?.currency || 'ARS'}
          onClose={() => setShowCardModal(false)}
          onContinue={(form) => {
            const digits = form.number.replace(/\D/g, '');
            const last4 = digits.slice(-4).padStart(4, '•');
            const mask = `•••• •••• •••• ${last4}`;
            setCardMask(mask);
            const [mm, yy] = (form.exp || '').split('/');
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
    kind: 'credit',
    number: '',
    name: '',
    exp: '',
    cvv: '',
    docType: 'DNI',
    doc: '',
  });
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const ok =
      form.number.replace(/\s/g, '').length >= 12 &&
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
    <div className="gx-modal-ov" role="dialog" aria-modal="true">
      <div className="gx-modal">
        <header className="gx-modal-h">
          <div className="gx-modal-ttl">
            <span className="gx-logo-card" />
            <b>Nueva tarjeta</b>
          </div>
          <button className="gx-btn gx-btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="gx-fields">
          <label className="gx-field">
            <span>Tipo de tarjeta</span>
            <select className="gx-input" name="kind" value={form.kind} onChange={onChange}>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
            </select>
          </label>

          <label className="gx-field">
            <span>Número de tarjeta</span>
            <input
              className="gx-input"
              name="number"
              placeholder="1234 1234 1234 1234"
              value={form.number}
              onChange={onChange}
              inputMode="numeric"
              autoFocus
            />
          </label>

          <label className="gx-field">
            <span>Nombre del titular</span>
            <input
              className="gx-input"
              name="name"
              placeholder="Ej.: María López"
              value={form.name}
              onChange={onChange}
            />
          </label>

          <div className="gx-row">
            <label className="gx-field">
              <span>Vencimiento</span>
              <input
                className="gx-input"
                name="exp"
                placeholder="MM/AA"
                value={form.exp}
                onChange={onChange}
                maxLength={5}
              />
            </label>

            <label className="gx-field">
              <span>Código de seguridad</span>
              <input
                className="gx-input"
                name="cvv"
                placeholder="Ej.: 123"
                value={form.cvv}
                onChange={onChange}
                maxLength={4}
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="gx-row">
            <label className="gx-field">
              <span>Documento del titular</span>
              <select className="gx-input" name="docType" value={form.docType} onChange={onChange}>
                <option>DNI</option>
                <option>CUIL</option>
                <option>CUIT</option>
                <option>Pasaporte</option>
              </select>
            </label>
            <label className="gx-field">
              <span>&nbsp;</span>
              <input
                className="gx-input"
                name="doc"
                placeholder="99.999.999"
                value={form.doc}
                onChange={onChange}
              />
            </label>
          </div>
        </div>

        <div className="gx-modal-actions">
          <button className="gx-btn gx-btn--pri" onClick={() => onContinue(form)} disabled={!valid}>
            Continuar
          </button>
        </div>
        <small className="gx-help">
          Se realizará una verificación de tarjeta. Moneda: {currency}
        </small>
      </div>
    </div>
  );
}
