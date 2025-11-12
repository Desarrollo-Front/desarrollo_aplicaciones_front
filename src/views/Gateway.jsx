import React, { useEffect, useMemo, useState } from 'react';
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
    return fetch(`${path}`, {
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
    <div className="gateway-container">
      {/* Header mejorado */}
      <div className="gateway-header">
        <button className="gateway-back-btn" onClick={() => navigate('/pagos')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>
        <div className="gateway-title-section">
          
          <div>
            <h1 className="gateway-title">Medio de pago</h1>
            <p className="gateway-subtitle">Elegí cómo querés pagar tu compra</p>
          </div>
        </div>
        <div > 
        </div>
      </div>

      {/* Banner de éxito */}
      {okMsg && (
        <div className="gateway-banner gateway-banner--success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {okMsg}
        </div>
      )}

      {/* Layout principal */}
      <div className="gateway-main-layout">
        {/* Sección de métodos de pago */}
        <section className="gateway-methods-section">
          <div className="gateway-methods-card">
            <div className="gateway-methods-header">
              <div className="gateway-methods-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="gateway-methods-title">Métodos de pago disponibles</h2>
            </div>
            <div className="gateway-methods-list">
              <label className={`gateway-method-option ${method === 'card' ? 'gateway-method-option--selected' : ''}`}>
                <input
                  type="radio"
                  name="method"
                  checked={method === 'card'}
                  onChange={() => onSelectMethod('card')}
                  className="gateway-method-radio"
                />
                <div className="gateway-method-content">
                  <div className="gateway-method-logos">
                    <img src={visaLogo} alt="Visa" className="gateway-method-logo" />
                    <img src={mcLogo} alt="Mastercard" className="gateway-method-logo" />
                    <img src={amexLogo} alt="American Express" className="gateway-method-logo" />
                  </div>
                  <div className="gateway-method-info">
                    <h3 className="gateway-method-title">Tarjetas de crédito y débito</h3>
                    <p className={`gateway-method-description ${cardMask ? 'gateway-method-description--selected' : ''}`}>
                      {cardMask || 'Visa, Mastercard, American Express y más…'}
                    </p>
                  </div>
                  <div className="gateway-method-check">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </label>

              <label className={`gateway-method-option ${method === 'mp' ? 'gateway-method-option--selected' : ''}`}>
                <input
                  type="radio"
                  name="method"
                  checked={method === 'mp'}
                  onChange={() => onSelectMethod('mp')}
                  className="gateway-method-radio"
                />
                <div className="gateway-method-content">
                  <div className="gateway-method-logos">
                    <img src={mpLogo} alt="MercadoPago" className="gateway-method-logo gateway-method-logo--mp" />
                  </div>
                  <div className="gateway-method-info">
                    <h3 className="gateway-method-title">MercadoPago</h3>
                    <p className="gateway-method-description">Pagá con tu dinero disponible en cuenta</p>
                  </div>
                  <div className="gateway-method-check">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Sección de resumen */}
        <aside className="gateway-summary-section">
          <div className="gateway-summary-card">
            <div className="gateway-summary-header">
              <div className="gateway-summary-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5S8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5S15.8807 15 14.5 15H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="gateway-summary-title">Resumen de la compra</h3>
            </div>
            
            {loading && (
              <div className="gateway-summary-loading">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Cargando…
              </div>
            )}
            
            {!loading && error && (
              <div className="gateway-summary-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {error}
              </div>
            )}
            
            {!loading && !error && resumen && (
              <div className="gateway-summary-content">
                <div className="gateway-summary-row">
                  <span className="gateway-summary-label">Subtotal</span>
                  <span className="gateway-summary-value">{resumen.subtotalFmt}</span>
                </div>
                <div className="gateway-summary-row">
                  <span className="gateway-summary-label">Impuestos y cargos</span>
                  <span className="gateway-summary-value">{resumen.taxesFmt}</span>
                </div>
                <div className="gateway-summary-divider"></div>
                <div className="gateway-summary-row gateway-summary-row--total">
                  <span className="gateway-summary-label">Total</span>
                  <span className="gateway-summary-value gateway-summary-value--total">{resumen.totalFmt}</span>
                </div>
                <button 
                  className="gateway-pay-btn" 
                  onClick={comprar} 
                  disabled={processing || !method}
                >
                  {processing ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Procesando…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Pagar ahora
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

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
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="card-modal-overlay" 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="card-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="card-modal">
        <header className="card-modal-header">
          <div className="card-modal-title">
            <div className="card-modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <h2 id="card-modal-title" className="card-modal-title-text">Nueva tarjeta</h2>
            </div>
          </div>
          <button 
            className="card-modal-close" 
            onClick={onClose}
            aria-label="Cerrar modal"
          >
             &times;
          </button>
        </header>

        <div className="card-modal-body">
          <div className="card-modal-fields">
            <div className="card-field-group">
              <label className="card-field">
                <span className="card-field-label">Tipo de tarjeta</span>
                <select
                  className="card-input"
                  name="kind"
                  value={form.kind}
                  onChange={onChange}
                  onBlur={onBlur}
                >
                  <option value="credit">Crédito</option>
                  <option value="debit">Débito</option>
                </select>
              </label>
            </div>

            <div className="card-field-group">
              <label className={`card-field ${showErr('number') ? 'card-field--error' : ''}`}>
                <span className="card-field-label">Número de tarjeta</span>
                <input
                  className="card-input"
                  name="number"
                  placeholder="1234 1234 1234 1234"
                  value={form.number}
                  onChange={onChange}
                  onBlur={onBlur}
                  inputMode="numeric"
                  maxLength={19}
                  autoFocus
                />
                {showErr('number') && <span className="card-field-error">{errs.number}</span>}
              </label>
            </div>

            <div className="card-field-group">
              <label className={`card-field ${showErr('name') ? 'card-field--error' : ''}`}>
                <span className="card-field-label">Nombre del titular</span>
                <input
                  className="card-input"
                  name="name"
                  placeholder="Ej.: María López"
                  value={form.name}
                  onChange={onChange}
                  onBlur={onBlur}
                />
                {showErr('name') && <span className="card-field-error">{errs.name}</span>}
              </label>
            </div>

            <div className="card-field-row">
              <label className={`card-field ${showErr('exp') ? 'card-field--error' : ''}`}>
                <span className="card-field-label">Vencimiento</span>
                <input
                  className="card-input"
                  name="exp"
                  placeholder="MM/AA"
                  value={form.exp}
                  onChange={onChange}
                  onBlur={onBlur}
                  maxLength={5}
                />
                {showErr('exp') && <span className="card-field-error">{errs.exp}</span>}
              </label>

              <label className={`card-field ${showErr('cvv') ? 'card-field--error' : ''}`}>
                <span className="card-field-label">Código de seguridad</span>
                <input
                  className="card-input"
                  name="cvv"
                  placeholder="3 dígitos"
                  value={form.cvv}
                  onChange={onChange}
                  onBlur={onBlur}
                  maxLength={3}
                  inputMode="numeric"
                />
                {showErr('cvv') && <span className="card-field-error">{errs.cvv}</span>}
              </label>
            </div>

            <div className="card-field-row">
              <label className="card-field">
                <span className="card-field-label">Documento del titular</span>
                <select
                  className="card-input"
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
              <label className={`card-field ${showErr('doc') ? 'card-field--error' : ''}`}>
                <span className="card-field-label">&nbsp;</span>
                <input
                  className="card-input"
                  name="doc"
                  placeholder="Sin puntos ni guiones"
                  value={form.doc}
                  onChange={onChange}
                  onBlur={onBlur}
                />
                {showErr('doc') && <span className="card-field-error">{errs.doc}</span>}
              </label>
            </div>
          </div>
        </div>

        <footer className="card-modal-footer">
          <div className="card-modal-actions">
            <button 
              className="card-btn card-btn--primary" 
              onClick={handleContinue} 
              disabled={!valid}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Continuar
            </button>
          </div>
          <div className="card-modal-help">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Se realizará una verificación de tarjeta.
          </div>
        </footer>
      </div>
    </div>
  );
}
