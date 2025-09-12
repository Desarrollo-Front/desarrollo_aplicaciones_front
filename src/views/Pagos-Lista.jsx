import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const METODOS = ['Todos los métodos', 'Tarjeta crédito', 'Tarjeta débito', 'Mercado Pago'];
const ESTADOS_CHIPS = [
  'Pendiente',
  'Aprobado',
  'Rechazado'
];

const money = (n, curr = 'ARS', locale = 'es-AR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: curr }).format(n);

const fechaFmt = (iso, locale = 'es-AR') => {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const hora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
};

function Badge({ kind, children }) {
  const colorMap = {
    'Aprobado': 'bg-green-50 text-green-600 border border-green-200',
    'Pendiente': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    'Rechazado': 'bg-gray-100 text-gray-700 border border-gray-300',
    'Mercado Pago': 'bg-blue-50 text-blue-700 border border-blue-200',
    'Crédito': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    'Débito': 'bg-purple-50 text-purple-700 border border-purple-200',
    'Expirado': 'bg-red-50 text-red-700 border border-red-200',
    'Reembolsado': 'bg-teal-50 text-teal-700 border border-teal-200',
    'Disputa': 'bg-orange-50 text-orange-700 border border-orange-200',
    'Pendiente de Pago': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    'Pendiente de Aprobación': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorMap[kind] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>{children}</span>;
}
function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`px-4 py-1 rounded-full border text-sm font-medium mr-2 mb-2 shadow-sm transition-colors duration-200 ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-700'}`}
      onClick={onClick}
    >
      {children}
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
          if (p.estado === 'Pendiente' || p.estado === 'Pendiente de Pago' || p.estado === 'Pendiente de Aprobación') return true;
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
    <div className="min-h-screen bg-white py-8 px-2 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-md px-6 py-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-blue-600 text-2xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2" /></svg>
              Pagos
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Hola, {userName}</span>
            <button className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow px-6 py-4 mb-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Buscar por {searchBy.toLowerCase()}</label>
            <input
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Buscar por ${searchBy.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Método</label>
            <select className="border border-gray-300 rounded-md px-3 py-2" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              {METODOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              className="border border-gray-300 rounded-md px-3 py-2"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              className="border border-gray-300 rounded-md px-3 py-2"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Orden</label>
            <select className="border border-gray-300 rounded-md px-3 py-2" value={orden} onChange={(e) => setOrden(e.target.value)}>
              <option>Fecha ⬇</option>
              <option>Fecha ⬆</option>
              <option>Monto ⬇</option>
              <option>Monto ⬆</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">&nbsp;</label>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition" onClick={exportCSV}>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Chips de estado */}
        <div className="mb-4 flex flex-wrap gap-2">
          {ESTADOS_CHIPS.map((e) => (
            <Chip key={e} active={chips.has(e)} onClick={() => toggleChip(e)}>
              {e}
            </Chip>
          ))}
        </div>

        {/* Tabla de pagos */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
                {authRole !== 'USER' && <th className="px-3 py-2 text-left font-semibold text-gray-700">Cliente</th>}
                {authRole !== 'MERCHANT' && <th className="px-3 py-2 text-left font-semibold text-gray-700">Prestador</th>}
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Método</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Subtotal</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Impuestos</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Total</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Moneda</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Fecha</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-400" colSpan={11}>
                    Cargando pagos…
                  </td>
                </tr>
              )}
              {!loading && fetchErr && (
                <tr>
                  <td className="px-3 py-4 text-center text-red-500" colSpan={11}>
                    {fetchErr}
                  </td>
                </tr>
              )}
              {!loading &&
                !fetchErr &&
                pagos.map((p, idx) => {
                  const { fecha, hora } = fechaFmt(p.fechaISO);
                  return (
                    <tr key={p.id} className={idx % 2 === 1 ? 'bg-blue-50' : ''}>
                      <td className="px-3 py-2">#{p.id}</td>
                      {authRole !== 'USER' && <td className="px-3 py-2">{p.cliente}</td>}
                      {authRole !== 'MERCHANT' && <td className="px-3 py-2">{p.prestador}</td>}
                      <td className="px-3 py-2"><Badge kind={p.metodo}>{p.metodo}</Badge></td>
                      <td className="px-3 py-2"><Badge kind={p.estado}>{p.estado}</Badge></td>
                      <td className="px-3 py-2">{money(p.subtotal, p.moneda)}</td>
                      <td className="px-3 py-2">{money(p.impuestos, p.moneda)}</td>
                      <td className="px-3 py-2 font-bold">{money(p.total, p.moneda)}</td>
                      <td className="px-3 py-2">{p.moneda}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span>{fecha}</span>
                          <span className="text-xs text-gray-400">{hora}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {p.estado === 'Pendiente de Pago' && authRole !== 'MERCHANT' ? (
                          <button
                            className="bg-green-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-green-600 transition"
                            onClick={() => navigate(`/pago/${p.id}`)}
                          >
                            Pagar
                          </button>
                        ) : (
                          <button
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg font-semibold border border-gray-300 hover:bg-blue-50 hover:text-blue-700 transition"
                            onClick={() => navigate(`/detalle/${p.id}`)}
                          >
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {!loading && !fetchErr && pagos.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-400" colSpan={11}>
                    No hay pagos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
