import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Intenciones.css";

/** ---- Mock ---- */
const MOCK_INTENTOS = [
  {
    idIntent: "pi_9H2K",
    cotizacion: "#COT-5531",
    monto: 12000,
    moneda: "ARS",
    expiraISO: "2025-08-19T12:00:00",
    estado: "Pendiente",
  },
  {
    idIntent: "pi_9GZZ",
    cotizacion: "#COT-5520",
    monto: 58200,
    moneda: "ARS",
    expiraISO: null, // aprobado -> no aplica
    estado: "Aprobado",
    pagoId: 98421,   // para navegar al detalle
  },
];

/** ---- Utils ---- */
const money = (n, curr = "ARS", locale = "es-AR") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);

const fechaHoraCorta = (iso, locale = "es-AR") => {
  if (!iso) return "—";
  const d = new Date(iso);
  const f = d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  const h = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${f} ${h}`;
};

function Badge({ kind, children }) {
  const key = (kind || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return <span className={`pi-badge pi-badge--${key}`}>{children}</span>;
}

/** ---- View ---- */
export default function Intenciones({ data = MOCK_INTENTOS }) {
  const navigate = useNavigate();

  const filas = useMemo(() => [...data], [data]);

  const confirmar = (row) => {
    alert(`Confirmar pago\nIntent: ${row.idIntent}\nCotización: ${row.cotizacion}\nMonto: ${money(row.monto, row.moneda)}`);
  };

  return (
    <div className="pi-wrap">
      <h1 className="pi-title">Intenciones de pago</h1>
      <p className="pi-sub">
        Pendiente/Expirada, vigencia, monto y link a cotización.
      </p>

      <section className="table-card">
        <table >
          <thead>
            <tr>
              <th>ID Intent</th>
              <th>Cotización</th>
              <th>Monto</th>
              <th>Expira</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.idIntent}>
                <td className="pi-mono">{r.idIntent}</td>
                <td className="pi-mono">{r.cotizacion}</td>
                <td>{money(r.monto, r.moneda)}</td>
                <td>{fechaHoraCorta(r.expiraISO)}</td>
                <td><Badge kind={r.estado}>{r.estado}</Badge></td>
                <td>
                  {r.estado === "Pendiente" ? (
                    <button className="pi-btn pi-btn--pri" onClick={() => confirmar(r)}>
                      Confirmar
                    </button>
                  ) : (
                    <button
                      className="pi-btn pi-btn--ghost"
                      onClick={() => navigate(`/detalle/${r.pagoId ?? 98421}`)}
                    >
                      Ver pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td className="pi-empty" colSpan={6}>Sin intenciones.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
