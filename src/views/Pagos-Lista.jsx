import { useEffect, useMemo, useRef, useState } from "react";
import "./Pagos-Lista.css";

/** =========================================================
 * Config de API
 * ======================================================= */
const API_BASE = ""; // si tu front sirve detrás del mismo host, dejalo vacío. Ej: "" o "/"
const ENDPOINT = `${API_BASE}/api/payments`; // <- según tu PaymentController

/** =========================================================
 * Catálogos UI
 * ======================================================= */
const METODOS_UI = ["Todos los métodos", "Tarjeta crédito", "Tarjeta débito", "Billetera"];
const CHIPS_ESTADOS = [
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
const SORT_UI = ["Fecha ⬇", "Fecha ⬆", "Monto ⬇", "Monto ⬆"];

/** =========================================================
 * Utils
 * ======================================================= */
const money = (n, curr = "ARS", locale = "es-AR") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n ?? 0);

const fechaFmt = (iso, locale = "es-AR") => {
  if (!iso) return { fecha: "-", hora: "" };
  const d = new Date(iso);
  const fecha = d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  const hora = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
};

const keyClass = (str = "") =>
  str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Mapea la entidad Payment del backend a un objeto de UI */
function mapPayment(dto) {
  // Método puede venir embebido como entidad PaymentMethod; intentamos deducir etiqueta
  const metodoEntidad = dto.method || dto.paymentMethod || null;
  const metodoNombre =
    (metodoEntidad && (metodoEntidad.type || metodoEntidad.name || metodoEntidad.nombre)) ||
    dto.method_type ||
    dto.metodo ||
    null;

  // Normalizamos a etiquetas de UI (Crédito / Débito / Billetera)
  const metodoUI = (() => {
    const s = (metodoNombre || "").toString().toLowerCase();
    if (/(cred|credit)/.test(s)) return "Crédito";
    if (/(deb|debit)/.test(s)) return "Débito";
    if (/(wallet|bille)/.test(s)) return "Billetera";
    return "Crédito"; // fallback amigable
  })();

  const subtotal =
    dto.amount_subtotal ?? dto.subtotal ?? dto.amountSubtotal ?? dto.subTotal ?? 0;
  const taxes = dto.taxes ?? dto.tax ?? dto.impuestos ?? 0;
  const fees = dto.fees ?? 0;
  const total = dto.amount_total ?? dto.total ?? subtotal + taxes + fees;
  const currency = dto.currency ?? "ARS";
  const status = dto.status ?? "Pendiente";

  // created_at es LocalDateTime en back → llega como ISO o "yyyy-MM-ddTHH:mm:ss"
  const createdAt =
    dto.created_at ?? dto.createdAt ?? dto.fechaISO ?? dto.created ?? null;

  // Nombres (si luego sumás joins, podés reemplazar)
  const cliente = dto.user_name || `User ${dto.user_id ?? "-"}`;
  const prestador = dto.provider_name || `Provider ${dto.provider_id ?? "-"}`;

  return {
    id: dto.id,
    cliente,
    prestador,
    metodo: metodoUI,
    estado: status.charAt(0) + status.slice(1).toLowerCase(), // PENDING → Pending → "Pending" (luego lo mostramos como chip)
    subtotal,
    impuestos: taxes,
    total,
    moneda: currency,
    fechaISO: createdAt,
    raw: dto,
  };
}

