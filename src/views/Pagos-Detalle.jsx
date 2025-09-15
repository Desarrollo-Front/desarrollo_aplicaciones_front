import { useEffect, useMemo, useState } from 'react';
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
  return <span className={`pd-badge pd-badge--${key}`}>{children}</span>;
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

const mapEventType = (t) => {
  const x = String(t || '').toUpperCase();
  if (x === 'PAYMENT_PENDING') return 'Pago pendiente';
  if (x === 'PAYMENT_METHOD_UPDATED') return 'Método de pago actualizado';
  if (x === 'PAYMENT_APPROVED') return 'Pago aprobado';
  if (x === 'PAYMENT_CAPTURED') return 'Pago capturado';
  if (x === 'PAYMENT_REJECTED') return 'Pago rechazado';
  if (x === 'REFUND_CREATED') return 'Reembolso creado';
  if (x === 'REFUND_APPROVED') return 'Reembolso aprobado';
  if (x === 'REFUND_REJECTED') return 'Reembolso rechazado';
  return x
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};
const mapRefundStatus = (s) => {
  const t = String(s || '').toUpperCase();
  if (t === 'PENDING') return 'Pendiente';
  if (t === 'DECLINED') return 'Rechazado';
  if (t === 'TOTAL_REFUND') return 'Reembolso total';
  if (t === 'PARTIAL_REFUND') return 'Reembolso parcial';
  return t;
};

const eventCategory = (type, payload) => {
  const t = String(type || '').toUpperCase();
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
      CREDIT_CARD: "Tarjeta de crédito",
      DEBIT_CARD: "Tarjeta de débito",
      MERCADO_PAGO: "Mercado Pago",
    };
    const metodoTraducido = traduccionesMetodo[String(method).toUpperCase()] || String(method);
    tryPush("Método", metodoTraducido);
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

const parseJsonSafe = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const normalizeRefundResponse = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) return data.length ? data[0] : null;
  return data;
};

