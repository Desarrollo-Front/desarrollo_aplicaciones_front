import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pagos-Lista.css';
import Select from 'react-select';
import FacturaPreview from './FacturaPreview'; // Tu componente de previsualización

const METODOS = ['Todos los métodos', 'Tarjeta crédito', 'Tarjeta débito', 'Mercado Pago'];
const ESTADOS_CHIPS = ['Pendiente', 'Aprobado', 'Rechazado'];

const money = (n, curr = 'ARS', locale = 'es-AR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: curr }).format(Number(n || 0));

const fechaFmt = (iso, locale = 'es-AR') => {
  if (!iso) return { fecha: '—', hora: '' };
  const d = new Date(iso);
  const fecha = d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const hora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
};

const fechaHoraUI = (iso, locale = 'es-AR') => {
  if (!iso) return '—';
  const d = new Date(iso);
  const f = d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const h = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${f} ${h}`;
};

/**
 * Genera el HTML de la factura a partir de los datos detallados de un pago.
 * @param {object} pago - El objeto con los detalles del pago.
 * @returns {string} - El string HTML de la factura.
 */
const generarHtmlFactura = (pago) => {
  const emisor = pago.prestador || 'N/A';
  const cliente = pago.cliente || 'Consumidor Final';
  const metodo = pago.metodo || '—';
  const descripcion = pago.descripcion || 'Cargo por servicio';
  const categoria = pago.categoria || 'General';
  const fechaEmision = fechaHoraUI(pago.creadoISO);
  const fechaCobro = fechaHoraUI(pago.capturadoISO);

  // Desglose de ítems (modificado para mostrar solo la línea principal)
  const items = [
    {
      descripcion: descripcion,
      cantidad: 1,
      precioUnitario: pago.subtotal,
    },
  ];

  const itemRows = items.map(item => `
    <tr>
      <td>${item.cantidad}</td>
      <td>${item.descripcion}</td>
      <td class="text-right">${money(item.precioUnitario, pago.moneda)}</td>
      <td class="text-right">${money(item.precioUnitario * item.cantidad, pago.moneda)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura de Pago #${pago.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 2rem; background-color: #f8fafc; color: #1e293b; }
    .invoice-container { max-width: 800px; margin: auto; background: white; border-radius: 12px; padding: 2.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 1.5rem; border-bottom: 3px solid #3b82f6; }
    .header .title { font-size: 2.5rem; font-weight: 800; color: #1e293b; margin: 0; }
    .header .subtitle { font-size: 1rem; color: #64748b; margin: 0; }
    .header .invoice-info { text-align: right; }
    .header .invoice-info strong { font-size: 1.25rem; color: #3b82f6; }
    .party-details { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0; }
    .party-details h3 { font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
    .party-details p { margin: 0.25rem 0; font-size: 1rem; }
    .payment-details { background-color: #f1f5f9; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }
    .payment-details h2 { font-size: 1.25rem; margin-top: 0; margin-bottom: 1rem; color: #1e293b; }
    .payment-details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .payment-details-grid div { font-size: 0.875rem; }
    .payment-details-grid strong { color: #334155; display: block; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background-color: #f8fafc; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 100%; max-width: 300px; }
    .totals-table td { border: none; padding: 0.5rem 0; }
    .totals-table .label { color: #64748b; }
    .totals-table .total-row td { font-size: 1.25rem; font-weight: 700; padding-top: 1rem; border-top: 2px solid #3b82f6; }
    .footer { text-align: center; margin-top: 2rem; font-size: 0.875rem; color: #64748b; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <header class="header">
      <div>
        <h1 class="title">Factura</h1>
        <p class="subtitle">Comprobante de pago no fiscal</p>
      </div>
      <div class="invoice-info">
        <p>ID de Pago</p>
        <strong>#${pago.id}</strong>
      </div>
    </header>
    <section class="party-details">
      <div>
        <h3>PRESTADOR</h3>
        <p><strong>${emisor}</strong></p>
      </div>
      <div>
        <h3>USUARIO</h3>
        <p><strong>${cliente}</strong></p>
      </div>
    </section>
    <section class="payment-details">
        <h2>Detalles de la Transacción</h2>
        <div class="payment-details-grid">
            <div><strong>Fecha de Emisión:</strong> ${fechaEmision}</div>
            <div><strong>Fecha de Cobro:</strong> ${fechaCobro}</div>
            <div><strong>Método de Pago:</strong> ${metodo}</div>
            <div><strong>Categoría:</strong> ${categoria}</div>
        </div>
    </section>
    <table>
      <thead>
        <tr>
          <th>Cant.</th>
          <th>Descripción</th>
          <th class="text-right">P. Unitario</th>
          <th class="text-right">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    <section class="totals">
      <table class="totals-table">
        <tbody>
          <tr>
            <td class="label">Subtotal</td>
            <td class="text-right">${money(pago.subtotal, pago.moneda)}</td>
          </tr>
          <tr>
            <td class="label">Impuestos y Cargos</td>
            <td class="text-right">${money(pago.impuestos, pago.moneda)}</td>
          </tr>
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td class="text-right"><strong>${money(pago.total, pago.moneda)}</strong></td>
          </tr>
        </tbody>
      </table>
    </section>
    <footer class="footer">
      <p>Este es un comprobante de pago generado automáticamente. Para cualquier consulta, contacte a soporte.</p>
    </footer>
  </div>
</body>
</html>
  `;
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

function KebabMenu({ estado, onVerFactura, onVerPago, isLoading }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickAway = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  useEffect(() => {
    if (open && menuRef.current && ref.current) {
      setTimeout(() => {
        const menu = menuRef.current;
        const btn = ref.current.querySelector('.pl-kebab__btn');
        if (!menu || !btn) return;
        const btnRect = btn.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const spaceBelow = window.innerHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;
        const menuHeight = menuRect.height;
        if (spaceBelow >= menuHeight + 8) {
          setUp(false);
        } else if (spaceAbove >= menuHeight + 8) {
          setUp(true);
        } else {
          setUp(false);
        }
      }, 0);
    }
  }, [open]);

  return (
    <div className="pl-kebab" ref={ref}>
      <button
        className="pl-kebab__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isLoading}
      >
        <span className="pl-kebab__dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      {open && (
        <div
          className={`pl-kebab__menu${up ? ' is-up' : ''}`}
          role="menu"
          ref={menuRef}
        >
          {estado === "Aprobado" && (
            <button
              className="pl-kebab__item"
              onClick={() => {
                setOpen(false);
                onVerFactura();
              }}
              disabled={isLoading}
            >
              <i className="ri-file-text-line" aria-hidden="true" />
              {isLoading ? 'Cargando...' : 'Ver factura'}
            </button>
          )}
          <button
            className="pl-kebab__item"
            onClick={() => {
              setOpen(false);
              onVerPago();
            }}
          >
            <i className="ri-eye-line" aria-hidden="true" />
            Ver pago
          </button>
        </div>
      )}
    </div>
  );
}

function CustomSelect({ label, options, value, onChange }) {
  return (
    <div className="pl-field">
      <label>{label}</label>
      <Select
        options={options}
        value={value}
        onChange={onChange}
        classNamePrefix="pl-sel"
        styles={{
          control: (base, state) => ({
            ...base,
            width: '100%',
            height: '34px',
            minHeight: '34px',
            borderRadius: '12px',
            border: '1px solid var(--payment-border)',
            padding: '0',
            fontSize: '13px',
            color: 'var(--text)',
            backgroundColor: 'var(--panel)',
            boxSizing: 'border-box',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            '&:hover': {
              borderColor: 'var(--payment-border)',
            },
            ...(state.isFocused && {
              outline: 'none',
              borderColor: '#2563eb',
              boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)',
            }),
          }),
          valueContainer: (base) => ({
            ...base,
            height: '34px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
          }),
          singleValue: (base) => ({
            ...base,
            margin: 0,
            lineHeight: '1',
            transform: 'none',
            top: 'auto',
            position: 'static',
            color: 'var(--text)',
            fontSize: '13px',
          }),
          input: (base) => ({
            ...base,
            margin: 0,
            padding: 0,
            color: 'var(--text)',
            fontSize: '13px',
          }),
          placeholder: (base) => ({
            ...base,
            margin: 0,
            lineHeight: '1',
            transform: 'none',
            top: 'auto',
            position: 'static',
            color: '#999',
            fontSize: '13px',
          }),
          menu: (base) => ({
            ...base,
            borderRadius: '12px',
            marginTop: '4px',
            fontSize: '13px',
            zIndex: 9999,
            boxShadow: '0 4px 18px 0 rgba(0,0,0,0.10), 0 1.5px 4px 0 rgba(0,0,0,0.06)',
            border: '1px solid var(--payment-border)',
          }),
          option: (base, { isFocused, isSelected }) => ({
            ...base,
            backgroundColor: isSelected ? '#2563eb' : isFocused ? '#f0f4ff' : '#fff',
            color: isSelected ? '#fff' : 'var(--text)',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '8px 16px',
          }),
          indicatorSeparator: () => ({ display: 'none' }),
          dropdownIndicator: (base) => ({
            ...base,
            color: '#7b8794',
            paddingRight: '12px',
            '&:hover': {
              color: '#2563eb',
            },
          }),
        }}
      />
    </div>
  );
}

export default function PagosLista() {
  const navigate = useNavigate();
  const [serverData, setServerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [fetchErr, setFetchErr] = useState('');
  const [previewHTML, setPreviewHTML] = useState('');
  const authRole =
    (JSON.parse(localStorage.getItem('auth') || '{}').role ||
      localStorage.getItem('role') ||
      'USER').toUpperCase();
  const searchBy =
    authRole === 'MERCHANT' ? 'Cliente' : authRole === 'USER' ? 'Prestador' : 'Cliente';
  const [query, setQuery] = useState('');
  const [metodo, setMetodo] = useState({ value: METODOS[0], label: METODOS[0] });
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [orden, setOrden] = useState({ value: 'Fecha ⬇', label: 'Fecha ⬇' });
  const [chips, setChips] = useState(new Set());
  const userName =
    JSON.parse(localStorage.getItem('auth') || '{}').name ||
    localStorage.getItem('name') ||
    'Usuario';

  const mastRef = useRef(null);

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
    setMetodo({ value: METODOS[0], label: METODOS[0] });
    setDesde('');
    setHasta('');
    setOrden({ value: 'Fecha ⬇', label: 'Fecha ⬇' });
    setChips(new Set());
  };

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

        const res = await fetch('/api/payments/my-payments', {
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error('No autorizado. Iniciá sesión nuevamente.');
          throw new Error('No se pudieron obtener los pagos.');
        }

        const list = await res.json();
        const mapped = (Array.isArray(list) ? list : []).map((p) => ({
          id: p.id,
          cliente: p.user_name ?? '-',
          prestador: p.provider_name ?? '-',
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
    const sentinel = document.createElement('div');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '0px';
    sentinel.style.height = '1px';
    document.body.prepend(sentinel);

    const mast = document.querySelector('.pl-masthead');

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          mast?.classList.remove('is-stuck');
        } else {
          mast?.classList.add('is-stuck');
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

    if (metodo.value !== METODOS[0]) {
      const map = {
        'Tarjeta crédito': 'Crédito',
        'Tarjeta débito': 'Débito',
        'Mercado Pago': 'Mercado Pago',
      };
      arr = arr.filter((p) => p.metodo === map[metodo.value]);
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
        return chips.has(p.estado);
      });
    }

    arr.sort((a, b) => {
      if (orden.value.startsWith('Fecha')) {
        return orden.value.endsWith('⬇')
          ? new Date(b.fechaISO) - new Date(a.fechaISO)
          : new Date(a.fechaISO) - new Date(b.fechaISO);
      }
      return orden.value.endsWith('⬇') ? b.total - a.total : a.total - b.total;
    });

    return arr;
  }, [serverData, query, metodo, desde, hasta, chips, orden, searchBy]);

  const exportCSV = () => {
    const headers = [
      'ID', 'Cliente', 'Prestador', 'Método', 'Estado',
      'Subtotal', 'Impuestos', 'Total', 'Moneda', 'Fecha', 'Hora',
    ];
    const rows = pagos.map((p) => {
      const { fecha, hora } = fechaFmt(p.fechaISO);
      return [
        p.id, p.cliente, p.prestador, p.metodo, p.estado,
        p.subtotal, p.impuestos, p.total, p.moneda, fecha, hora,
      ];
    });
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onVerFacturaPreview = async (pagoDeLista) => {
    setLoadingDetail(true);
    try {
      const authHeader =
        localStorage.getItem('authHeader') ||
        `${localStorage.getItem('tokenType') || 'Bearer'} ${localStorage.getItem('token') || ''}`;
      
      const res = await fetch(`/api/payments/${pagoDeLista.id}`, {
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      });

      if (!res.ok) throw new Error('No se pudieron obtener los detalles para la factura.');

      const p = await res.json();
      const meta = p.metadata ? JSON.parse(p.metadata) : {};

      const pagoDetallado = {
        id: p.id,
        cliente: localStorage.getItem('name') || '—',
        prestador: p.provider_name || '—',
        metodo: getMetodoTag(p.method),
        subtotal: Number(p.amount_subtotal ?? 0),
        impuestos: Number((p.taxes ?? 0) + (p.fees ?? 0)),
        total: Number(p.amount_total ?? 0),
        moneda: String(p.currency || 'ARS').toUpperCase(),
        creadoISO: p.created_at || p.createdAt || null,
        capturadoISO: p.captured_at || p.capturedAt || null,
        descripcion: meta.description || 'Cargo por servicio',
        categoria: meta.category || 'General',
      };

      const html = generarHtmlFactura(pagoDetallado);
      setPreviewHTML(html);

    } catch (error) {
      console.error("Error al generar factura:", error);
      alert(error.message || 'Ocurrió un error al generar la factura.');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="pl-wrap">
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
            <div className="pl-input-wrapper">
              <i className="ri-search-line pl-input__ico" />
              <input
                className="pl-input pl-input--with-ico"
                placeholder={`Buscar por ${searchBy.toLowerCase()}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <CustomSelect
            label="Método"
            options={METODOS.map((m) => ({ value: m, label: m }))}
            value={metodo}
            onChange={(opt) => setMetodo(opt)}
          />

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

          <CustomSelect
            label="Orden"
            options={[
              { value: 'Fecha ⬇', label: 'Fecha ⬇' },
              { value: 'Fecha ⬆', label: 'Fecha ⬆' },
              { value: 'Monto ⬇', label: 'Monto ⬇' },
              { value: 'Monto ⬆', label: 'Monto ⬆' },
            ]}
            value={orden}
            onChange={(opt) => setOrden(opt)}
          />
          
          <div className="pl-field">
            <label>&nbsp;</label>
            <button className="pl-btn--reset" onClick={resetFiltros}>
              <i className="ri-restart-line" /> Reset
            </button>
          </div>
        </section>

        <div className="pl-chips">
          {ESTADOS_CHIPS.map(chipName => (
            <Chip
              key={chipName}
              active={chips.has(chipName)}
              onClick={() => toggleChip(chipName)}
            >
              {chipName}
            </Chip>
          ))}
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
            {!loading && !fetchErr && pagos.map((p) => {
              const { fecha, hora } = fechaFmt(p.fechaISO);
              return (
                <tr key={p.id}>
                  <td className="pl-td--center">#{p.id}</td>
                  {authRole !== 'USER' && <td className="pl-td--center">{p.cliente}</td>}
                  {authRole !== 'MERCHANT' && <td className="pl-td--center">{p.prestador}</td>}
                  <td className="pl-td--center"><Badge kind={p.metodo}>{p.metodo}</Badge></td>
                  <td className="pl-td--center"><Badge kind={p.estado}>{p.estado}</Badge></td>
                  <td>{money(p.subtotal, p.moneda)}</td>
                  <td>{money(p.impuestos, p.moneda)}</td>
                  <td className="pl-bold">{money(p.total, p.moneda)}</td>
                  <td className="pl-td--center">{p.moneda}</td>
                  <td className="pl-td--center">
                    <div>{fecha}</div>
                    <small>{hora}</small>
                  </td>
                  <td className="pl-td--center">
                    {p.estado === 'Pendiente de Pago' && authRole !== 'MERCHANT' ? (
                      <button className="pl-btn pl-btn--pagar" onClick={() => navigate(`/pago/${p.id}`)}>
                        <i className="ri-wallet-2-line" /> Pagar
                      </button>
                    ) : (
                      <KebabMenu
                        estado={p.estado}
                        onVerFactura={() => onVerFacturaPreview(p)}
                        onVerPago={() => navigate(`/detalle/${p.id}`)}
                        isLoading={loadingDetail}
                      />
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
                <td className="pl-empty" colSpan={11}>Cargando pagos…</td>
              </tr>
            )}
            {!loading && fetchErr && (
              <tr>
                <td className="pl-empty" colSpan={11}>{fetchErr}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {previewHTML && (
        <FacturaPreview
          html={previewHTML}
          onClose={() => setPreviewHTML('')}
        />
      )}
    </div>
  );
}