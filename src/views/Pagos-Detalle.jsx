import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Pagos-Detalle.css';


const money = (n, curr = 'ARS', locale = 'es-AR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: curr }).format(Number(n || 0));

const fechaHora = (iso, locale = 'es-AR') => {
  if (!iso) return '—';
  const d = new Date(iso);
  const f = d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const h = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${f} ${h}`;
};

function Badge({ kind, children }) {
  const key = (kind || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return <span className={`payment-detail-badge payment-detail-badge--${key}`}>{children}</span>;
}

const mapStatus = (s) => {
  const t = String(s || '').toUpperCase();
  if (t === 'PENDING') return 'Pendiente';
  if (t === 'PENDING_PAYMENT') return 'Pendiente de Pago';
  if (t === 'PENDING_APPROVAL') return 'Pendiente de Aprobación';
  if (t === 'APPROVED' || t === 'CAPTURED' || t === 'COMPLETED') return 'Aprobado';
  if (t === 'REJECTED' || t === 'FAILED') return 'Rechazado';
  if (t === 'EXPIRED') return 'Expirado';
  if (t === 'REFUNDED') return 'Reembolsado';
  if (t === 'DISPUTE' || t === 'DISPUTED') return 'Disputa';
  if (t === 'PARTIAL_REFUND') return 'Reembolso parcial';
  return 'Pendiente';
};

const getMetodoTag = (method) => {
  const type = String(method?.type || '').toUpperCase();
  if (type === 'CREDIT_CARD') return 'Crédito';
  if (type === 'DEBIT_CARD') return 'Débito';
  if (type === 'MERCADO_PAGO') return 'Mercado Pago';
  if (type === 'CASH') return 'Efectivo';
  return '—';
};

const mapEventType = (type, payload) => { // Ahora recibe type y payload
  const x = String(type || '').toUpperCase();
  const statusInPayload = String(payload?.status || '').toUpperCase();

  // Lógica para el caso específico
  if (x === 'PAYMENT_PENDING' && statusInPayload === 'PENDING_BANK_APPROVAL') {
    return 'Pago pendiente de Aprobación';
  }

  // Lógica que ya tenías
  if (x === 'PAYMENT_PENDING') return 'Pago pendiente';
  if (x === 'PAYMENT_METHOD_UPDATED') return 'Método de pago actualizado';
  if (x === 'PAYMENT_APPROVED') return 'Pago aprobado';
  if (x === 'PAYMENT_CAPTURED') return 'Pago capturado';
  if (x === 'PAYMENT_REJECTED') return 'Pago rechazado';
  if (x === 'REFUND_CREATED') return 'Reembolso creado';
  if (x === 'REFUND_APPROVED') return 'Reembolso aprobado';
  if (x === 'REFUND_REJECTED') return 'Reembolso rechazado';
  if (x === 'REFUND_INITIATED' || x === 'REFUND_STARTED') return 'Reembolso iniciado';
  if (x === 'REFUND_COMPLETED' || x === 'REFUND_COMPLETE') return 'Reembolso completado';
  if (x === 'REFUND_FAILED' || x === 'REFUND_FAIL') return 'Reembolso rechazado';
  return x
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const eventCategory = (type, payload) => {
  const t = String(type || '').toUpperCase();
  const statusInPayload = String(payload?.status || '').toUpperCase();

  // Lógica para el caso específico (debe ir primero)
  if (t === 'PAYMENT_PENDING' && statusInPayload === 'PENDING_BANK_APPROVAL') {
    return 'info'; // Categoría para el color azul
  }
  if (t === 'PAYMENT_PENDING') {
    return 'warning';
  }
  
  // Lógica que ya tenías
  if (t.includes('REFUND')) return 'refund';
  if (
    t.includes('REJECT') ||
    t.includes('FAILED') ||
    String(payload?.error || payload?.error_code || '').length > 0
  )
    return 'error';
  if (t.includes('APPROVED') || t.includes('CAPTURED') || t.includes('PENDING')) return 'state';
  return 'info';
};

const highlightPairs = (payload, moneda) => {
  if (!payload || typeof payload !== 'object') return [];
  const src = payload;
  const entries = [];
  const tryPush = (label, value) => {
    if (value !== undefined && value !== null && value !== '') entries.push([label, value]);
  };
  const amount = src.amount || src.amount_total || src.total || src.captureAmount;
  if (amount !== undefined)
    tryPush('Monto', typeof amount === 'number' ? money(amount, moneda) : String(amount));
  const currency = src.currency || src.moneda;
  if (currency && !entries.find((e) => e[0] === 'Monto') && typeof currency === 'string')
    tryPush('Moneda', String(currency).toUpperCase());
  const method =
    src.method || src.method_type || src.payment_method || src.card?.brand || src.issuer;
  if (method) {
    const traduccionesMetodo = {
      CREDIT_CARD: 'Tarjeta de crédito',
      DEBIT_CARD: 'Tarjeta de débito',
      MERCADO_PAGO: 'Mercado Pago',
    };
    const metodoTraducido = traduccionesMetodo[String(method).toUpperCase()] || String(method);
    tryPush('Método', metodoTraducido);
  }
  const last4 = src.card?.last4 || src.last4 || src.card_last4;
  if (last4) tryPush('Terminación', `**** ${String(last4)}`);
  const statusFrom = src.previous_status || src.from || src.old_status;
  const statusTo = src.new_status || src.to || src.status;
  if (statusFrom && statusTo)
    tryPush('Cambio de estado', `${mapStatus(statusFrom)} → ${mapStatus(statusTo)}`);
  const installments = src.installments || src.cuotas;
  if (installments) tryPush('Cuotas', String(installments));
  const auth = src.authorization_code || src.auth_code || src.approval_code;
  if (auth) tryPush('Autorización', String(auth));
  const reason = src.reason || src.refund_reason || src.motivo;
  if (reason) tryPush('Motivo', String(reason));
  const error = src.error || src.error_code || src.error_message;
  if (error) tryPush('Error', typeof error === 'string' ? error : JSON.stringify(error));
  return entries.slice(0, 3);
};

//const parseJsonSafe = async (res) => {
//  const text = await res.text();
//  if (!text) return null;
//  try {
//    return JSON.parse(text);
//  } catch {
//   return null;
//  }
//};

const translatePayloadDeep = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  const keyTranslations = {
    status: 'Estado',
    method: 'Método',
    method_type: 'Tipo de método',
    payment_method_type: 'Tipo de método de pago',
    payment_method_id: 'ID de método de pago',
    approval_time: 'Fecha de aprobación',
    amount: 'Monto',
    amount_total: 'Monto total',
    currency: 'Moneda',
    installments: 'Cuotas',
    reason: 'Motivo',
    error: 'Error',
    refund_id: 'ID de reembolso',
    created_at: 'Fecha de creación',
    updated_at: 'Fecha de actualización',
  };

  const valueTranslations = {
    PENDING_BANK_APPROVAL: 'Pendiente de aprobación bancaria',
    AUTO_APPROVED_BY_BANK: 'Aprobado automáticamente por el banco',
    CREDIT_CARD: 'Tarjeta de crédito',
    DEBIT_CARD: 'Tarjeta de débito',
    CASH: 'Efectivo',
    MERCADO_PAGO: 'Mercado Pago',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    PENDING: 'Pendiente',
    REFUND_INITIATED: 'Reembolso iniciado',
  };

  const nuevo = {};
  for (let [k, v] of Object.entries(payload)) {
    const newKey = keyTranslations[k] || k;

    let newValue = v;
    if (typeof v === 'string') {
      const upper = v.toUpperCase();
      newValue = valueTranslations[upper] || v;
    } else if (typeof v === 'object' && v !== null) {
      newValue = translatePayloadDeep(v);
    }

    nuevo[newKey] = newValue;
  }
  return nuevo;
};

// Build comprobante HTML from a pago-like object (module-level helper)
const buildComprobanteHTML = (pagoArg) => {
  const pagoLocal = pagoArg || {};
  const emisor = pagoLocal?.prestador || 'Prestador';
  const cliente = pagoLocal?.cliente || 'Consumidor Final';
  const metodo = pagoLocal?.metodo || '—';
  const desc = pagoLocal?.descripcion || 'Pago';
  const fechaEmision = fechaHora(pagoLocal?.creadoISO);
  const fechaCobro = fechaHora(pagoLocal?.capturadoISO);
  const otrosCargos = pagoLocal?.impuestos || 0;
  const lines = [
    { cant: 1, det: desc, pu: pagoLocal?.subtotal, imp: pagoLocal?.subtotal },
    ...(otrosCargos > 0 ? [{ cant: 1, det: 'Cargos e impuestos', pu: otrosCargos, imp: otrosCargos }] : []),
  ];
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:6px;border:1px solid #ddd;text-align:center">${l.cant}</td><td style="padding:6px;border:1px solid #ddd">${l.det}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${money(
          l.pu,
          pagoLocal?.moneda
        )}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${money(l.imp, pagoLocal?.moneda)}</td></tr>`
    )
    .join('');
  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Factura</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px">
<div style="max-width:820px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>
      <div style="font-size:22px;font-weight:700">Factura</div>
      <div style="font-size:12px;color:#666">No fiscal</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#666">ID de pago</div>
      <div style="font-size:16px;font-weight:700">#${pagoLocal.id}</div>
    </div>
  </div>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0">
  <div style="display:flex;gap:24px;margin:12px 0 20px">
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Prestador</div>
      <div style="font-size:14px;font-weight:600">${emisor}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Cliente</div>
      <div style="font-size:14px;font-weight:600">${cliente}</div>
    </div>
  </div>
  <div style="display:flex;gap:24px;margin:0 0 16px">
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Fecha de emisión</div>
      <div style="font-size:14px">${fechaEmision}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Fecha de cobro</div>
      <div style="font-size:14px">${fechaCobro}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Moneda</div>
      <div style="font-size:14px">${pagoLocal?.moneda}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Método</div>
      <div style="font-size:14px">${metodo}</div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:8px">
    <thead>
      <tr>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:center;font-size:12px">Cant.</th>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:left;font-size:12px">Detalle</th>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:right;font-size:12px">P. unitario</th>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:right;font-size:12px">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:12px">
    <div style="min-width:280px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd">
        <div style="color:#666">Subtotal</div><div>${money(pagoLocal?.subtotal, pagoLocal?.moneda)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd">
        <div style="color:#666">Otros cargos</div><div>${money(pagoLocal?.impuestos, pagoLocal?.moneda)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:16px">
        <div>Total</div><div>${money(pagoLocal?.total, pagoLocal?.moneda)}</div>
      </div>
    </div>
  </div>
        <div style="margin-top:18px;font-size:12px;color:#666">
    Operación: ${pagoLocal.solicitud || '—'}
  </div>
  <div style="margin-top:18px;padding:12px;background:#f7f7f7;border:1px solid #eee;font-size:12px;color:#444">
    Este es un comprobante no fiscal emitido a partir de datos reales del pago. No reemplaza la factura fiscal correspondiente.
  </div>
</div>
<script>
window.onload = function(){window.print();}
</script>
</body>
</html>
    `;
  return html;
};

// descargarComprobante as module helper (accepts pago object)
const descargarComprobante = (pagoArg) => {
  const pagoLocal = pagoArg || null;
  if (!pagoLocal) return;
  const html = buildComprobanteHTML(pagoLocal);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (!win) alert('No se pudo abrir el comprobante. Verificá el bloqueador de pop-ups.');
};

export default function PagosDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pago, setPago] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tlErr, setTlErr] = useState('');
  const [tlFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  // Obtenemos el ROL y el NOMBRE del usuario logueado
  const role = String(localStorage.getItem('role') || '').toUpperCase();
  const localUserName = localStorage.getItem('name') || '—';
  const isMerchant = role === 'MERCHANT';
  // --- INICIO DE LA CORRECCIÓN ---
  // Agregamos la variable para ADMIN
  const isAdmin = role === 'ADMIN';
  // --- FIN DE LA CORRECCIÓN ---

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setErr('');
        setTlErr('');
        const authHeader =
          localStorage.getItem('authHeader') ||
          `${localStorage.getItem('tokenType') || 'Bearer'} ${localStorage.getItem('token') || ''}`;

        const [resPago, resTl] = await Promise.all([
          fetch(`/api/payments/${id}`, {
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          }),
          fetch(`/api/payments/${id}/timeline`, {
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          }),
        ]);

        if (!resPago.ok) {
          if (resPago.status === 401) throw new Error('No autorizado. Iniciá sesión nuevamente.');
          throw new Error('No se pudo obtener el pago.');
        }
        const p = await resPago.json();
        const meta = (() => {
          try {
            return p.metadata ? JSON.parse(p.metadata) : {};
          } catch {
            return {};
          }
        })();
        
        // --- INICIO DE LA CORRECCIÓN (LÓGICA DE ROLES) ---
        let clienteFinal;
        let prestadorFinal;

        if (isAdmin) {
          // ADMIN: ambos nombres vienen del API
          clienteFinal = p.user_name || 'Cliente';
          prestadorFinal = p.provider_name || (p.provider_id ? `ID: ${p.provider_id}` : '—');
        
        } else if (isMerchant) {
          // MERCHANT: cliente del API, prestador soy yo
          clienteFinal = p.user_name || 'Cliente';
          prestadorFinal = localUserName;
        
        } else {
          // USER (o cualquier otro rol): cliente soy yo, prestador del API
          clienteFinal = localUserName;
          prestadorFinal = p.provider_name || (p.provider_id ? `ID: ${p.provider_id}` : '—');
        }
        // --- FIN DE LA CORRECCIÓN ---

        const pagoNorm = {
          id: p.id,
          cliente: clienteFinal,
          prestador: prestadorFinal,
          solicitud: p.solicitud_id ? `RCOT-${p.solicitud_id}` : '—',
          metodo: getMetodoTag(p.method),
          estado: mapStatus(p.status),
          subtotal: Number(p.amount_subtotal ?? 0),
          impuestos: Number((p.taxes ?? 0) + (p.fees ?? 0)),
          total: Number(p.amount_total ?? 0),
          moneda: String(p.currency || 'ARS').toUpperCase(),
          creadoISO: p.created_at || p.createdAt || null,
          capturadoISO: p.captured_at || p.capturedAt || null,
          fees: Number(p.fees ?? 0),
          descripcion: meta.description || '',
          // --- CAMBIO: LÍNEA ELIMINADA ---
          // categoria: meta.category || '',
          refund_reason: meta.refund_reason || '',
          refundId: p.refund_id ?? null,
          rawStatus: String(p.status || '').toUpperCase(),
          methodRaw: p.method || null,
        };
        setPago(pagoNorm);

        if (!resTl.ok) {
          setTlErr('No se pudo obtener el timeline.');
          setTimeline([]);
        } else {
          const tl = await resTl.json();
          const norm = (Array.isArray(tl) ? tl : []).map((e) => {
            let payloadObj = null;
            try {
              payloadObj = e.payload ? JSON.parse(e.payload) : null;
            } catch {
              payloadObj = null;
            }
            const created = e.createdAt || e.created_at || null;
            const cat = eventCategory(e.type, payloadObj);
            return {
              id: e.id,
              type: e.type,
              actor: e.actor || 'system',
              source: e.eventSource || e.source || 'SYSTEM',
              createdISO: created,
              payload: payloadObj,
              category: cat,
            };
          });
          norm.sort((a, b) => new Date(a.createdISO) - new Date(b.createdISO));
          setTimeline(norm);
        }
      } catch (e) {
        setErr(e.message || 'Error inesperado.');
        setPago(null);
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // --- INICIO DE LA CORRECCIÓN ---
    // Agregamos 'isAdmin' al array de dependencias
  }, [id, isMerchant, localUserName, isAdmin]); 
  // --- FIN DE LA CORRECCIÓN ---

  const totales = useMemo(() => {
    if (!pago) return { sub: '-', imp: '-', tot: '-' };
    return {
      sub: money(pago.subtotal, pago.moneda),
      imp: money(pago.impuestos, pago.moneda),
      tot: money(pago.total, pago.moneda),
    };
  }, [pago]);

  const puedeDescargarComprobante = useMemo(() => {
    if (!pago) return false;
    const okStatus =
      ['APPROVED', 'CAPTURED', 'COMPLETED'].includes(pago.rawStatus) || Boolean(pago.capturadoISO);
    return okStatus && Number.isFinite(pago.total) && pago.total > 0;
  }, [pago]);

  const buildComprobanteHTML = (pagoArg) => {
    const pagoLocal = pagoArg || pago;
    // Usamos los datos ya procesados en el estado 'pago'
    const emisor = pagoLocal?.prestador || 'Prestador';
    const cliente = pagoLocal?.cliente || 'Consumidor Final';
    const metodo = pagoLocal?.metodo || '—';
    const desc = pagoLocal?.descripcion || 'Pago';
    const fechaEmision = fechaHora(pagoLocal?.creadoISO);
    const fechaCobro = fechaHora(pagoLocal?.capturadoISO);
    const otrosCargos = pagoLocal?.impuestos || 0;
    const lines = [
      { cant: 1, det: desc, pu: pagoLocal?.subtotal, imp: pagoLocal?.subtotal },
      ...(otrosCargos > 0
        ? [{ cant: 1, det: 'Cargos e impuestos', pu: otrosCargos, imp: otrosCargos }]
        : []),
    ];
    const rows = lines
      .map(
        (l) =>
          `<tr><td style="padding:6px;border:1px solid #ddd;text-align:center">${l.cant}</td><td style="padding:6px;border:1px solid #ddd">${l.det}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${money(l.pu, pago.moneda)}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${money(l.imp, pago.moneda)}</td></tr>`
      )
      .join('');
    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Factura</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px">
<div style="max-width:820px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>
      <div style="font-size:22px;font-weight:700">Factura</div>
      <div style="font-size:12px;color:#666">No fiscal</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#666">ID de pago</div>
      <div style="font-size:16px;font-weight:700">#${pago.id}</div>
    </div>
  </div>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0">
  <div style="display:flex;gap:24px;margin:12px 0 20px">
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Prestador</div>
      <div style="font-size:14px;font-weight:600">${emisor}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Cliente</div>
      <div style="font-size:14px;font-weight:600">${cliente}</div>
    </div>
  </div>
  <div style="display:flex;gap:24px;margin:0 0 16px">
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Fecha de emisión</div>
      <div style="font-size:14px">${fechaEmision}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Fecha de cobro</div>
      <div style="font-size:14px">${fechaCobro}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Moneda</div>
      <div style="font-size:14px">${pago.moneda}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:12px;color:#666">Método</div>
      <div style="font-size:14px">${metodo}</div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:8px">
    <thead>
      <tr>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:center;font-size:12px">Cant.</th>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:left;font-size:12px">Detalle</th>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:right;font-size:12px">P. unitario</th>
        <th style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:right;font-size:12px">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:12px">
    <div style="min-width:280px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd">
        <div style="color:#666">Subtotal</div><div>${money(pago.subtotal, pago.moneda)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd">
        <div style="color:#666">Otros cargos</div><div>${money(pago.impuestos, pago.moneda)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:16px">
        <div>Total</div><div>${money(pago.total, pago.moneda)}</div>
      </div>
    </div>
  </div>
        <div style="margin-top:18px;font-size:12px;color:#666">
    Operación: ${pagoLocal.solicitud || '—'}
  </div>
  <div style="margin-top:18px;padding:12px;background:#f7f7f7;border:1px solid #eee;font-size:12px;color:#444">
    Este es un comprobante no fiscal emitido a partir de datos reales del pago. No reemplaza la factura fiscal correspondiente.
  </div>
</div>
<script>
window.onload = function(){window.print();}
</script>
</body>
</html>
    `;
    return html;
  };

  const descargarComprobante = (pagoArg) => {
    const pagoLocal = pagoArg || pago;
    if (!pagoLocal) return;
    const html = buildComprobanteHTML(pagoLocal);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (!win) alert('No se pudo abrir el comprobante. Verificá el bloqueador de pop-ups.');
  };

  const filteredTimeline = useMemo(() => {
    if (tlFilter === 'all') return timeline;
    return timeline.filter((e) => e.category === tlFilter);
  }, [timeline, tlFilter]);

  //const isRejected = useMemo(
  //  () => String(pago?.rawStatus || '').toUpperCase() === 'REJECTED',
  //  [pago]
  //);

  //const goRetry = () => {
  //  if (!pago) return;
  //  navigate(`/pago/${pago.id}`, {
  //    state: {
  //      id: pago.id,
  //      currency: pago.moneda,
  //      subtotal: pago.subtotal,
  //     taxesAndFees: pago.impuestos,
  //      total: pago.total,
  //      status: pago.rawStatus,
  //    },
  //  });
  //};

  if (loading) {
    return (
      <div className="payment-detail-container">
        <div className="payment-detail-loading">
          <h1>Detalle de pago</h1>
          <p>Cargando…</p>
        </div>
      </div>
    );
  }

  if (!pago) {
    return (
      <div className="payment-detail-container">
        <div className="payment-detail-header">
          <button className="payment-detail-back-btn" onClick={() => navigate('/pagos')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver
          </button>
          <div className="payment-detail-title-section">
            <h1 className="payment-detail-title">Detalle de pago</h1>
            <p className="payment-detail-subtitle">{err || 'No se encontró el pago.'}</p>
          </div>
          <div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-detail-container">
      {/* Header mejorado */}
      <div className="payment-detail-header">
        <button className="payment-detail-back-btn" onClick={() => navigate('/pagos')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>
        <div className="payment-detail-title-section">
          <div>
            <h1 className="payment-detail-title">Detalle de pago #{pago?.id ?? ''}</h1>
            <p className="payment-detail-subtitle">Resumen completo y timeline de eventos</p>
          </div>
        </div>
        <div>
        </div>
      </div>

      {/* Layout principal mejorado */}
      <div className="payment-detail-main-layout">
        {/* Sección de información del pago */}
        <section className="payment-detail-info-section">
          <div className="payment-detail-card">
            <div className="payment-detail-card-header">
              <div className="payment-detail-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="payment-detail-card-title">Información del pago</h2>
            </div>
            <div className="payment-detail-info-grid">
              <div className="payment-detail-info-item">
                <div className="payment-detail-info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Descripción
                </div>
                <div className="payment-detail-info-value">{pago.descripcion || '—'}</div>
              </div>
              
              {/* --- CAMBIO: BLOQUE "CATEGORÍA" ELIMINADO --- */}

              <div className="payment-detail-info-item">
                <div className="payment-detail-info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Cliente
                </div>
                <div className="payment-detail-info-value">{pago.cliente}</div>
              </div>
              <div className="payment-detail-info-item">
                <div className="payment-detail-info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Prestador
                </div>
                <div className="payment-detail-info-value">{pago.prestador}</div>
              </div>
              <div className="payment-detail-info-item">
                <div className="payment-detail-info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Método
                </div>
                <div className="payment-detail-info-value">
                  <Badge kind={pago.metodo}>{pago.metodo}</Badge>
                </div>
              </div>
              <div className="payment-detail-info-item">
                <div className="payment-detail-info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Estado
                </div>
                <div className="payment-detail-info-value">
                  <Badge kind={pago.estado}>{pago.estado}</Badge>
                </div>
              </div>
              <div className="payment-detail-info-item">
                <div className="payment-detail-info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Creado
                </div>
                <div className="payment-detail-info-value">{fechaHora(pago.creadoISO)}</div>
              </div>
              <div className="payment-detail-info-item">
                <div className="payment-detail-info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Capturado
                </div>
                <div className="payment-detail-info-value">{fechaHora(pago.capturadoISO)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de totales mejorada */}
        <aside className="payment-detail-totals-section">
          <div className="payment-detail-totals-card">
            <div className="payment-detail-totals-header">
              <div className="payment-detail-totals-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5S8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5S15.8807 15 14.5 15H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="payment-detail-totals-title">Resumen financiero</h3>
            </div>
            <div className="payment-detail-totals-content">
              <div className="payment-detail-total-row">
                <span className="payment-detail-total-label">Subtotal</span>
                <span className="payment-detail-total-value">{totales.sub}</span>
              </div>
              <div className="payment-detail-total-row">
                <span className="payment-detail-total-label">Impuestos y cargos</span>
                <span className="payment-detail-total-value">{totales.imp}</span>
              </div>
              <div className="payment-detail-total-divider"></div>
              <div className="payment-detail-total-row payment-detail-total-row--main">
                <span className="payment-detail-total-label">Total</span>
                <span className="payment-detail-total-value payment-detail-total-value--main">{totales.tot}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Timeline mejorado */}
      <section className="payment-detail-timeline-section">
        <div className="payment-detail-timeline-card">
          <div className="payment-detail-timeline-header">
            <div className="payment-detail-timeline-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="payment-detail-timeline-title">Timeline de eventos</h3>
            <div className="payment-detail-timeline-count">
              {filteredTimeline.length} eventos
            </div>
          </div>

          {tlErr && (
            <div className="payment-detail-timeline-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {tlErr}
            </div>
          )}

          {!tlErr && filteredTimeline.length === 0 && (
            <div className="payment-detail-timeline-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No hay eventos para mostrar</p>
            </div>
          )}

          {!tlErr && filteredTimeline.length > 0 && (
            <div className="payment-detail-timeline-horizontal">
              <div className="payment-detail-timeline-horizontal-line"></div>
              <div className="payment-detail-timeline-horizontal-events">
                {filteredTimeline.map((ev, i) => {
                  const cat = ev.category;
                  return (
                    <div key={ev.id} className={`payment-detail-timeline-horizontal-event payment-detail-timeline-horizontal-event--${cat}`}>
                      <div className="payment-detail-timeline-horizontal-dot">
                        <div className="payment-detail-timeline-horizontal-dot-inner"></div>
                      </div>
                      <div className="payment-detail-timeline-horizontal-content">
                        <div className="payment-detail-timeline-horizontal-event-title">
                          {mapEventType(ev.type, ev.payload)} {/* Le pasamos también el payload */}
                          {ev._count ? ` ×${ev._count}` : ''}
                        </div>
                        <div className="payment-detail-timeline-horizontal-event-date">
                          {fechaHora(ev.createdISO)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Export helpers for unit testing
export {
  money,
  fechaHora,
  mapStatus,
  getMetodoTag,
  mapEventType,
  eventCategory,
  highlightPairs,
  translatePayloadDeep,
  buildComprobanteHTML,
  descargarComprobante,
};