const translatePayloadDeep = (payload) => {
  if (!payload || typeof payload !== "object") return payload;

  const keyTranslations = {
    status: "Estado",
    method: "Método",
    method_type: "Tipo de método",
    payment_method_type: "Tipo de método de pago",
    payment_method_id: "ID de método de pago",
    approval_time: "Fecha de aprobación",
    amount: "Monto",
    amount_total: "Monto total",
    currency: "Moneda",
    installments: "Cuotas",
    reason: "Motivo",
    error: "Error",
    refund_id: "ID de reembolso",
    created_at: "Fecha de creación",
    updated_at: "Fecha de actualización",
  };

  const valueTranslations = {
    PENDING_BANK_APPROVAL: "Pendiente de aprobación bancaria",
    AUTO_APPROVED_BY_BANK: "Aprobado automáticamente por el banco",
    CREDIT_CARD: "Tarjeta de crédito",
    DEBIT_CARD: "Tarjeta de débito",
    CASH: "Efectivo",
    MERCADO_PAGO: "Mercado Pago",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    PENDING: "Pendiente",
    REFUND_INITIATED: "Reembolso iniciado",
  };

  const nuevo = {};
  for (let [k, v] of Object.entries(payload)) {
    const newKey = keyTranslations[k] || k;

    let newValue = v;
    if (typeof v === "string") {
      const upper = v.toUpperCase();
      newValue = valueTranslations[upper] || v;
    } else if (typeof v === "object" && v !== null) {
      newValue = translatePayloadDeep(v);
    }

    nuevo[newKey] = newValue;
  }
  return nuevo;
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

  const [showRefund, setShowRefund] = useState(false);
  const [monto, setMonto] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');

  const [refundInfo, setRefundInfo] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundErr, setRefundErr] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const role = String(localStorage.getItem('role') || '').toUpperCase();
  const isUser = role === 'USER';
  const isMerchant = role === 'MERCHANT';

  const hasRefund = useMemo(() => Boolean(refundInfo || pago?.refundId), [refundInfo, pago]);
  const refundReason = useMemo(
    () => String(refundInfo?.reason || pago?.refund_reason || '').trim(),
    [refundInfo, pago]
  );
  const isRefundPending = useMemo(
    () => String(refundInfo?.status || '').toUpperCase() === 'PENDING',
    [refundInfo]
  );
  const [fullRefund, setFullRefund] = useState(false);
  const [alerta, setAlerta] = useState({ show: false, tipo: 'info', mensaje: '' });
  const mostrarAlerta = (mensaje, tipo = 'info') => {
    setAlerta({ show: true, tipo, mensaje });
    setTimeout(() => setAlerta({ show: false, tipo: 'info', mensaje: '' }), 4000);
  };

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
        const pagoNorm = {
          id: p.id,
          cliente: localStorage.getItem('name') || '—',
          prestador: p.provider_name || (p.provider_id ? `ID: ${p.provider_id}` : '—'),
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
          categoria: meta.category || '',
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

        try {
          setRefundLoading(true);
          setRefundErr('');
          setRefundInfo(null);
          const resRefund = await fetch(`/api/refunds/payment/${p.id}`, {
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          });
          if (resRefund.status === 204 || resRefund.status === 404) {
            setRefundInfo(null);
          } else if (resRefund.status === 401) {
            setRefundErr('No autorizado para consultar reembolsos.');
          } else if (resRefund.ok) {
            const raw = await parseJsonSafe(resRefund);
            const r = normalizeRefundResponse(raw);
            if (r && Object.keys(r).length > 0) {
              setRefundInfo({
                id: r.id ?? null,
                amount: Number(r.amount ?? r.amount_total ?? 0),
                status: String(r.status || '').toUpperCase(),
                reason: r.reason ?? null,
                createdAt: r.createdAt || r.created_at || null,
                gatewayRefundId: r.gatewayRefundId || r.gateway_refund_id || null,
              });
            } else {
              setRefundInfo(null);
            }
          } else {
            setRefundErr('No se pudo consultar el reembolso.');
          }
        } catch {
          setRefundErr('No se pudo consultar el reembolso.');
          setRefundInfo(null);
        } finally {
          setRefundLoading(false);
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
  }, [id, isUser]);

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

  const buildComprobanteHTML = () => {
    const emisor = pago.prestador || 'Prestador';
    const cliente = pago.cliente || 'Consumidor Final';
    const metodo = pago.metodo || '—';
    const desc = pago.descripcion || 'Pago';
    const fechaEmision = fechaHora(pago.creadoISO);
    const fechaCobro = fechaHora(pago.capturadoISO);
    const otrosCargos = pago.impuestos || 0;
    const lines = [
      { cant: 1, det: desc, pu: pago.subtotal, imp: pago.subtotal },
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
    Operación: ${pago.solicitud || '—'}
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

  const descargarComprobante = () => {
    if (!pago) return;
    const html = buildComprobanteHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (!win) mostrarAlerta('No se pudo abrir el comprobante. Verificá el bloqueador de pop-ups.');
  };

  const getAuthHeader = () =>
    localStorage.getItem('authHeader') ||
    `${localStorage.getItem('tokenType') || 'Bearer'} ${localStorage.getItem('token') || ''}`;
  useEffect(() => {
    if (showRefund && fullRefund && pago) {
      setMonto(pago.total);
    }
  }, [showRefund, fullRefund, pago]);

  const refreshTimeline = async (paymentId) => {
    const authHeader = getAuthHeader();
    const resTl = await fetch(`/api/payments/${paymentId}/timeline`, {
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    });
    if (!resTl.ok) {
      setTlErr('No se pudo obtener el timeline.');
      setTimeline([]);
      return;
    }
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
    setTlErr('');
  };

  const confirmarReembolso = async (e) => {
    e.preventDefault();
    if (!pago) return;
    const amountNum = fullRefund ? Number(pago.total) : Number(monto);
    const reasonStr = String(motivo || '').trim() || 'customer_request';
    const notasStr = String(notas || '').trim();
    const motivoRegex = /^[a-zA-ZÀ-ÿ\s.,-]{3,100}$/;
    if (!motivoRegex.test(reasonStr)) {
      mostrarAlerta(
        'El motivo debe ser un texto válido (mínimo 3 caracteres, solo letras y espacios).'
      );
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      mostrarAlerta('Ingresá un monto válido mayor a 0.');
      return;
    }
    if (amountNum > Number(pago.total)) {
      mostrarAlerta('El monto no puede exceder el total del pago.');
      return;
    }
    try {
      const authHeader = getAuthHeader();
      const body = {
        paymentId: pago.id,
        amount: amountNum,
        reason: reasonStr,
        metadata: JSON.stringify({
          notes: notasStr || null,
          requestedBy: localStorage.getItem('name') || null,
          fullRefund: !!fullRefund,
        }),
      };
      const res = await fetch('/api/refunds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('No autorizado para crear reembolsos.');
        throw new Error('No se pudo crear el reembolso.');
      }
      const created = await parseJsonSafe(res);
      const r = normalizeRefundResponse(created);
      if (r) {
        setRefundInfo({
          id: r.id ?? null,
          amount: Number(r.amount ?? r.amount_total ?? 0),
          status: String(r.status || '').toUpperCase(),
          reason: r.reason ?? null,
          createdAt: r.createdAt || r.created_at || null,
          gatewayRefundId: r.gatewayRefundId || r.gateway_refund_id || null,
        });
      }
      await refreshTimeline(pago.id);
      setShowRefund(false);
      setFullRefund(false);
      setMonto(0);
      setMotivo('');
      setNotas('');
    } catch (err) {
      mostrarAlerta(err.message || 'Error al crear el reembolso.');
    }
  };

  const doRefundAction = async (action) => {
    if (!refundInfo?.id) return;
    const isRefundPending = String(refundInfo?.status || '').toUpperCase() === 'PENDING';
    if (!isRefundPending) return;
    try {
      setActionLoading(true);
      const authHeader = getAuthHeader();
      const url = `/api/refunds/${refundInfo.id}/${action}`;
      let body = null;
      if (action === 'decline') {
        body = JSON.stringify({ status: 'PENDING', message: 'Rechazado por el comerciante' });
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: body,
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('No autorizado para operar reembolsos.');
        throw new Error('No se pudo actualizar el reembolso.');
      }
      const upd = await parseJsonSafe(res);
      const r = normalizeRefundResponse(upd);
      if (r) {
        setRefundInfo({
          id: r.id ?? refundInfo.id,
          amount: Number(r.amount ?? refundInfo.amount ?? 0),
          status: String(r.status || '').toUpperCase(),
          reason: r.reason ?? refundInfo.reason ?? null,
          createdAt: r.createdAt || r.created_at || refundInfo.createdAt || null,
          gatewayRefundId:
            r.gatewayRefundId || r.gateway_refund_id || refundInfo.gatewayRefundId || null,
        });
      }
      await refreshTimeline(pago.id);
    } catch (e) {
      mostrarAlerta(e.message || 'Error al actualizar el reembolso.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTimeline = useMemo(() => {
    if (tlFilter === 'all') return timeline;
    return timeline.filter((e) => e.category === tlFilter);
  }, [timeline, tlFilter]);

  const isRejected = useMemo(
    () => String(pago?.rawStatus || '').toUpperCase() === 'REJECTED',
    [pago]
  );

  const goRetry = () => {
    if (!pago) return;
    navigate(`/pago/${pago.id}`, {
      state: {
        id: pago.id,
        currency: pago.moneda,
        subtotal: pago.subtotal,
        taxesAndFees: pago.impuestos,
        total: pago.total,
        status: pago.rawStatus,
      },
    });
  };

  if (loading) {
    return (
      <div className="pd-wrap">
        <h1 className="pd-title">Detalle de pago</h1>
        <p className="pd-sub">Cargando…</p>
      </div>
    );
  }

  if (!pago) {
    return (
      <div className="pd-wrap">
        <button className="pd-btn pd-btn--ghost pd-back" onClick={() => navigate('/pagos')}>
          ← Volver
        </button>
        <h1 className="pd-title">Detalle de pago</h1>
        <p className="pd-sub">{err || 'No se encontró el pago.'}</p>
      </div>
    );
  }

  const isRefundPendingLike = String(refundInfo?.status || '').toUpperCase() === 'PENDING';

  return (
    <div className="pd-wrap">
      <div className="pd-head">
        <button className="pd-btn pd-btn--ghost pd-back" onClick={() => navigate('/pagos')}>
          ← Volver
        </button>
        <div className="pd-head-center">
          <h1 className="pd-title">Detalle de pago #{pago?.id ?? ''}</h1>
          <p className="pd-sub">
            Resumen, datos fiscales y referencia, comprobantes, reembolsos y timeline.
          </p>
        </div>
        <div className="pd-head-spacer"></div>
      </div>

      <section className="pd-grid">
        <article className="pd-card">
          <header className="pd-card-h">Resumen</header>
          <div className="pd-kv">
            <div>
              <b>Cliente</b>
              <span>{pago.cliente}</span>
            </div>
            <div>
              <b>Prestador</b>
              <span>{pago.prestador}</span>
            </div>
            <div>
              <b>Método</b>
              <span>
                <Badge kind={pago.metodo}>{pago.metodo}</Badge>
              </span>
            </div>
            <div>
              <b>Estado</b>
              <span>
                <Badge kind={pago.estado}>{pago.estado}</Badge>
              </span>
            </div>
            {isRejected && !isMerchant && (
              <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                <button className="pd-btn pd-btn--pri" onClick={goRetry}>
                  Reintentar pago
                </button>
              </div>
            )}
            <div>
              <b>Subtotal</b>
              <span>{totales.sub}</span>
            </div>
            <div>
              <b>Impuestos</b>
              <span>{totales.imp}</span>
            </div>
            <div className="pd-total">
              <b>Total</b>
              <span>{totales.tot}</span>
            </div>
            <div>
              <b>Creado</b>
              <span>{fechaHora(pago.creadoISO)}</span>
            </div>
            <div>
              <b>Capturado</b>
              <span>{fechaHora(pago.capturadoISO)}</span>
            </div>
          </div>
        </article>

        <article className="pd-card">
          <header className="pd-card-h">Datos fiscales y referencia</header>
          <div className="pd-kv">
            <div>
              <b>Moneda</b>
              <span>{pago.moneda}</span>
            </div>
            <div>
              <b>Fees</b>
              <span>{money(pago.fees, pago.moneda)}</span>
            </div>
            <div>
              <b>Descripción</b>
              <span>{pago.descripcion}</span>
            </div>
            <div>
              <b>Categoría</b>
              <span>{pago.categoria}</span>
            </div>
            {hasRefund && refundReason && (
              <div>
                <b>Motivo reembolso</b>
                <span>{refundReason}</span>
              </div>
            )}
          </div>
        </article>

        <article className="pd-card">
  <header className="pd-card-h">Comprobantes</header>
  {puedeDescargarComprobante ? (
    <div className="pd-comprobante">
      <p className="pd-muted">
        Se genera un comprobante de pago no fiscal con los datos reales.
      </p>
      <button className="pd-btn pd-btn--pri" onClick={descargarComprobante}>
        Descargar Factura
      </button>
    </div>
  ) : (
    <div className="pd-comprobante">
      <p className="pd-muted">
        No hay comprobantes disponibles. {pago.rawStatus === 'REJECTED' && 'Reintente el pago.'}
      </p>
      {pago.rawStatus === 'REJECTED' && !isMerchant &&  (
        <button
          className="pd-btn pd-btn--pri"
          onClick={() => navigate(`/pago/${pago.id}`, { state: pago })}
        >
          Reintentar pago
        </button>
      )}
    </div>
  )}
</article>

      </section>

      <section className="pd-card pd-refunds">
        <header className="pd-card-h pd-card-h--left">Reembolsos</header>
        {refundLoading && <p className="pd-muted">Consultando reembolso…</p>}
        {refundErr && <p className="pd-muted">{refundErr}</p>}
        {!refundLoading && !refundErr && refundInfo && (
          <div className="pd-kv">
            <div>
              <b>ID de reembolso</b>
              <span>{refundInfo.id ?? '—'}</span>
            </div>
            <div>
              <b>Estado</b>
              <span>{mapRefundStatus(refundInfo.status)}</span>
            </div>
            <div>
              <b>Monto</b>
              <span>{money(Number(refundInfo.amount ?? 0), pago.moneda)}</span>
            </div>
            {isMerchant && isRefundPending && (
              <div className="pd-refund-actions" >
                <button
                  className="pd-btn pd-btn--pri"
                  disabled={actionLoading || !isRefundPendingLike}
                  onClick={() => doRefundAction('approve')}
                >
                  Aprobar
                </button>
                <button
                  className="pd-btn"
                  disabled={actionLoading || !isRefundPendingLike}
                  onClick={() => doRefundAction('decline')}
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        )}
        {!refundLoading && !refundErr && !refundInfo && isMerchant && (
          <div className="pd-empty">
            <p className="pd-muted">No se inició un reembolso para este pago.</p>
          </div>
        )}
        {!refundLoading && !refundErr && !refundInfo && isUser && (
          <div className="pd-empty">
            <p className="pd-muted">Sin reembolsos registrados.</p>
            <button
              className="pd-btn pd-btn--pri"
              onClick={() => {
                setFullRefund(false);
                setMonto(0);
                setMotivo('');
                setNotas('');
                setShowRefund(true);
              }}
            >
              Solicitar reembolso
            </button>
          </div>
        )}
      </section>

      <section className="pd-timeline pd-timeline--alt">
        <div className="pd-tl-head">
          <header className="pd-card-h">Timeline</header>
          <div className="pd-tl-filters"></div>
        </div>

        {tlErr && <p className="pd-muted">{tlErr}</p>}
        {!tlErr && filteredTimeline.length === 0 && (
          <p className="pd-muted">No hay eventos para el filtro seleccionado.</p>
        )}

        {!tlErr && filteredTimeline.length > 0 && (
          <ul className="pd-time-alt">
            {filteredTimeline.map((ev, i) => {
              const side = i % 2 === 0 ? 'pd-left' : 'pd-right';
              const cat = ev.category;
              const open = !!expanded[ev.id];
              const hl = highlightPairs(ev.payload, pago.moneda);
              return (
                <li key={ev.id} className={`pd-time-alt-item ${side} pd-time-${cat}`}>
                  <div className="pd-time-head">
                    <button
                      className="pd-dot-label"
                      data-tip={fechaHora(ev.createdISO)}
                      type="button"
                    >
                      <span className="pd-evt-title">
                        {mapEventType(ev.type)}
                        {ev._count ? ` ×${ev._count}` : ''}
                      </span>
                    </button>
                    {!open && (
                      <button
                        className="pd-btn pd-btn--chip pd-more"
                        onClick={() => setExpanded((x) => ({ ...x, [ev.id]: true }))}
                      >
                        Ver más
                      </button>
                    )}
                  </div>

                  {open && (
                    <div className="pd-time-card">
                      <div className="pd-time-card-h">
                        <div className="pd-time-title">
                          {mapEventType(ev.type)}
                          {ev._count ? ` ×${ev._count}` : ''}
                        </div>
                        <div className="pd-time-date">{fechaHora(ev.createdISO)}</div>
                      </div>
                      <div className="pd-time-meta">
                        Actor: {ev.actor} · Origen: {ev.source}
                      </div>

                      {hl.length > 0 && (
                        <div className="pd-tl-highlights">
                          {hl.map(([k, v]) => (
                            <div key={k} className="pd-chip-kv">
                              <span className="pd-chip-k">{k}</span>
                              <span className="pd-chip-v">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {ev.payload && typeof ev.payload === 'object' && (
                        <div className="pd-payload">
                          <pre className="pd-pre">{JSON.stringify(translatePayloadDeep(ev.payload), null, 2)}</pre>
                        </div>
                      )}

                      <div className="pd-tl-actions">
                        <button
                          className="pd-btn pd-btn--chip"
                          onClick={() => setExpanded((x) => ({ ...x, [ev.id]: false }))}
                        >
                          Ver menos
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showRefund && (
        <div className="pd-modal-overlay" role="dialog" aria-modal="true">
          <form className="pd-modal" onSubmit={confirmarReembolso}>
            <div className="pd-modal-h">
              <h3>Reembolso</h3>
              <button
                type="button"
                className="pd-btn pd-btn--chip"
                onClick={() => setShowRefund(false)}
              >
                Cerrar
              </button>
            </div>

            <label
              className="pd-field"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <input
                type="checkbox"
                checked={fullRefund}
                onChange={(e) => setFullRefund(e.target.checked)}
              />
              <span>Reembolso total {pago ? `(${money(pago.total, pago.moneda)})` : ''}</span>
            </label>

            <label className="pd-field">
              <span>Monto</span>
              <input
                type="number"
                className="pd-input"
                value={fullRefund && pago ? pago.total : monto}
                min="0"
                step="0.01"
                max={pago ? pago.total : undefined}
                onChange={(e) => setMonto(e.target.value)}
                disabled={fullRefund}
              />
            </label>

            <label className="pd-field">
              <span>Motivo</span>
              <input
                type="text"
                className="pd-input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                pattern="[a-zA-ZÀ-ÿ\s.,-]{3,100}"
                title="Solo letras, espacios y signos básicos (mínimo 3 caracteres)"
                required
              />
            </label>

            <label className="pd-field">
              <span>Notas</span>
              <textarea
                className="pd-input pd-textarea"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </label>

            <div className="pd-modal-actions">
              <button type="submit" className="pd-btn pd-btn--pri">
                Confirmar
              </button>
            </div>
          </form>
        </div>
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
