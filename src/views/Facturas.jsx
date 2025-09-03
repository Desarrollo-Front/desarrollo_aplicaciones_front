import { useMemo } from "react";
import "./Facturas.css";

/** ---- Mock (como en tu captura) ---- */
const MOCK_FACTURAS = [
  {
    nro: "A-0001-00001234",
    pago: "#98421",
    tipo: "Factura A",
    estado: "Emitida",
    fechaISO: "2025-08-18T10:20:00",
  },
  {
    nro: "NCA-0001-00000456",
    pago: "#98421",
    tipo: "Nota de Crédito",
    estado: "Emitida",
    fechaISO: "2025-08-19T08:10:00",
  },
];

/** ---- Utils ---- */
const fechaCorta = (iso, locale = "es-AR") =>
  new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });

function Badge({ kind, children }) {
  const key = (kind || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  return <span className={`fa-badge fa-badge--${key}`}>{children}</span>;
}

export default function Facturas({ data = MOCK_FACTURAS }) {
  const filas = useMemo(() => [...data], [data]);

  const descargarPDF = (row) => {
    // demo: genera un PDF "falso" como blob para descargar
    const content = `
      Factura/Comprobante
      -------------------
      Nº: ${row.nro}
      Pago: ${row.pago}
      Tipo: ${row.tipo}
      Estado: ${row.estado}
      Fecha: ${fechaCorta(row.fechaISO)}
    `;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.nro}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const enviarEmail = (row) => {
    alert(`Enviar por email el comprobante\n\n${row.nro} (${row.tipo}) vinculado a ${row.pago}`);
  };

  return (
    <div className="fa-wrap">
      <h1 className="fa-title">Facturas</h1>
      <p className="fa-sub">Descargar PDF o enviar por email.</p>

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Pago</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.nro}>
                <td className="fa-mono">{r.nro}</td>
                <td className="fa-mono">{r.pago}</td>
                <td>{r.tipo}</td>
                <td>
                  <Badge kind={r.estado}>{r.estado}</Badge>
                </td>
                <td>{fechaCorta(r.fechaISO)}</td>
                <td className="fa-actions">
                  <button className="fa-btn fa-btn--pri" onClick={() => descargarPDF(r)}>
                    Descargar
                  </button>
                  <button className="fa-btn fa-btn--ghost" onClick={() => enviarEmail(r)}>
                    Enviar email
                  </button>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td className="fa-empty" colSpan={6}>
                  No hay comprobantes para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
