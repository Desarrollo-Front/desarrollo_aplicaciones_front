import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Pagos-Lista.css";

const METODOS = ["Todos los métodos", "Tarjeta crédito", "Tarjeta débito", "Billetera"];
const ESTADOS_CHIPS = ["Pendiente","Aprobado","Rechazado","Disputa","Reembolsado","Expirado","Crédito","Débito","Billetera"];

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

const mapStatus = (s) => {
  const t = String(s || "").toUpperCase();
  if (t === "PENDING") return "Pendiente";
  if (t === "APPROVED" || t === "CAPTURED") return "Aprobado";
  if (t === "REJECTED" || t === "FAILED") return "Rechazado";
  if (t === "EXPIRED") return "Expirado";
  if (t === "REFUNDED") return "Reembolsado";
  if (t === "DISPUTE" || t === "DISPUTED") return "Disputa";
  return "Pendiente";
};
const normalizeMetodo = (m) => {
  const val = String(m || "").toLowerCase();
  if (["credito","credit","tarjeta credito"].includes(val)) return "Crédito";
  if (["debito","debit","tarjeta debito"].includes(val)) return "Débito";
  if (["billetera","wallet","mp","mercadopago"].includes(val)) return "Billetera";
  return "—";
};

export default function PagosLista() {
  const navigate = useNavigate();

  const [serverData, setServerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  
  const authRole =
    (JSON.parse(localStorage.getItem("auth") || "{}").role ||
      localStorage.getItem("role") ||
      "USER").toUpperCase();

  
  const searchBy = authRole === "MERCHANT" ? "Cliente" : authRole === "USER" ? "Prestador" : "Cliente";

  const [query, setQuery] = useState("");
  const [metodo, setMetodo] = useState(METODOS[0]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState("Fecha ⬇");
  const [chips, setChips] = useState(new Set());

  const userName =
    (JSON.parse(localStorage.getItem("auth") || "{}").name) ||
    localStorage.getItem("name") ||
    "Usuario";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const toggleChip = (name) => {
    const next = new Set(chips);
    next.has(name) ? next.delete(name) : next.add(name);
    setChips(next);
  };

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setFetchErr("");
      try {
        const authHeader =
          localStorage.getItem("authHeader") ||
          `${localStorage.getItem("tokenType") || "Bearer"} ${localStorage.getItem("token") || ""}`;

        const res = await fetch("http://localhost:8080/api/payments/my-payments", {
          headers: { "Content-Type": "application/json", Authorization: authHeader },
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error("No autorizado. Iniciá sesión nuevamente.");
          throw new Error("No se pudieron obtener los pagos.");
        }

        const list = await res.json();
        const mapped = (Array.isArray(list) ? list : []).map((p) => ({
          id: p.id,
          cliente: `Usuario #${p.user_id ?? "-"}`,
          prestador: p.provider_id ? `Proveedor #${p.provider_id}` : "-",
          metodo: normalizeMetodo(p?.metadata?.method),
          estado: mapStatus(p.status),
          subtotal: Number(p.amount_subtotal ?? 0),
          impuestos: Number((p.taxes ?? 0) + (p.fees ?? 0)),
          total: Number(p.amount_total ?? 0),
          moneda: String(p.currency || "ARS").toUpperCase(),
          fechaISO: p.created_at,
        }));
        setServerData(mapped);
      } catch (e) {
        setFetchErr(e.message || "Error inesperado obteniendo pagos.");
        setServerData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  
  const pagos = useMemo(() => {
    let arr = [...serverData];

    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((p) =>
        (searchBy === "Cliente" ? p.cliente : p.prestador).toLowerCase().includes(q)
      );
    }

    if (metodo !== METODOS[0]) {
      const map = { "Tarjeta crédito": "Crédito", "Tarjeta débito": "Débito", Billetera: "Billetera" };
      arr = arr.filter((p) => p.metodo === map[metodo]);
    }

    if (desde) arr = arr.filter((p) => new Date(p.fechaISO) >= new Date(desde + "T00:00:00"));
    if (hasta) arr = arr.filter((p) => new Date(p.fechaISO) <= new Date(hasta + "T23:59:59"));

    if (chips.size) arr = arr.filter((p) => chips.has(p.estado) || chips.has(p.metodo));

    arr.sort((a, b) => {
      if (orden.startsWith("Fecha")) {
        return orden.endsWith("⬇")
          ? new Date(b.fechaISO) - new Date(a.fechaISO)
          : new Date(a.fechaISO) - new Date(b.fechaISO);
      }
      return orden.endsWith("⬇") ? b.total - a.total : a.total - b.total;
    });

    return arr;
  }, [serverData, query, metodo, desde, hasta, chips, orden, searchBy]);

  const exportCSV = () => {
    const headers = ["ID","Cliente","Prestador","Método","Estado","Subtotal","Impuestos","Total","Moneda","Fecha","Hora"];
    const rows = pagos.map((p) => {
      const { fecha, hora } = fechaFmt(p.fechaISO);
      return [p.id,p.cliente,p.prestador,p.metodo,p.estado,p.subtotal,p.impuestos,p.total,p.moneda,fecha,hora];
    });
    const csv = headers.join(",") + "\n" + rows
      .map((r) => r.map((v) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")).
      join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pagos_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pl-wrap">
      <h1 className="pl-title">Pagos</h1>
      <div className="logout-top">
        <span className="pl-user">Hola, {userName}</span>
        <button className="pl-btn pl-btn--logout" onClick={handleLogout}>Cerrar sesión</button>
      </div>

     
      <section className="pl-filters">
        <div className="pl-field">
          
          <label>Buscar por {searchBy.toLowerCase()}</label>
          <div className="pl-inline">
            
            <input
              className="pl-input"
              placeholder={`Buscar por ${searchBy.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="pl-field">
          <label>Método</label>
          <select className="pl-sel" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS.map((m) => (<option key={m}>{m}</option>))}
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

      
      <div className="pl-chips">
        {ESTADOS_CHIPS.map((e) => (
          <Chip key={e} active={chips.has(e)} onClick={() => toggleChip(e)}>{e}</Chip>
        ))}
      </div>

      
      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Cliente</th><th>Prestador</th><th>Método</th><th>Estado</th>
              <th>Subtotal</th><th>Impuestos</th><th>Total</th><th>Moneda</th><th>Fecha</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="pl-empty" colSpan={11}>Cargando pagos…</td></tr>}
            {!loading && fetchErr && <tr><td className="pl-empty" colSpan={11}>{fetchErr}</td></tr>}
            {!loading && !fetchErr && pagos.map((p) => {
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
                      <div>{fecha}</div><small>{hora}</small>
                    </div>
                  </td>
                  <td>
                    {p.estado === "Pendiente" ? (
                      <button className="pl-btn pl-btn--pagar" onClick={() => navigate(`/pago/${p.id}`)}>Pagar</button>
                    ) : (
                      <button className="pl-btn pl-btn--ghost" onClick={() => navigate(`/detalle/${p.id}`)}>Ver</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && !fetchErr && pagos.length === 0 && (
              <tr><td className="pl-empty" colSpan={11}>No hay pagos para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
