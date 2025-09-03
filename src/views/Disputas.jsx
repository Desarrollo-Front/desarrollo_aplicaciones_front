import { useMemo, useState } from "react";
import "./Disputas.css";

/** ---- Mock (según la captura) ---- */
const MOCK_DISPUTAS = [
  {
    id: "dp_441",
    pago: "#98419",
    monto: 23900,
    moneda: "ARS",
    provisionado: 23900,
    estado: "En revisión",
    ultimaISO: "2025-08-19T10:00:00",
    evidencias: ["factura.pdf", "firma.png"],
    notas: "Se adjuntó comprobante de servicio prestado.",
  },
];

/** ---- Utils ---- */
const money = (n, curr = "ARS", locale = "es-AR") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);

const fechaCorta = (iso, locale = "es-AR") =>
  new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });

function Badge({ kind, children }) {
  const key = (kind || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");
  return <span className={`dp-badge dp-badge--${key}`}>{children}</span>;
}

/** ---- Componente principal ---- */
export default function Disputas({ data = MOCK_DISPUTAS }) {
  const filas = useMemo(() => [...data], [data]);
  const [sel, setSel] = useState(null); // disputa seleccionada (para modal)

  const agregarEvidencia = (row) => {
    // demo: agrega un nombre de archivo ficticio
    const nombre = prompt("Nombre del archivo a adjuntar:", "captura.png");
    if (!nombre) return;
    row.evidencias = [...row.evidencias, nombre];
    setSel({ ...row }); // refresca modal
  };

  const responder = (row) => {
    alert(`Responder disputa ${row.id}\nPago: ${row.pago}\nMonto: ${money(row.monto, row.moneda)}`);
  };

  return (
    <div className="dp-wrap">
      <h1 className="dp-title">Disputas</h1>
      <p className="dp-sub">Listado + detalle con evidencias, notas y monto provisionado.</p>

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID Disputa</th>
              <th>Pago</th>
              <th>Monto</th>
              <th>Provisionado</th>
              <th>Estado</th>
              <th>Última act.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.id}>
                <td className="dp-mono">{r.id}</td>
                <td className="dp-mono">{r.pago}</td>
                <td>{money(r.monto, r.moneda)}</td>
                <td>{money(r.provisionado, r.moneda)}</td>
                <td><Badge kind={r.estado}>{r.estado}</Badge></td>
                <td>{fechaCorta(r.ultimaISO)}</td>
                <td>
                  <button className="dp-btn dp-btn--ghost" onClick={() => setSel(r)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td className="dp-empty" colSpan={7}>No hay disputas para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      
      {/* ---- Modal ---- */}
{sel && (
  <>
    <div className="dp-overlay" onClick={() => setSel(null)} />
    <div className="dp-modal" role="dialog" aria-modal="true" aria-labelledby="dp-modal-title">
      <div className="dp-modal-head">
        <div className="dp-modal-titlewrap">
          <div className="dp-chip-id">ID</div>
          <h3 id="dp-modal-title">Disputa {sel.id}</h3>
        </div>
        <button className="dp-close" onClick={() => setSel(null)} aria-label="Cerrar modal">Cerrar</button>
      </div>

      {/* resumen en tarjetitas */}
      <div className="dp-cards">
        <div className="dp-card">
          <div className="dp-label">Pago</div>
          <div className="dp-value dp-mono">{sel.pago}</div>
        </div>
        <div className="dp-card">
          <div className="dp-label">Estado</div>
          <div className="dp-value"><Badge kind={sel.estado}>{sel.estado}</Badge></div>
        </div>
        <div className="dp-card">
          <div className="dp-label">Monto</div>
          <div className="dp-value">{money(sel.monto, sel.moneda)}</div>
        </div>
        <div className="dp-card">
          <div className="dp-label">Provisionado</div>
          <div className="dp-value">{money(sel.provisionado, sel.moneda)}</div>
        </div>
        <div className="dp-card">
          <div className="dp-label">Última act.</div>
          <div className="dp-value">{fechaCorta(sel.ultimaISO)}</div>
        </div>
      </div>

      <div className="dp-sep" />

      <div className="dp-two">
        <div className="dp-block">
          <div className="dp-block-title">Evidencias</div>
          <ul className="dp-files">
            {sel.evidencias.map((f, i) => <li key={i}><span className="dp-file">{f}</span></li>)}
          </ul>
        </div>

        <div className="dp-block">
          <div className="dp-block-title">Notas</div>
          <div className="dp-note">{sel.notas || "—"}</div>
        </div>
      </div>

      <div className="dp-actions">
        <button className="dp-btn dp-btn--ghost" onClick={() => {
          const nombre = prompt("Nombre del archivo a adjuntar:", "captura.png");
          if (!nombre) return;
          sel.evidencias = [...sel.evidencias, nombre];
          setSel({ ...sel });
        }}>
          Agregar evidencia
        </button>
        <button className="dp-btn dp-btn--pri" onClick={() => {
          alert(`Responder disputa ${sel.id}`);
        }}>
          Responder disputa
        </button>
      </div>
    </div>
  </>
)}

    </div>
  );
}
