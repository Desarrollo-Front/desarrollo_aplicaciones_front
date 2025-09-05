import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Pagos-Detalle.css";

const money = (n, curr = "ARS", locale = "es-AR") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);

const fechaHora = (iso, locale = "es-AR") => {
  const d = new Date(iso);
  const f = d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  const h = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${f} ${h}`;
};

function Badge({ kind, children }) {
  const key = (kind || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return <span className={`pd-badge pd-badge--${key}`}>{children}</span>;
}

/** Mock base para clonar/hidratar por id */
const MOCK_DETALLE_BASE = {
  id: 98421,
  cliente: "Paula Álvarez",
  prestador: "Servicios Tigre SRL",
  solicitud: "RCOT-5540",
  idInterno: "pj_04ZZ",
  metodo: "Crédito",
  estado: "Aprobado",
  subtotal: 52000,
  impuestos: 6200,
  total: 58200,
  moneda: "ARS",
  creadoISO: "2025-08-18T14:31:00",
  capturadoISO: "2025-08-18T14:52:00",
  expiraISO: "2025-09-18T14:52:00",
  fees: 580,
  paymentRef: "pr_98421-ARG",
  gatewayTxn: "GW-205501B-425",
  condicionIVA: "Responsable Inscripto",
  cuit: "20-12345679-8",
  domicilio: "Av. Siempre Viva 742, CABA",
  cuotas: "1/1",
  factura: { nro: "A-0001-0001234", estado: "Emitida", emitidaISO: "2025-08-18T15:10:00" },
  notaCredito: { nro: "NCA-0001-0000456", estado: "No emitida", emitidaISO: null },
  refunds: [
    { id: "r_1001", monto: 5180, estado: "Completado", motivo: "Solicitud del cliente", gatewayRef: "GW-RF-68991", fechaISO: "2025-09-19T08:09:00" },
  ],
  timeline: [
    ["Intento creado (ID pj_04ZZ — Cotización aceptada).", "2025-08-18T14:30:00"],
    ["Autorización aprobada. Código emisor 08.", "2025-08-18T14:31:00"],
    ["Captura: paymentIntention publicada.", "2025-08-18T14:52:00"],
    ["Factura emitida A-0001-0001234.", "2025-08-18T15:10:00"],
    ["Timeout gateway (código GW_TIMEOUT) — reintento 30s.", "2025-08-19T09:05:00"],
    ["Reconciliación Lote-12/255501-B1 conciliado.", "2025-08-19T10:35:00"],
    ["Reembolso completado. Monto $ 5.180 — Motivo: Solicitud del cliente.", "2025-09-19T08:09:00"],
    ["Nota de crédito emitida: NCA-0001-0000456.", "2025-09-19T09:10:00"],
  ],
};

export default function PagosDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  
  const pago = useMemo(() => {
    const numId = Number(id);
    if (!id || Number.isNaN(numId)) return null;
   
    if (numId === 98421) return MOCK_DETALLE_BASE;
    return {
      ...MOCK_DETALLE_BASE,
      id: numId,
      paymentRef: `pr_${numId}-ARG`,
      solicitud: `RCOT-${String(numId).slice(-4)}`,
      factura: { ...MOCK_DETALLE_BASE.factura, nro: `A-0001-${String(numId).padStart(7, "0")}` },
    };
  }, [id]);

  if (!pago) {
    return (
      <div className="pd-wrap">
        <h2>No se encontró el pago #{id}</h2>
      </div>
    );
  }

  const [showRefund, setShowRefund] = useState(false);
  const [monto, setMonto] = useState(3000);
  const [motivo, setMotivo] = useState("Cancelación del servicio");
  const [notas, setNotas] = useState("");

  const totales = useMemo(
    () => ({
      sub: money(pago.subtotal, pago.moneda),
      imp: money(pago.impuestos, pago.moneda),
      tot: money(pago.total, pago.moneda),
    }),
    [pago]
  );

  const confirmarReembolso = (e) => {
    e.preventDefault();
    alert(
      `Reembolso solicitado\nMonto: ${money(Number(monto) || 0, pago.moneda)}\nMotivo: ${motivo}\nNotas: ${notas || "-"}`
    );
    setShowRefund(false);
  };

  return (
    <div className="pd-wrap">
       <button
        className="pd-btn pd-btn--ghost pd-back"
        onClick={() => navigate("/pagos")}
      >
        ← Volver
      </button>
      <h1 className="pd-title">Detalle de pago #{pago.id}</h1>
      <p className="pd-sub">Resumen, datos fiscales &amp; referencia, timeline, comprobantes y reembolsos.</p>

      
      <section className="pd-grid">
        
        <article className="pd-card">
          <header className="pd-card-h">Resumen</header>
          <div className="pd-kv">
            <div><b>Cliente</b><span>{pago.cliente}</span></div>
            <div><b>Prestador</b><span>{pago.prestador}</span></div>
            <div><b>Solicitud/Cotización</b><span>{pago.solicitud}</span></div>
            <div><b>ID interno</b><span>{pago.idInterno}</span></div>
            <div><b>Método</b><span><Badge kind={pago.metodo}>{pago.metodo}</Badge></span></div>
            <div><b>Estado</b><span><Badge kind={pago.estado}>{pago.estado}</Badge></span></div>
            <div><b>Subtotal</b><span>{totales.sub}</span></div>
            <div><b>Impuestos</b><span>{totales.imp}</span></div>
            <div className="pd-total"><b>Total</b><span>{totales.tot}</span></div>
            <div><b>Creado</b><span>{fechaHora(pago.creadoISO)}</span></div>
            <div><b>Capturado</b><span>{fechaHora(pago.capturadoISO)}</span></div>
            <div><b>Expira</b><span>{fechaHora(pago.expiraISO)}</span></div>
          </div>

          <div className="pd-actions">
            <button className="pd-btn pd-btn--pri" onClick={() => setShowRefund(true)}>Reembolso</button>
            <button className="pd-btn">Reintentar</button>
            <button className="pd-btn pd-btn--ghost">Abrir disputa</button>
          </div>
        </article>

        
        <article className="pd-card">
          <header className="pd-card-h">Datos fiscales &amp; referencia</header>
          <div className="pd-kv">
            <div><b>Moneda</b><span>{pago.moneda}</span></div>
            <div><b>Fees</b><span>{money(pago.fees, pago.moneda)}</span></div>
            <div><b>Payment reference</b><span>{pago.paymentRef}</span></div>
            <div><b>Gateway Txn</b><span>{pago.gatewayTxn}</span></div>
            <div><b>Condición IVA</b><span>{pago.condicionIVA}</span></div>
            <div><b>CUIT/CUIL</b><span>{pago.cuit}</span></div>
            <div><b>Domicilio fiscal</b><span>{pago.domicilio}</span></div>
            <div><b>Cuotas</b><span>{pago.cuotas}</span></div>
          </div>
        </article>

        
        <article className="pd-card">
          <header className="pd-card-h">Comprobantes</header>

          <div className="pd-doc">
            <div className="pd-doc-h">
              <div>
                <b>Factura N°</b> <span>{pago.factura.nro}</span>
              </div>
              <Badge kind={pago.factura.estado}>{pago.factura.estado}</Badge>
            </div>
            <small className="pd-muted">Emitida: {fechaHora(pago.factura.emitidaISO)}</small>
            <div className="pd-doc-actions">
              <button className="pd-btn pd-btn--ghost">Ver PDF</button>
              <button className="pd-btn">Descargar</button>
            </div>
          </div>

          <div className="pd-doc">
            <div className="pd-doc-h">
              <div>
                <b>Nota de Crédito N°</b> <span>{pago.notaCredito.nro}</span>
              </div>
              <Badge kind="No emitida">{pago.notaCredito.estado}</Badge>
            </div>
            <small className="pd-muted">—</small>
            <div className="pd-doc-actions">
              <button className="pd-btn pd-btn--ghost">Ver PDF</button>
              <button className="pd-btn">Descargar</button>
            </div>
          </div>
        </article>
      </section>

     
      <section className="pd-card pd-refunds">
        <header className="pd-card-h">Reembolsos</header>
        <table className="pd-tbl">
          <thead>
            <tr>
              <th>ID</th><th>Monto</th><th>Estado</th><th>Motivo</th><th>Gateway refund</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pago.refunds.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{money(r.monto, pago.moneda)}</td>
                <td><Badge kind={r.estado}>{r.estado}</Badge></td>
                <td>{r.motivo}</td>
                <td>{r.gatewayRef}</td>
                <td>{fechaHora(r.fechaISO)}</td>
              </tr>
            ))}
            {pago.refunds.length === 0 && (
              <tr><td className="pd-empty" colSpan={6}>Sin reembolsos.</td></tr>
            )}
          </tbody>
        </table>
      </section>

     
      <section className="pd-timeline">
        <header className="pd-card-h">Timeline</header>
        <ul className="pd-time">
          {pago.timeline.map(([txt, iso], i) => (
            <li key={i}>
              <div className="pd-time-dot" />
              <div className="pd-time-row">
                <div className="pd-time-txt">{txt}</div>
                <div className="pd-time-date">{fechaHora(iso)}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

     
      {showRefund && (
        <div className="pd-modal-overlay" role="dialog" aria-modal="true">
          <form className="pd-modal" onSubmit={confirmarReembolso}>
            <div className="pd-modal-h">
              <h3>Reembolso <small className="pd-muted">Ventana: 7 días desde la captura</small></h3>
              <button type="button" className="pd-btn pd-btn--chip" onClick={() => setShowRefund(false)}>Cerrar</button>
            </div>

            <label className="pd-field">
              <span>Monto</span>
              <input type="number" className="pd-input" value={monto} min="0" onChange={(e) => setMonto(e.target.value)} />
            </label>

            <label className="pd-field">
              <span>Motivo</span>
              <select className="pd-input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option>Cancelación del servicio</option>
                <option>Solicitud del cliente</option>
                <option>Error de facturación</option>
                <option>Fraude confirmado</option>
              </select>
            </label>

            <label className="pd-field">
              <span>Notas</span>
              <textarea className="pd-input pd-textarea" placeholder="Detalle opcional" value={notas} onChange={(e) => setNotas(e.target.value)} />
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
