import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './Gateway.css';
import visaLogo from '../assets/logos/Visa.png';
import mcLogo from '../assets/logos/mastercard.png';
import amexLogo from '../assets/logos/amex.png';
import mpLogo from '../assets/logos/mercadopago.png';
const API_URL = import.meta.env.VITE_API_URL;

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
          status: state.status || null,
        }
      : null
  );
  const [loading, setLoading] = useState(!state);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [cardData, setCardData] = useState(null);
  const [alerta, setAlerta] = useState({ show: false, tipo: 'info', mensaje: '' });

  const mostrarAlerta = (mensaje, tipo = 'info') => {
    setAlerta({ show: true, tipo, mensaje });
    setTimeout(() => setAlerta({ show: false, tipo: 'info', mensaje: '' }), 4000);
  };

  const api = (path, opts = {}) => {
    const authHeader =
      localStorage.getItem('authHeader') ||
      `${localStorage.getItem('tokenType') || 'Bearer'} ${localStorage.getItem('token') || ''}`;

    return fetch(`${API_URL}${path}`, {
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

  const loadPayment = async (paymentId) => {
    const res = await api(`/api/payments/${paymentId}`);
    if (!res.ok) throw new Error((await fetchJsonOrText(res)) || 'No se pudo obtener el pago.');
    const p = await res.json();
    setPayment(p);
    return p;
  };

  useEffect(() => {
    if (state) {
      setLoading(false);
      return;
    }
    const fetchPayment = async () => {
      try {
        await loadPayment(id);
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
            documentType: cardData?.docType,
            documentNumber: cardData?.doc,
            brand: cardData?.brand,
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

  const ensurePendingBeforePurchase = async (paymentId) => {
    const current = payment?.status ? payment : await loadPayment(paymentId);
    if (String(current.status || '').toUpperCase() === 'REJECTED') {
      const res = await api(`/api/payments/${paymentId}/retry-balance`, { method: 'POST' });
      if (!res.ok) {
        const serverMsg = res.headers.get('Error-Message');
        const fallback = await fetchJsonOrText(res);
        const msg = serverMsg || fallback || 'No hay saldo suficiente para reintentar el pago.';
        throw new Error(msg);
      }
      const updated = await res.json();
      setPayment(updated);
      const s = String(updated.status || '').toUpperCase();
      if (s !== 'PENDING_PAYMENT') {
        mostrarAlerta('No pudimos reservar el saldo para este pago.', 'error');
        throw new Error('Retry balance no dejó el pago en PENDING_PAYMENT');
      }
      return updated;
    }
    return current;
  };

  const comprar = async () => {
    if (!method) {
      mostrarAlerta('Elegí un método de pago.', 'error');
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

      if ((type === 'CREDIT_CARD' || type === 'DEBIT_CARD') && !cardData) {
        mostrarAlerta('Falta completar la tarjeta.', 'error');
        setProcessing(false);
        return;
      }

      const readyPayment = await ensurePendingBeforePurchase(payment.id);

      await setPaymentMethod(readyPayment.id, type);

      const res2 = await api(`/api/payments/${readyPayment.id}/confirm`, {
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

      {okMsg && (
        <div className="gx-banner gx-banner--ok">
          <i className="ri-check-line" /> {okMsg}
        </div>
      )}

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
                  <div className="gx-sub">Pagá con tu dinero disponible en cuenta.</div>
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
                {processing ? 'Procesando…' : 'Pagar'}
              </button>
            </>
          )}
        </aside>
      </section>

      {showCardModal && (
        <CardModal
          currency={resumen?.currency || 'ARS'}
          onClose={() => setShowCardModal(false)}
          onInvalid={(msg) => mostrarAlerta(msg, 'error')}
          onContinue={(form, meta) => {
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
              docType: form.docType,
              doc: form.doc,
              brand: meta.brand,
            });
            setShowCardModal(false);
          }}
        />
      )}

      {alerta.show && (
        <div className={`pd-alert pd-alert--${alerta.tipo}`}>
          {alerta.mensaje}
          <button
            className="pd-alert-x"
            onClick={() => setAlerta({ show: false, tipo: 'info', mensaje: '' })}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function CardModal({ onClose, onContinue, onInvalid, currency }) {
  const [form, setForm] = useState({
    kind: 'credit',
    number: '',
    name: '',
    exp: '',
    cvv: '',
    docType: 'DNI',
    doc: '',
  });
  const [errs, setErrs] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [valid, setValid] = useState(false);

  const onlyDigits = (s) => s.replace(/\D/g, '');

  const validName = (s) => /^[a-zA-ZÀ-ÿ\s.'-]{3,60}$/.test((s || '').trim());
  const parseExp = (s) => {
    const m = (s || '').match(/^(\d{2})\/(\d{2})$/);
    if (!m) return null;
    const mm = parseInt(m[1], 10);
    const yy = parseInt(m[2], 10);
    if (mm < 1 || mm > 12) return null;
    const year = 2000 + yy;
    return { mm, year };
  };
  const expInFuture = (mm, year) => {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    return year > cy || (year === cy && mm >= cm);
  };
  const docValid = (type, doc) => {
    const d = onlyDigits(doc || '');
    if (type === 'DNI') return d.length >= 7 && d.length <= 9;
    if (type === 'CUIL' || type === 'CUIT') return d.length === 11;
    if (type === 'Pasaporte') return /^[A-Za-z0-9]{6,12}$/.test(doc || '');
    return d.length >= 6;
  };

  useEffect(() => {
    const e = {};
    const digits = onlyDigits(form.number);
    if (digits && digits.length < 16) e.number = 'Ingresá 16 dígitos';
    if (form.name && !validName(form.name)) e.name = 'Ingresá el nombre del titular';
    const ex = form.exp ? parseExp(form.exp) : null;
    if (form.exp && !ex) e.exp = 'Formato MM/AA';
    else if (ex && !expInFuture(ex.mm, ex.year)) e.exp = 'Tarjeta vencida';
    if (!/^\d{0,3}$/.test(form.cvv)) e.cvv = 'CVV de 3 dígitos';
    if (form.cvv && form.cvv.length !== 3) e.cvv = 'CVV de 3 dígitos';
    if (form.doc && !docValid(form.docType, form.doc)) e.doc = 'Documento inválido';
    setErrs(e);

    const ok = {
      number: digits.length === 16,
      name: validName(form.name || ''),
      exp: (() => {
        const p = parseExp(form.exp || '');
        return !!p && expInFuture(p.mm, p.year);
      })(),
      cvv: /^\d{3}$/.test(form.cvv || ''),
      doc: docValid(form.docType, form.doc || ''),
    };
    setValid(Object.values(ok).every(Boolean));
  }, [form]);

  const showErr = (k) => (submitted || touched[k]) && !!errs[k];

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'number') {
      const digits = onlyDigits(value).slice(0, 16);
      const pretty = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      setForm((s) => ({ ...s, number: pretty }));
      return;
    }
    if (name === 'exp') {
      let v = value.replace(/[^\d/]/g, '');
      if (v.length === 1 && parseInt(v, 10) > 1) v = '0' + v;
      if (v.length === 2 && !v.includes('/')) v = v + '/';
      if (v.length > 5) v = v.slice(0, 5);
      setForm((s) => ({ ...s, exp: v }));
      return;
    }
    if (name === 'cvv') {
      const v = value.replace(/\D/g, '').slice(0, 3);
      setForm((s) => ({ ...s, cvv: v }));
      return;
    }
    if (name === 'doc') {
      const v =
        form.docType === 'Pasaporte' ? value.slice(0, 12) : value.replace(/\D/g, '').slice(0, 11);
      setForm((s) => ({ ...s, doc: v }));
      return;
    }
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const handleContinue = () => {
    setSubmitted(true);
    if (!valid) {
      const firstErr = Object.values(errs)[0] || 'Revisá los datos';
      onInvalid(firstErr);
      return;
    }
    onContinue(form, {});
  };

  return (
    <div className="gx-modal-ov" role="dialog" aria-modal="true">
      <div className="gx-modal">
        <header className="gx-modal-h">
          <div className="gx-modal-ttl">
            <b>Nueva tarjeta</b>
          </div>
          <button className="gx-btn gx-btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="gx-fields">
          <label className="gx-field">
            <span>Tipo de tarjeta</span>
            <select
              className="gx-input"
              name="kind"
              value={form.kind}
              onChange={onChange}
              onBlur={onBlur}
            >
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
            </select>
          </label>

          <label className={`gx-field ${showErr('number') ? 'gx-field--err' : ''}`}>
            <span>Número de tarjeta</span>
            <input
              className="gx-input"
              name="number"
              placeholder="1234 1234 1234 1234"
              value={form.number}
              onChange={onChange}
              onBlur={onBlur}
              inputMode="numeric"
              maxLength={19}
              autoFocus
            />
            {showErr('number') && <small className="gx-err">{errs.number}</small>}
          </label>

          <label className={`gx-field ${showErr('name') ? 'gx-field--err' : ''}`}>
            <span>Nombre del titular</span>
            <input
              className="gx-input"
              name="name"
              placeholder="Ej.: María López"
              value={form.name}
              onChange={onChange}
              onBlur={onBlur}
            />
            {showErr('name') && <small className="gx-err">{errs.name}</small>}
          </label>

          <div className="gx-row">
            <label className={`gx-field ${showErr('exp') ? 'gx-field--err' : ''}`}>
              <span>Vencimiento</span>
              <input
                className="gx-input"
                name="exp"
                placeholder="MM/AA"
                value={form.exp}
                onChange={onChange}
                onBlur={onBlur}
                maxLength={5}
              />
              {showErr('exp') && <small className="gx-err">{errs.exp}</small>}
            </label>

            <label className={`gx-field ${showErr('cvv') ? 'gx-field--err' : ''}`}>
              <span>Código de seguridad</span>
              <input
                className="gx-input"
                name="cvv"
                placeholder="3 dígitos"
                value={form.cvv}
                onChange={onChange}
                onBlur={onBlur}
                maxLength={3}
                inputMode="numeric"
              />
              {showErr('cvv') && <small className="gx-err">{errs.cvv}</small>}
            </label>
          </div>

          <div className="gx-row">
            <label className="gx-field">
              <span>Documento del titular</span>
              <select
                className="gx-input"
                name="docType"
                value={form.docType}
                onChange={onChange}
                onBlur={onBlur}
              >
                <option>DNI</option>
                <option>CUIL</option>
                <option>CUIT</option>
                <option>Pasaporte</option>
              </select>
            </label>
            <label className={`gx-field ${showErr('doc') ? 'gx-field--err' : ''}`}>
              <span>&nbsp;</span>
              <input
                className="gx-input"
                name="doc"
                placeholder="Sin puntos ni guiones"
                value={form.doc}
                onChange={onChange}
                onBlur={onBlur}
              />
              {showErr('doc') && <small className="gx-err">{errs.doc}</small>}
            </label>
          </div>
        </div>

        <div className="gx-modal-actions">
          <button className="gx-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="gx-btn gx-btn--pri" onClick={handleContinue} disabled={!valid}>
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
