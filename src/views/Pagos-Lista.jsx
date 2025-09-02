import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Pagos-Lista.css";


const MOCK_PAGOS = [
  {
    id: 98421,
    cliente: "Paula Álvarez",
    prestador: "Servicios Tigre SRL",
    metodo: "Crédito", 
    estado: "Aprobado", 
    subtotal: 52000,
    impuestos: 6200,
    total: 58200,
    moneda: "ARS",
    fechaISO: "2025-08-18T14:31:00",
  },
  {
    id: 98420,
    cliente: "Juan Pérez",
    prestador: "Servicios Tigre SRL",
    metodo: "Billetera",
    estado: "Pendiente",
    subtotal: 10000,
    impuestos: 2000,
    total: 12000,
    moneda: "ARS",
    fechaISO: "2025-08-18T13:02:00",
  },
  {
    id: 98419,
    cliente: "María Giménez",
    prestador: "Reparaciones Norte",
    metodo: "Débito",
    estado: "Rechazado",
    subtotal: 21100,
    impuestos: 21800,
    total: 42900,
    moneda: "ARS",
    fechaISO: "2025-08-17T19:47:00",
  },
  {
    id: 98418,
    cliente: "Laura Soto",
    prestador: "Servicios Tigre SRL",
    metodo: "Crédito",
    estado: "Expirado",
    subtotal: 8000,
    impuestos: 960,
    total: 8960,
    moneda: "ARS",
    fechaISO: "2025-08-16T09:28:00",
  },
];

const METODOS = ["Todos los métodos", "Tarjeta crédito", "Tarjeta débito", "Billetera"];
const ESTADOS_CHIPS = [
  "Pendiente",
  "Aprobado",
  "Rechazado",
  "Disputa",
  "Reembolsado",
  "Expirado",
  
  "Crédito",
  "Débito",
  "Billetera",
];


const money = (n, curr = "ARS", locale = "es-AR") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);

const fechaFmt = (iso, locale = "es-AR") => {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  const hora = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
};


function Badge({ kind, children }) {
  const key = (kind || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return <span className={`pl-badge pl-badge--${key}`}>{children}</span>;
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" className={`pl-chip ${active ? "is-on" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}


export default function PagosLista({ data = MOCK_PAGOS, onVer }) {
  
  const [rol, setRol] = useState("Cliente"); 
  const [query, setQuery] = useState("");
  const [metodo, setMetodo] = useState(METODOS[0]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState("Fecha ⬇"); 
  const [chips, setChips] = useState(new Set());
  const navigate = useNavigate();

  
  const toggleChip = (name) => {
    const next = new Set(chips);
    next.has(name) ? next.delete(name) : next.add(name);
    setChips(next);
  };

  
  const pagos = useMemo(() => {
    let arr = [...data];

    
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((p) =>
        (rol === "Cliente" ? p.cliente : p.prestador).toLowerCase().includes(q)
      );
    }

    
    if (metodo !== METODOS[0]) {
      const map = { "Tarjeta crédito": "Crédito", "Tarjeta débito": "Débito", Billetera: "Billetera" };
      arr = arr.filter((p) => p.metodo === map[metodo]);
    }

    
    if (desde) arr = arr.filter((p) => new Date(p.fechaISO) >= new Date(desde + "T00:00:00"));
    if (hasta) arr = arr.filter((p) => new Date(p.fechaISO) <= new Date(hasta + "T23:59:59"));

    
    if (chips.size) {
      arr = arr.filter((p) => chips.has(p.estado) || chips.has(p.metodo));
    }

    
    arr.sort((a, b) => {
      if (orden.startsWith("Fecha")) {
        return orden.endsWith("⬇")
          ? new Date(b.fechaISO) - new Date(a.fechaISO)
          : new Date(a.fechaISO) - new Date(b.fechaISO);
      }
      return orden.endsWith("⬇") ? b.total - a.total : a.total - b.total;
    });

    return arr;
  }, [data, rol, query, metodo, desde, hasta, chips, orden]);

  
  const exportCSV = () => {
    const headers = [
      "ID",
      "Cliente",
      "Prestador",
      "Método",
      "Estado",
      "Subtotal",
      "Impuestos",
      "Total",
      "Moneda",
      "Fecha",
      "Hora",
    ];
    const rows = pagos.map((p) => {
      const { fecha, hora } = fechaFmt(p.fechaISO);
      return [
        p.id,
        p.cliente,
        p.prestador,
        p.metodo,
        p.estado,
        p.subtotal,
        p.impuestos,
        p.total,
        p.moneda,
        fecha,
        hora,
      ];
    });
    const csv =
      headers.join(",") +
      "\n" +
      rows
        .map((r) =>
          r
            .map((v) => {
              const s = String(v ?? "");
              return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pl-wrap">
      <h1 className="pl-title">Pagos</h1>
      <p className="pl-sub">Lista con búsqueda por rol, rango de fechas y orden por monto/fecha.</p>

      {/* Filtros */}
      <section className="pl-filters">
        <div className="pl-field">
          <label>Buscar por {rol.toLowerCase()}</label>
          <div className="pl-inline">
            <select className="pl-sel" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option>Cliente</option>
              <option>Prestador</option>
            </select>
            <input
              className="pl-input"
              placeholder={`Buscar por ${rol.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="pl-field">
          <label>Método</label>
          <select className="pl-sel" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="pl-field">
          <label>Desde</label>
          <input type="date" className="pl-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>

        <div className="pl-field">
          <label>Hasta</label>
          <input type="date" className="pl-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>

        <div className="pl-field">
          <label>Orden</label>
          <select className="pl-sel" value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option>Fecha ⬇</option>
            <option>Fecha ⬆</option>
            <option>Monto ⬇</option>
            <option>Monto ⬆</option>
          </select>
        </div>

        <div className="pl-field pl-right">
          <label>&nbsp;</label>
          <button className="pl-btn" onClick={exportCSV}>Exportar CSV</button>
        </div>
      </section>

      {/* Chips */}
      <div className="pl-chips">
        {ESTADOS_CHIPS.map((e) => (
          <Chip key={e} active={chips.has(e)} onClick={() => toggleChip(e)}>
            {e}
          </Chip>
        ))}
      </div>

      {/* Tabla */}
      <section className="pl-card">
        <table className="pl-tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Prestador</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Subtotal</th>
              <th>Impuestos</th>
              <th>Total</th>
              <th>Moneda</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => {
              const { fecha, hora } = fechaFmt(p.fechaISO);
              return (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{p.cliente}</td>
                  <td>{p.prestador}</td>
                  <td><Badge kind={p.metodo}>{p.metodo}</Badge></td>
                  <td><Badge kind={p.estado}>{p.estado}</Badge></td>
                  <td>{money(p.subtotal, p.moneda)}</td>
                  <td>{money(p.impuestos, p.moneda)}</td>
                  <td className="pl-bold">{money(p.total, p.moneda)}</td>
                  <td>{p.moneda}</td>
                  <td>
                    <div className="pl-fecha">
                      <div>{fecha}</div>
                      <small>{hora}</small>
                    </div>
                  </td>
                  <td>
                    <button
                      className="pl-btn pl-btn--ghost"
                      onClick={() => navigate(`/detalle/${p.id}`)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
            {pagos.length === 0 && (
              <tr>
                <td className="pl-empty" colSpan={11}>No hay resultados con los filtros aplicados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
