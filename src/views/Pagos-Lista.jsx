import { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pagos-Lista.css';
import Select from "react-select";


const METODOS = ['Todos los métodos', 'Tarjeta crédito', 'Tarjeta débito', 'Mercado Pago'];
const ESTADOS_CHIPS = ['Pendiente', 'Aprobado', 'Rechazado'];

const money = (n, curr = 'ARS', locale = 'es-AR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: curr }).format(n);

const fechaFmt = (iso, locale = 'es-AR') => {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const hora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
};

function Badge({ kind, children }) {
  let key = (kind || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-');

  const iconByKey = {
    aprobado: 'ri-check-line',
    pendiente: 'ri-time-line',
    'pendiente-de-pago': 'ri-wallet-2-line',
    'pendiente-de-aprobacion': 'ri-shield-check-line',
    rechazado: 'ri-close-circle-line',
    expirado: 'ri-timer-off-line',
    reembolsado: 'ri-refund-2-line',
    disputa: 'ri-scales-2-line',
    credito: 'ri-bank-card-2-line',
    debito: 'ri-bank-card-line',
    'mercado-pago': 'ri-shopping-bag-4-line',
    billetera: 'ri-wallet-3-line',
  };

  const icon = iconByKey[key] || 'ri-information-line';
  return (
    <span className={`pl-badge pl-badge--${key}`}>
      <i className={`${icon} pl-badge__ico`} aria-hidden="true" />
      {children}
    </span>
  );
}

function Chip({ active, onClick, children, icon }) {
  return (
    <button type="button" className={`pl-chip ${active ? 'is-on' : ''}`} onClick={onClick}>
      {icon && <i className={`${icon}`} aria-hidden="true" />} {children}
    </button>
  );
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

export default function PagosLista() {
  const navigate = useNavigate();

  const [serverData, setServerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState('');

  const authRole = (
    JSON.parse(localStorage.getItem('auth') || '{}').role ||
    localStorage.getItem('role') ||
    'USER'
  ).toUpperCase();

  const searchBy =
    authRole === 'MERCHANT' ? 'Cliente' : authRole === 'USER' ? 'Prestador' : 'Cliente';

  const [query, setQuery] = useState('');
  const [metodo, setMetodo] = useState(METODOS[0]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [orden, setOrden] = useState('Fecha ⬇');
  const [chips, setChips] = useState(new Set());

  const userName =
    JSON.parse(localStorage.getItem('auth') || '{}').name ||
    localStorage.getItem('name') ||
    'Usuario';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const toggleChip = (name) => {
    const next = new Set(chips);
    next.has(name) ? next.delete(name) : next.add(name);
    setChips(next);
  };

  const resetFiltros = () => {
    setQuery('');
    setMetodo(METODOS[0]);
    setDesde('');
    setHasta('');
    setOrden('Fecha ⬇');
    setChips(new Set());
  };

  // === altura dinámica del masthead ===
  const mastRef = useRef(null);
  useLayoutEffect(() => {
    const el = mastRef.current;
    if (!el) return;
    const setH = () =>
      document.documentElement.style.setProperty('--masthead-h', `${el.offsetHeight}px`);
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    setH();
    const onResize = () => setH();
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setFetchErr('');
      try {
        const authHeader =
          localStorage.getItem('authHeader') ||
          `${localStorage.getItem('tokenType') || 'Bearer'} ${localStorage.getItem('token') || ''}`;

        const res = await fetch('http://18.191.118.13:8080/api/payments/my-payments', {
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error('No autorizado. Iniciá sesión nuevamente.');
          throw new Error('No se pudieron obtener los pagos.');
        }

        const list = await res.json();
        const mapped = (Array.isArray(list) ? list : []).map((p) => ({
          id: p.id,
          cliente: `ID: ${p.user_id ?? '-'}`,
          prestador: p.provider_id ? `ID: ${p.provider_id}` : '-',
          metodo: getMetodoTag(p.method),
          estado: mapStatus(p.status),
          subtotal: Number(p.amount_subtotal ?? 0),
          impuestos: Number((p.taxes ?? 0) + (p.fees ?? 0)),
          total: Number(p.amount_total ?? 0),
          moneda: String(p.currency || 'ARS').toUpperCase(),
          fechaISO: p.created_at,
        }));
        setServerData(mapped);
      } catch (e) {
        setFetchErr(e.message || 'Error inesperado obteniendo pagos.');
        setServerData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.style.position = "absolute";
    sentinel.style.top = "0px";
    sentinel.style.height = "1px";
    document.body.prepend(sentinel);

    const mast = document.querySelector(".pl-masthead");

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          mast?.classList.remove("is-stuck");
        } else {
          mast?.classList.add("is-stuck");
        }
      },
      { threshold: [1] }
    );

    io.observe(sentinel);

    return () => {
      io.disconnect();
      sentinel.remove();
    };
  }, []);


  const pagos = useMemo(() => {
    let arr = [...serverData];

    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((p) =>
        (searchBy === 'Cliente' ? p.cliente : p.prestador).toLowerCase().includes(q)
      );
    }

    if (metodo !== METODOS[0]) {
      const map = {
        'Tarjeta crédito': 'Crédito',
        'Tarjeta débito': 'Débito',
        'Mercado Pago': 'Mercado Pago',
      };
      arr = arr.filter((p) => p.metodo === map[metodo]);
    }

    if (desde) arr = arr.filter((p) => new Date(p.fechaISO) >= new Date(desde + 'T00:00:00'));
    if (hasta) arr = arr.filter((p) => new Date(p.fechaISO) <= new Date(hasta + 'T23:59:59'));

    if (chips.size) {
      arr = arr.filter((p) => {
        if (chips.has('Pendiente')) {
          if (
            p.estado === 'Pendiente' ||
            p.estado === 'Pendiente de Pago' ||
            p.estado === 'Pendiente de Aprobación'
          )
            return true;
        }
        return chips.has(p.estado) || chips.has(p.metodo);
      });
    }

    arr.sort((a, b) => {
      if (orden.startsWith('Fecha')) {
        return orden.endsWith('⬇')
          ? new Date(b.fechaISO) - new Date(a.fechaISO)
          : new Date(a.fechaISO) - new Date(b.fechaISO);
      }
      return orden.endsWith('⬇') ? b.total - a.total : a.total - b.total;
    });

    return arr;
  }, [serverData, query, metodo, desde, hasta, chips, orden, searchBy]);

  const exportCSV = () => {
    const headers = [
      'ID',
      'Cliente',
      'Prestador',
      'Método',
      'Estado',
      'Subtotal',
      'Impuestos',
      'Total',
      'Moneda',
      'Fecha',
      'Hora',
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
      headers.join(',') +
      '\n' +
      rows
        .map((r) =>
          r
            .map((v) => {
              const s = String(v ?? '');
              return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(',')
        )
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

return (
  <div className="pl-wrap">
    {/* Sticky: topbar + filtros + chips */}
    <div className="pl-masthead" ref={mastRef}>
      <div className="pl-topbar">
        <div className="pl-topbar__brand">
          <i className="ri-secure-payment-line" aria-hidden="true" />
          <span>Pagos</span>
        </div>
        <div className="pl-topbar__right">
          <span className="pl-user">
            <i className="ri-user-3-line" aria-hidden="true" /> Hola, {userName}
          </span>
          <button className="pl-btn pl-btn--logout" onClick={handleLogout}>
            <i className="ri-logout-circle-r-line" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </div>

      <section className="pl-filters">
        <div className="pl-field">
          <label>Buscar por {searchBy.toLowerCase()}</label>
          <div className="pl-inline">
            <i className="ri-search-line pl-input__ico" />
            <input
              className="pl-input pl-input--with-ico"
              placeholder={`Buscar por ${searchBy.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="pl-field">
          <label>Método</label>
          <Select
            options={METODOS.map((m) => ({ value: m, label: m }))}
            value={{ value: metodo, label: metodo }}
            onChange={(opt) => setMetodo(opt.value)}
            classNamePrefix="pl-sel"
            theme={(theme) => ({
              ...theme,
              borderRadius: 8,
              colors: {
                ...theme.colors,
                primary25: "#f0f4ff", // hover
                primary: "#2563eb",   // seleccionado
                neutral0: "#ffffff",  // fondo
                neutral80: "#111111", // texto
                neutral20: "#e6eaf0", // borde
              },
            })}
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "8px",
                borderColor: "#e6eaf0",
                minHeight: "36px",
                fontSize: "14px",
                boxShadow: "none",
                "&:hover": { borderColor: "#2563eb" },
              }),
              menu: (base) => ({
                ...base,
                borderRadius: "8px",
                marginTop: 4,
                fontSize: "14px",
                zIndex: 9999,
              }),
              option: (base, { isFocused, isSelected }) => ({
                ...base,
                backgroundColor: isSelected
                  ? "#2563eb"
                  : isFocused
                  ? "#f0f4ff"
                  : "#fff",
                color: isSelected ? "#fff" : "#111",
                cursor: "pointer",
                fontSize: "14px",
              }),
            }}
          />
        </div>


        <div className="pl-field">
          <label>Desde</label>
          <input
            type="date"
            className="pl-input"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>

        <div className="pl-field">
          <label>Hasta</label>
          <input
            type="date"
            className="pl-input"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>

        <div className="pl-field">
          <label>Orden</label>
          <Select
            options={[
              { value: "Fecha ⬇", label: "Fecha ⬇" },
              { value: "Fecha ⬆", label: "Fecha ⬆" },
              { value: "Monto ⬇", label: "Monto ⬇" },
              { value: "Monto ⬆", label: "Monto ⬆" },
            ]}
            value={{ value: orden, label: orden }}
            onChange={(opt) => setOrden(opt.value)}
            classNamePrefix="pl-sel"
          />
        </div>

        <div className="pl-field">
          <label>&nbsp;</label>
          <button className="pl-btn--reset" onClick={resetFiltros}>
            <i className="ri-restart-line" /> Reset
          </button>
        </div>
      </section>

      <div className="pl-chips">
        <Chip
          icon="ri-time-line"
          key="Pendiente"
          active={chips.has('Pendiente')}
          onClick={() => toggleChip('Pendiente')}
        >
          Pendiente
        </Chip>
        <Chip
          icon="ri-check-line"
          key="Aprobado"
          active={chips.has('Aprobado')}
          onClick={() => toggleChip('Aprobado')}
        >
          Aprobado
        </Chip>
        <Chip
          icon="ri-close-circle-line"
          key="Rechazado"
          active={chips.has('Rechazado')}
          onClick={() => toggleChip('Rechazado')}
        >
          Rechazado
        </Chip>

        {/* Exportar CSV a la derecha */}
        <span className="pl-export" onClick={exportCSV}>
          <i className="ri-download-2-line" /> Exportar CSV
        </span>
      </div>
    </div>

    <section className="pl-card">
      <table className="pl-tbl">
        <thead>
          <tr>
            <th>ID</th>
            {authRole !== 'USER' && <th>Cliente</th>}
            {authRole !== 'MERCHANT' && <th>Prestador</th>}
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
          {!loading &&
            !fetchErr &&
            pagos.map((p) => {
              const { fecha, hora } = fechaFmt(p.fechaISO);
              return (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  {authRole !== 'USER' && <td>{p.cliente}</td>}
                  {authRole !== 'MERCHANT' && <td>{p.prestador}</td>}
                  <td>
                    <Badge kind={p.metodo}>{p.metodo}</Badge>
                  </td>
                  <td>
                    <Badge kind={p.estado}>{p.estado}</Badge>
                  </td>
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
                    {p.estado === 'Pendiente de Pago' && authRole !== 'MERCHANT' ? (
                      <button
                        className="pl-btn pl-btn--pagar"
                        onClick={() => navigate(`/pago/${p.id}`)}
                      >
                        <i className="ri-wallet-2-line" /> Pagar
                      </button>
                    ) : (
                      <button
                        className="pl-btn pl-btn--ghost"
                        onClick={() => navigate(`/detalle/${p.id}`)}
                      >
                        <i className="ri-eye-line" /> Ver
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          {!loading && !fetchErr && pagos.length === 0 && (
            <tr>
              <td className="pl-empty" colSpan={11}>
                <i className="ri-folder-2-line" /> No hay pagos para mostrar.
              </td>
            </tr>
          )}
          {loading && (
            <tr>
              <td className="pl-empty" colSpan={11}>
                Cargando pagos…
              </td>
            </tr>
          )}
          {!loading && fetchErr && (
            <tr>
              <td className="pl-empty" colSpan={11}>
                {fetchErr}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  </div>
);
}
