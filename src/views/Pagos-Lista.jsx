import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pagos-Lista.css';

// --- Helpers (sin cambios) ---
const money = (n, curr = 'ARS', locale = 'es-AR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: curr }).format(Number(n || 0));

const fechaHora = (iso, locale = 'es-AR') => {
  if (!iso) return '—';
  const d = new Date(iso);
  const f = d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const h = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${f} ${h}`;
};

const mapStatus = (s) => {
  const t = String(s || '').toUpperCase();
  if (t === 'PENDING' || t === 'PENDING_PAYMENT') return 'Pendiente';
  if (t === 'PENDING_APPROVAL') return 'Aprobación';
  if (t === 'APPROVED' || t === 'CAPTURED' || t === 'COMPLETED') return 'Aprobado';
  if (t === 'REJECTED' || t === 'FAILED') return 'Rechazado';
  if (t === 'EXPIRED') return 'Expirado';
  if (t === 'REFUNDED') return 'Reembolsado';
  if (t === 'DISPUTE' || t === 'DISPUTED') return 'Disputa';
  return 'Desconocido';
};

// --- Componentes de UI Pequeños (sin cambios) ---
function StatusBadge({ status }) {
  const statusKey = (status || 'desconocido').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '-');
  return (
    <div className={`pl-status-badge pl-status-badge--${statusKey}`}>
      <span className="pl-status-badge-dot"></span>
      {status}
    </div>
  );
}

function CustomerAvatar({ name }) {
    const initial = String(name || '?').charAt(0).toUpperCase();
    return (
        <div className="pl-customer-cell">
            <div className="pl-customer-avatar" title={name}>{initial}</div>
            <span className="pl-customer-name">{name}</span>
        </div>
    );
}

// --- Componente Principal ---
export default function PagosLista() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    const fetchPagos = async () => {
      try {
        setLoading(true);
        setError('');
        const authHeader = `${localStorage.getItem('tokenType') || 'Bearer'} ${localStorage.getItem('token') || ''}`;
        const res = await fetch('/api/payments', { headers: { 'Content-Type': 'application/json', Authorization: authHeader } });
        if (!res.ok) {
          if (res.status === 401) throw new Error('No autorizado. Por favor, iniciá sesión de nuevo.');
          throw new Error('No se pudieron obtener los pagos.');
        }
        const data = await res.json();
        const pagosNormalizados = (Array.isArray(data) ? data : []).map(p => ({
          id: p.id,
          cliente: localStorage.getItem('name') || `Usuario #${p.user_id}`,
          monto: p.amount_total,
          moneda: p.currency || 'ARS',
          estado: mapStatus(p.status),
          fecha: p.created_at || p.createdAt,
          rawStatus: String(p.status || '').toUpperCase(),
        }));
        pagosNormalizados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setPagos(pagosNormalizados);
      } catch (e) {
        setError(e.message || 'Ocurrió un error inesperado.');
        setPagos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPagos();
  }, []);

  const filteredPagos = useMemo(() => {
    if (filter === 'todos') return pagos;
    const statusMap = {
      aprobados: ['APPROVED', 'CAPTURED', 'COMPLETED'],
      pendientes: ['PENDING', 'PENDING_PAYMENT', 'PENDING_APPROVAL'],
      rechazados: ['REJECTED', 'FAILED'],
    };
    return pagos.filter(p => statusMap[filter]?.includes(p.rawStatus));
  }, [pagos, filter]);

  const statusCounts = useMemo(() => {
    return pagos.reduce((acc, p) => {
      const statusKey = p.estado.toLowerCase();
      if (statusKey === 'aprobado') acc.aprobados++;
      else if (statusKey === 'pendiente' || statusKey === 'aprobación') acc.pendientes++;
      else if (statusKey === 'rechazado') acc.rechazados++;
      acc.todos++;
      return acc;
    }, { todos: 0, aprobados: 0, pendientes: 0, rechazados: 0 });
  }, [pagos]);
  
  const FilterButton = ({ status, label, count }) => (
    <button className={`pl-filter-btn ${filter === status ? 'pl-filter-btn--active' : ''}`} onClick={() => setFilter(status)}>
      {label}
      <span className="pl-filter-count">{count}</span>
    </button>
  );

  return (
    <div className="pl-container">
      <header className="pl-header">
        <div className="pl-title-section">
          <div className="pl-title-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <div>
            <h1 className="pl-title">Mis Pagos</h1>
            <p className="pl-subtitle">Historial de todas tus transacciones</p>
          </div>
        </div>
        <div className="pl-header-actions"><button className="pl-action-btn" onClick={() => navigate('/pago/nuevo')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Crear Pago</button></div>
      </header>

      <main className="pl-main-card">
        <div className="pl-filters">
          <FilterButton status="todos" label="Todos" count={statusCounts.todos} />
          <FilterButton status="aprobados" label="Aprobados" count={statusCounts.aprobados} />
          <FilterButton status="pendientes" label="Pendientes" count={statusCounts.pendientes} />
          <FilterButton status="rechazados" label="Rechazados" count={statusCounts.rechazados} />
        </div>
        
        <div className="pl-table-wrapper">
          {loading ? ( <div className="pl-state-view">Cargando pagos...</div>
          ) : error ? ( <div className="pl-state-view pl-state-view--error">{error}</div>
          ) : filteredPagos.length === 0 ? ( <div className="pl-state-view">No hay pagos que coincidan con el filtro.</div>
          ) : (
            <table className="pl-table">
              <thead><tr><th>ID de Pago</th><th>Cliente</th><th>Monto</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
              <tbody>
                {filteredPagos.map((p) => (
                  <tr key={p.id}>
                    {/* CAMBIO CLAVE: Agregamos data-label para la vista móvil */}
                    <td data-label="ID de Pago"><span className="pl-id-cell">#{p.id}</span></td>
                    <td data-label="Cliente"><CustomerAvatar name={p.cliente} /></td>
                    <td data-label="Monto"><span className="pl-amount-cell">{money(p.monto, p.moneda)}</span></td>
                    <td data-label="Estado"><StatusBadge status={p.estado} /></td>
                    <td data-label="Fecha"><span className="pl-date-cell">{fechaHora(p.fecha)}</span></td>
                    <td data-label="Acciones">
                      <button className="pl-details-btn" onClick={() => navigate(`/pagos/${p.id}`)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}