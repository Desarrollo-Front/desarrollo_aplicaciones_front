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
  const key = (kind || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return <span className={`pd-badge pd-badge--${key}`}>{children}</span>;
}

const mapStatus = (s) => {
  const t = String(s || '').toUpperCase();
  if (t === 'PENDING') return 'Pendiente';
  if (t === 'PENDING_PAYMENT') return 'Pendiente de Pago';
  if (t === 'PENDING_APPROVAL') return 'Pendiente de Aprobación';
  if (t === 'APPROVED' || t === 'CAPTURED') return 'Aprobado';
  if (t === 'REJECTED' || t === 'FAILED') return 'Rechazado';
  if (t === 'EXPIRED') return 'Expirado';
  if (t === 'REFUNDED') return 'Reembolsado';
  if (t === 'DISPUTE' || t === 'DISPUTED') return 'Disputa';
  return 'Pendiente';
};

const getMetodoTag = (method) => {
  const type = String(method?.type || '').toUpperCase();
  if (type === 'CREDIT_CARD') return 'Crédito';
  if (type === 'DEBIT_CARD') return 'Débito';
  if (type === 'MERCADO_PAGO') return 'Mercado Pago';
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
  return x.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const labelize = (k) =>
  String(k || '')
    .replaceAll('_', ' ')
    .replaceAll('.', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

const toDisplay = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export default function PagosDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pago, setPago] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tlErr, setTlErr] = useState('');

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
          fetch(`http://18.191.118.13:8080/api/payments/${id}`, {
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          }),
          fetch(`http://18.191.118.13:8080/api/payments/${id}/timeline`, {
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
        setPago({
          id: p.id,
          cliente: localStorage.getItem('name') || '—',
          prestador: p.provider_id ? `ID: ${p.provider_id}` : '—',
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
        });

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
            return {
              id: e.id,
              type: e.type,
              actor: e.actor || 'system',
              source: e.eventSource || e.source || 'SYSTEM',
              createdISO: e.createdAt || e.created_at || null,
              payload: payloadObj,
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
  }, [id]);

  const [showRefund, setShowRefund] = useState(false);
  const [monto, setMonto] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');

  const totales = useMemo(() => {
    if (!pago) return { sub: '-', imp: '-', tot: '-' };
    return {
      sub: money(pago.subtotal, pago.moneda),
      imp: money(pago.impuestos, pago.moneda),
      tot: money(pago.total, pago.moneda),
    };
  }, [pago]);

  const confirmarReembolso = (e) => {
    e.preventDefault();
    if (!pago) return;
    alert(
      `Reembolso solicitado\nMonto: ${money(Number(monto) || 0, pago.moneda)}\nMotivo: ${motivo}\nNotas: ${notas || '-'}`
    );
    setShowRefund(false);
  };

  if (loading) {
    return (
      <div className="pd-wrap">
        <button className="pd-btn pd-btn--ghost pd-back" onClick={() => navigate('/pagos')}>← Volver</button>
        <h1 className="pd-title">Detalle de pago</h1>
        <p className="pd-sub">Cargando…</p>
      </div>
    );
  }

  if (!pago) {
    return (
      <div className="pd-wrap">
        <button className="pd-btn pd-btn--ghost pd-back" onClick={() => navigate('/pagos')}>← Volver</button>
        <h1 className="pd-title">Detalle de pago</h1>
        <p className="pd-sub">{err || 'No se encontró el pago.'}</p>
      </div>
    );
  }

  return (
    <div className="pd-wrap">
      <button className="pd-btn pd-btn--ghost pd-back" onClick={() => navigate('/pagos')}>← Volver</button>
      <h1 className="pd-title">Detalle de pago #{pago.id}</h1>
      <p className="pd-sub">Resumen, datos fiscales &amp; referencia, timeline, comprobantes y reembolsos.</p>

      <section className="pd-grid">
        <article className="pd-card">
          <header className="pd-card-h">Resumen</header>
          <div className="pd-kv">
            <div><b>Cliente</b><span>{pago.cliente}</span></div>
            <div><b>Prestador</b><span>{pago.prestador}</span></div>
            <div><b>Método</b><span><Badge kind={pago.metodo}>{pago.metodo}</Badge></span></div>
            <div><b>Estado</b><span><Badge kind={pago.estado}>{pago.estado}</Badge></span></div>
            <div><b>Subtotal</b><span>{totales.sub}</span></div>
            <div><b>Impuestos</b><span>{totales.imp}</span></div>
            <div className="pd-total"><b>Total</b><span>{totales.tot}</span></div>
            <div><b>Creado</b><span>{fechaHora(pago.creadoISO)}</span></div>
            <div><b>Capturado</b><span>{fechaHora(pago.capturadoISO)}</span></div>
          </div>
        </article>

        <article className="pd-card">
          <header className="pd-card-h">Datos fiscales &amp; referencia</header>
          <div className="pd-kv">
            <div><b>Moneda</b><span>{pago.moneda}</span></div>
            <div><b>Fees</b><span>{money(pago.fees, pago.moneda)}</span></div>
            <div><b>Descripción</b><span>{pago.descripcion}</span></div>
            <div><b>Categoría</b><span>{pago.categoria}</span></div>
            <div><b>Motivo reembolso</b><span>{pago.refund_reason}</span></div>
          </div>
        </article>

        <article className="pd-card">
          <header className="pd-card-h">Comprobantes</header>
          <p className="pd-muted">No hay comprobantes disponibles.</p>
        </article>
      </section>

      <section className="pd-card pd-refunds">
        <header className="pd-card-h">Reembolsos</header>
        {pago.refundId ? (
          <div className="pd-kv">
            <div><b>Estado</b><span>Hay reembolso</span></div>
            <div><b>ID de reembolso</b><span>{pago.refundId}</span></div>
          </div>
        ) : (
          <div className="pd-empty">
            <p className="pd-muted">Sin reembolsos registrados.</p>
            <button className="pd-btn pd-btn--pri" onClick={() => setShowRefund(true)}>Solicitar reembolso</button>
          </div>
        )}
      </section>

      <section className="pd-timeline">
        <header className="pd-card-h">Timeline</header>
        {tlErr && <p className="pd-muted">{tlErr}</p>}
        {!tlErr && timeline.length === 0 && <p className="pd-muted">No hay eventos en el timeline.</p>}
        {!tlErr && timeline.length > 0 && (
          <ul className="pd-time">
            {timeline.map((ev) => (
              <li key={ev.id}>
                <div className="pd-time-dot" />
                <div className="pd-time-row">
                  <div className="pd-time-txt">
                    <div><b>{mapEventType(ev.type)}</b></div>
                    <small className="pd-muted">Actor: {ev.actor} · Origen: {ev.source}</small>
                    {ev.payload && typeof ev.payload === 'object' && (
                      <div className="pd-payload">
                        <div className="pd-kv pd-kv--mini">
                          {Object.entries(ev.payload).map(([k, v]) => (
                            <div key={k}>
                              <b>{labelize(k)}</b>
                              <span>{toDisplay(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pd-time-date">{fechaHora(ev.createdISO)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showRefund && (
        <div className="pd-modal-overlay" role="dialog" aria-modal="true">
          <form className="pd-modal" onSubmit={confirmarReembolso}>
            <div className="pd-modal-h">
              <h3>Reembolso</h3>
              <button type="button" className="pd-btn pd-btn--chip" onClick={() => setShowRefund(false)}>Cerrar</button>
            </div>
            <label className="pd-field">
              <span>Monto</span>
              <input type="number" className="pd-input" value={monto} min="0" onChange={(e) => setMonto(e.target.value)} />
            </label>
            <label className="pd-field">
              <span>Motivo</span>
              <input type="text" className="pd-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </label>
            <label className="pd-field">
              <span>Notas</span>
              <textarea className="pd-input pd-textarea" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </label>
            <div className="pd-modal-actions">
              <button type="submit" className="pd-btn pd-btn--pri">Confirmar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