function Badge({ kind, children }) {
  return <span className={`pl-badge pl-badge--${keyClass(kind)}`}>{children}</span>;
}
function Chip({ active, onClick, children }) {
  return (
    <button type="button" className={`pl-chip ${active ? "is-on" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

/** =========================================================
 * Vista principal
 * ======================================================= */
export default function PagosLista({ pageSize = 10, onVer }) {
  // Controles / filtros UI (cliente)
  const [rol, setRol] = useState("Cliente"); // "Cliente" | "Prestador"
  const [query, setQuery] = useState("");
  const [metodo, setMetodo] = useState(METODOS_UI[0]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState(SORT_UI[0]);
  const [chips, setChips] = useState(new Set());

  // Paginación (cliente)
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  // Data
  const [raw, setRaw] = useState([]); // lista cruda del backend
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const debounceRef = useRef();

  // Fetch simple a /api/payments (sin filtros del lado back por ahora)
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(ENDPOINT, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json)) {
          throw new Error("La API debe devolver una lista de pagos");
        }
        setRaw(json.map(mapPayment));
      } catch (e) {
        if (e.name !== "AbortError") setErr(e.message || "Error al cargar pagos");
      } finally {
        setLoading(false);
      }
    };
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, 0);

    return () => {
      controller.abort();
      clearTimeout(debounceRef.current);
    };
  }, []);

  /** Pipeline de filtrado/orden en CLIENTE (hasta que muevas al servidor) */
  const filtradosOrdenados = useMemo(() => {
    let arr = [...raw];

    // búsqueda por rol
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((p) =>
        (rol === "Cliente" ? p.cliente : p.prestador).toLowerCase().includes(q)
      );
    }

    // método
    if (metodo !== METODOS_UI[0]) {
      const map = { "Tarjeta crédito": "Crédito", "Tarjeta débito": "Débito", Billetera: "Billetera" };
      arr = arr.filter((p) => p.metodo === map[metodo]);
    }

    // fechas
    if (desde) arr = arr.filter((p) => new Date(p.fechaISO) >= new Date(desde + "T00:00:00"));
    if (hasta) arr = arr.filter((p) => new Date(p.fechaISO) <= new Date(hasta + "T23:59:59"));

    // chips por estado/método
    if (chips.size) {
      arr = arr.filter((p) => chips.has(p.estado) || chips.has(p.metodo));
    }

    // orden
    arr.sort((a, b) => {
      if (orden.startsWith("Fecha")) {
        return orden.endsWith("⬇")
          ? new Date(b.fechaISO) - new Date(a.fechaISO)
          : new Date(a.fechaISO) - new Date(b.fechaISO);
      }
      return orden.endsWith("⬇") ? b.total - a.total : a.total - b.total;
    });

    return arr;
  }, [raw, rol, query, metodo, desde, hasta, chips, orden]);

  /** Paginación en cliente */
  const total = filtradosOrdenados.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, size)));
  const pageClamped = Math.min(Math.max(page, 1), totalPages);
  const start = (pageClamped - 1) * size;
  const items = filtradosOrdenados.slice(start, start + size);

  const toggleChip = (name) => {
    const next = new Set(chips);
    next.has(name) ? next.delete(name) : next.add(name);
    setChips(next);
    setPage(1);
  };

  const clearFilters = () => {
    setRol("Cliente");
    setQuery("");
    setMetodo(METODOS_UI[0]);
    setDesde("");
    setHasta("");
    setOrden(SORT_UI[0]);
    setChips(new Set());
    setPage(1);
    setSize(pageSize);
  };

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
    const rows = filtradosOrdenados.map((p) => {
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
      <p className="pl-sub">
        Lista con filtros de rol, método, estado, rango de fechas y orden por fecha/monto (RF-03).
      </p>

      {/* Filtros */}
      <section className="pl-filters">
        <div className="pl-field">
          <label>Buscar por {rol.toLowerCase()}</label>
          <div className="pl-inline">
            <select className="pl-sel" value={rol} onChange={(e) => { setRol(e.target.value); setPage(1); }}>
              <option>Cliente</option>
              <option>Prestador</option>
            </select>
            <input
              className="pl-input"
              placeholder={`Buscar por ${rol.toLowerCase()}...`}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="pl-field">
          <label>Método</label>
          <select className="pl-sel" value={metodo} onChange={(e) => { setMetodo(e.target.value); setPage(1); }}>
            {METODOS_UI.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="pl-field">
          <label>Desde</label>
          <input type="date" className="pl-input" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} />
        </div>

        <div className="pl-field">
          <label>Hasta</label>
          <input type="date" className="pl-input" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} />
        </div>

        <div className="pl-field">
          <label>Orden</label>
          <select className="pl-sel" value={orden} onChange={(e) => { setOrden(e.target.value); setPage(1); }}>
            {SORT_UI.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="pl-field pl-right">
          <label>&nbsp;</label>
          <div className="pl-actions">
            <button className="pl-btn" onClick={exportCSV} disabled={loading || !filtradosOrdenados.length}>
              Exportar CSV
            </button>
            <button className="pl-btn pl-btn--ghost" onClick={clearFilters} disabled={loading}>
              Limpiar
            </button>
          </div>
        </div>
      </section>

      {/* Chips */}
      <div className="pl-chips">
        {CHIPS_ESTADOS.map((e) => (
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
            {loading && (
              <tr>
                <td colSpan={11} className="pl-empty"><span className="pl-spinner" /> Cargando pagos...</td>
              </tr>
            )}
            {!loading && err && (
              <tr>
                <td colSpan={11} className="pl-empty pl-error">{err}</td>
              </tr>
            )}
            {!loading && !err && items.map((p) => {
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
                      onClick={() => (onVer ? onVer(p) : alert(`Ver #${p.id}`))}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && !err && !items.length && (
              <tr>
                <td className="pl-empty" colSpan={11}>No hay resultados con los filtros aplicados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Paginación (cliente) */}
      <div className="pl-pag">
        <div className="pl-pag-left">
          <button className="pl-btn" disabled={pageClamped <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <button className="pl-btn" disabled={pageClamped >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</button>
          <span className="pl-pag-info">
            Página {pageClamped} de {totalPages} • {total} resultados
          </span>
        </div>
        <div className="pl-pag-right">
          <label className="pl-size-label">Filas</label>
          <select
            className="pl-sel"
            value={size}
            onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}
            disabled={loading}
          >
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
