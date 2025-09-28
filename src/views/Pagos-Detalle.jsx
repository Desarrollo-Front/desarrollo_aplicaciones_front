import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


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
  // Badge con color según tipo
  let badgeColor = 'bg-gray-200 text-gray-800';
  if (key.includes('aprobado') || key.includes('approved') || key.includes('capturado') || key.includes('completed')) badgeColor = 'bg-green-100 text-green-700';
  if (key.includes('rechazado') || key.includes('rejected') || key.includes('failed')) badgeColor = 'bg-red-100 text-red-700';
  if (key.includes('pendiente') || key.includes('pending')) badgeColor = 'bg-yellow-100 text-yellow-800';
  if (key.includes('expirado') || key.includes('expired')) badgeColor = 'bg-gray-300 text-gray-600';
  if (key.includes('reembolsado') || key.includes('refund')) badgeColor = 'bg-blue-100 text-blue-700';
  if (key.includes('disputa') || key.includes('dispute')) badgeColor = 'bg-orange-100 text-orange-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold align-middle ${badgeColor}`}>{children}</span>
  );
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

  const role = String(localStorage.getItem('role') || '').toUpperCase();
  const isUser = role === 'USER';
  const isMerchant = role === 'MERCHANT';

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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-2">Detalle de pago</h1>
        <p className="text-gray-500">Cargando…</p>
      </div>
    );
  }

  if (!pago) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <button className="mb-4 text-blue-600 hover:underline flex items-center gap-1" onClick={() => navigate('/pagos')}>← Volver</button>
        <h1 className="text-2xl font-bold mb-2">Detalle de pago</h1>
        <p className="text-gray-500">{err || 'No se encontró el pago.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <button className="text-blue-600 hover:underline flex items-center gap-1 self-start" onClick={() => navigate('/pagos')}>← Volver</button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold">Detalle de pago #{pago?.id ?? ''}</h1>
          <p className="text-gray-500 text-sm">Resumen, datos fiscales y referencia, comprobantes y timeline.</p>
        </div>
        <div className="w-24 hidden sm:block" />
      </div>

      {/* Grid de tarjetas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Resumen */}
        <article className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 border border-gray-100">
          <header className="font-semibold text-gray-700 mb-2">Resumen</header>
          <div className="flex flex-col gap-1 text-sm">
            <div><b>Cliente</b><div className="text-gray-700">{pago.cliente}</div></div>
            <div><b>Prestador</b><div className="text-gray-700">{pago.prestador}</div></div>
            <div><b>Método</b><div><Badge kind={pago.metodo}>{pago.metodo}</Badge></div></div>
            <div><b>Estado</b><div><Badge kind={pago.estado}>{pago.estado}</Badge></div></div>
            <div><b>Subtotal</b><div>{totales.sub}</div></div>
            <div><b>Impuestos</b><div>{totales.imp}</div></div>
            <div className="mt-2 border-t pt-2"><b>Total</b><div className="text-lg font-bold">{totales.tot}</div></div>
            <div><b>Creado</b><div>{fechaHora(pago.creadoISO)}</div></div>
            <div><b>Capturado</b><div>{fechaHora(pago.capturadoISO)}</div></div>
          </div>
        </article>

        {/* Datos fiscales y referencia */}
        <article className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 border border-gray-100">
          <header className="font-semibold text-gray-700 mb-2">Datos fiscales y referencia</header>
          <div className="flex flex-col gap-1 text-sm">
            <div><b>Moneda</b><div>{pago.moneda}</div></div>
            <div><b>Fees</b><div>{money(pago.fees, pago.moneda)}</div></div>
            <div><b>Descripción</b><div>{pago.descripcion}</div></div>
            <div><b>Categoría</b><div>{pago.categoria}</div></div>
          </div>
        </article>

        {/* Comprobantes */}
        <article className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 border border-gray-100">
          <header className="font-semibold text-gray-700 mb-2">Comprobantes</header>
          {puedeDescargarComprobante ? (
            <div className="flex flex-col gap-2">
              <p className="text-gray-500 text-xs">Se genera un comprobante de pago no fiscal con los datos reales.</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold transition" onClick={descargarComprobante}>
                Descargar Factura
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-gray-400 text-xs">No hay comprobantes disponibles. {pago.rawStatus === 'REJECTED' && 'Reintente el pago.'}</p>
              {pago.rawStatus === 'REJECTED' && !isMerchant &&  (
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold transition"
                  onClick={() => navigate(`/pago/${pago.id}`, { state: pago })}
                >
                  Reintentar pago
                </button>
              )}
            </div>
          )}
        </article>
      </section>

      {/* Timeline */}
      <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <header className="font-semibold text-gray-700">Timeline</header>
          {/* Filtros futuros */}
        </div>

        {tlErr && <p className="text-red-500 text-sm">{tlErr}</p>}
        {!tlErr && filteredTimeline.length === 0 && (
          <p className="text-gray-400 text-sm">No hay eventos para el filtro seleccionado.</p>
        )}

        {!tlErr && filteredTimeline.length > 0 && (
          <ul className="flex flex-col gap-6">
            {filteredTimeline.map((ev, i) => {
              const cat = ev.category;
              const open = !!expanded[ev.id];
              const hl = highlightPairs(ev.payload, pago.moneda);
              // Color de borde según categoría
              let borderColor = 'border-gray-200';
              if (cat === 'refund') borderColor = 'border-blue-300';
              if (cat === 'error') borderColor = 'border-red-300';
              if (cat === 'state') borderColor = 'border-green-300';
              return (
                <li key={ev.id} className={`relative bg-gray-50 rounded-lg p-4 border-l-4 ${borderColor} shadow-sm`}> 
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{mapEventType(ev.type)}{ev._count ? ` ×${ev._count}` : ''}</span>
                      <span className="text-xs text-gray-400">{fechaHora(ev.createdISO)}</span>
                    </div>
                    {!open && (
                      <button
                        className="text-blue-600 text-xs hover:underline px-2 py-1"
                        onClick={() => setExpanded((x) => ({ ...x, [ev.id]: true }))}
                      >
                        Ver más
                      </button>
                    )}
                  </div>

                  {open && (
                    <div className="mt-3 bg-white rounded shadow-inner p-4 border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div className="font-semibold text-gray-700">{mapEventType(ev.type)}{ev._count ? ` ×${ev._count}` : ''}</div>
                        <div className="text-xs text-gray-400">{fechaHora(ev.createdISO)}</div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">Actor: {ev.actor} · Origen: {ev.source}</div>

                      {hl.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {hl.map(([k, v]) => (
                            <div key={k} className="inline-flex items-center bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs font-medium">
                              <span className="mr-1 font-semibold">{k}:</span> {v}
                            </div>
                          ))}
                        </div>
                      )}

                      {ev.payload && typeof ev.payload === 'object' && (
                        <div className="bg-gray-100 rounded p-2 overflow-x-auto text-xs mb-2">
                          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(translatePayloadDeep(ev.payload), null, 2)}</pre>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          className="text-blue-600 text-xs hover:underline px-2 py-1"
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
    </div>
  );
}