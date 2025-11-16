import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PagosLista from '../views/Pagos-Lista';
import { MemoryRouter } from 'react-router-dom';

beforeAll(() => {
  global.React = React;
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  global.IntersectionObserver = class { constructor(){} observe(){} unobserve(){} disconnect(){} };
});

describe('PagosLista action buttons by status', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('shows Pagar, Ver Factura, Reintentar or no-action depending on estado', async () => {
    localStorage.setItem('name', 'LocalUser');
    localStorage.setItem('role', 'USER');

    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { id: 'a1', user_name: 'U1', provider_name: 'P1', method: { type: 'CREDIT_CARD' }, status: 'PENDING_PAYMENT', amount_subtotal: 10, taxes:0, fees:0, amount_total:10, currency:'ARS', created_at:'2023-01-01T00:00:00Z' },
          { id: 'a2', user_name: 'U2', provider_name: 'P2', method: { type: 'CREDIT_CARD' }, status: 'APPROVED', amount_subtotal: 20, taxes:0, fees:0, amount_total:20, currency:'ARS', created_at:'2023-02-01T00:00:00Z' },
          { id: 'a3', user_name: 'U3', provider_name: 'P3', method: { type: 'CREDIT_CARD' }, status: 'REJECTED', amount_subtotal: 30, taxes:0, fees:0, amount_total:30, currency:'ARS', created_at:'2023-03-01T00:00:00Z' },
          { id: 'a4', user_name: 'U4', provider_name: 'P4', method: { type: 'CREDIT_CARD' }, status: 'UNKNOWN', amount_subtotal: 40, taxes:0, fees:0, amount_total:40, currency:'ARS', created_at:'2023-04-01T00:00:00Z' },
        ])});
      }
      if (url.match(/\/api\/payments\/a2$/)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id:'a2', user_name:'U2', provider_name:'P2', method:{type:'CREDIT_CARD'}, amount_subtotal:20, taxes:0, fees:0, amount_total:20, currency:'ARS', created_at:'2023-02-01T00:00:00Z' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#a1/)).toBeInTheDocument());

    // For a1 (PENDING_PAYMENT) should see Pagar
    expect(screen.getByText(/Pagar/i)).toBeInTheDocument();

    // For a2 (APPROVED) should see Ver Factura
    expect(screen.getByText(/Ver Factura/i)).toBeInTheDocument();

    // For a3 (REJECTED) should see Reintentar
    expect(screen.getByText(/Reintentar/i)).toBeInTheDocument();

    // For a4 (UNKNOWN) should show dash
    const rows = Array.from(document.querySelectorAll('.pl-tbl tbody tr'));
    // find row that contains #a4
    const rowA4 = rows.find(r => r.textContent.includes('#a4'));
    expect(rowA4).toBeTruthy();
    expect(rowA4.querySelector('.pl-no-action')).toBeTruthy();

    // Click Ver Factura (a2) to open preview; fetch for /api/payments/a2 is mocked above
    const vfBtn = screen.getAllByText(/Ver Factura/i)[0];
    fireEvent.click(vfBtn);

    // after clicking, a FacturaPreview should render (modal dialog)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});
