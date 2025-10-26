import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  money,
  fechaHora,
  mapStatus,
  getMetodoTag,
  mapEventType,
  eventCategory,
  highlightPairs,
  translatePayloadDeep,
  buildComprobanteHTML,
  descargarComprobante,
} from '../views/Pagos-Detalle';

describe('Pagos-Detalle helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('money formats numbers and defaults', () => {
    expect(typeof money(1234.5)).toBe('string');
    expect(money(0)).toContain('0');
  });

  it('fechaHora returns dash for falsy and formats date', () => {
    expect(fechaHora(null)).toBe('—');
    const out = fechaHora('2022-01-02T15:30:00Z');
    expect(out).toMatch(/2022/);
    expect(out).toMatch(/:/);
  });

  it('mapStatus handles known and unknown statuses', () => {
    expect(mapStatus('PENDING')).toBe('Pendiente');
    expect(mapStatus('APPROVED')).toBe('Aprobado');
    expect(mapStatus('REFUNDED')).toBe('Reembolsado');
    expect(mapStatus('PARTIAL_REFUND')).toBe('Reembolso parcial');
    expect(mapStatus('SOMESTATUS')).toBe('Pendiente');
  });

  it('getMetodoTag returns tags', () => {
    expect(getMetodoTag({ type: 'CREDIT_CARD' })).toBe('Crédito');
    expect(getMetodoTag({ type: 'MERCADO_PAGO' })).toBe('Mercado Pago');
    expect(getMetodoTag({ type: 'CASH' })).toBe('Efectivo');
    expect(getMetodoTag({})).toBe('—');
  });

  it('mapEventType maps known types and defaults nicely', () => {
    expect(mapEventType('REFUND_CREATED')).toBe('Reembolso creado');
    expect(mapEventType('PAYMENT_APPROVED')).toBe('Pago aprobado');
    expect(mapEventType('SOME_RANDOM_EVENT')).toBe('Some random event');
  });

  it('eventCategory returns correct categories', () => {
    expect(eventCategory('REFUND_CREATED', {})).toBe('refund');
    expect(eventCategory('PAYMENT_APPROVED', {})).toBe('state');
    expect(eventCategory('SOMETHING', { error: 'x' })).toBe('error');
    expect(eventCategory('OTHER', {})).toBe('info');
  });

  it('highlightPairs extracts top info from payload', () => {
    const payload = {
      amount: 150,
      currency: 'ars',
      method: 'CREDIT_CARD',
      card: { last4: '4242' },
      previous_status: 'PENDING',
      new_status: 'APPROVED',
      installments: 3,
      authorization_code: 'A1',
      reason: 'MotivoX',
      error: null,
    };
    const pairs = highlightPairs(payload, 'ARS');
    expect(Array.isArray(pairs)).toBe(true);
    // only up to 3 entries
    expect(pairs.length).toBeLessThanOrEqual(3);
    expect(pairs.some((p) => p[0] === 'Monto')).toBe(true);
  });

  it('translatePayloadDeep translates keys and values recursively', () => {
    const input = {
      status: 'APPROVED',
      method: 'CREDIT_CARD',
      nested: { error: 'SOME_ERROR', amount: 10 },
    };
    const out = translatePayloadDeep(input);
    expect(out['Estado']).toBe('Aprobado');
    expect(out['Método']).toBe('Tarjeta de crédito');
    expect(typeof out.nested === 'object').toBe(true);
  });

  it('buildComprobanteHTML contains expected fragments', () => {
    const pago = {
      id: 'XYZ',
      prestador: 'Prestador X',
      cliente: 'Cliente Y',
      metodo: 'Crédito',
      descripcion: 'Pago prueba',
      creadoISO: '2022-01-01T10:00:00Z',
      capturadoISO: '2022-01-01T11:00:00Z',
      impuestos: 10,
      subtotal: 100,
      total: 110,
      moneda: 'ARS',
      solicitud: 'RCOT-123',
    };
    const html = buildComprobanteHTML(pago);
    expect(html).toContain('#XYZ');
    expect(html).toContain('Prestador X');
    expect(html).toContain('Cliente Y');
    expect(html).toContain('Subtotal');
    expect(html).toContain('Operación');
  });

  it('descargarComprobante uses URL.createObjectURL and window.open and revokes', () => {
    const pago = {
      id: 'Z1',
      prestador: 'P',
      cliente: 'C',
      metodo: 'Crédito',
      descripcion: 'd',
      creadoISO: '2022-01-01T10:00:00Z',
      capturadoISO: '2022-01-01T11:00:00Z',
      impuestos: 0,
      subtotal: 10,
      total: 10,
      moneda: 'ARS',
      solicitud: 'RCOT-1',
    };

  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  const origOpen = window.open;

  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn(() => {});
  window.open = vi.fn(() => ({ closed: false }));

  // use fake timers to advance revoke timeout
  vi.useFakeTimers();

  descargarComprobante(pago);

  expect(URL.createObjectURL).toHaveBeenCalled();
  expect(window.open).toHaveBeenCalled();

  // advance timers to trigger revoke
  vi.advanceTimersByTime(60000);
  expect(URL.revokeObjectURL).toHaveBeenCalled();

  vi.useRealTimers();

  // restore originals
  URL.createObjectURL = origCreate;
  URL.revokeObjectURL = origRevoke;
  window.open = origOpen;
  });
});
