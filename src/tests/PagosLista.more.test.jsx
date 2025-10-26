import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosLista from '../views/Pagos-Lista';

beforeAll(() => {
  // polyfill observers used by the component
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
});

describe('PagosLista additional branches', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('shows Pagar button for Pendiente de Pago', async () => {
    localStorage.setItem('role', 'USER');
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '500',
                user_name: 'Cliente A',
                provider_name: 'Prestador A',
                method: { type: 'CREDIT_CARD' },
                status: 'PENDING_PAYMENT',
                amount_subtotal: 20,
                taxes: 0,
                fees: 0,
                amount_total: 20,
                currency: 'ARS',
                created_at: '2023-01-02T10:00:00Z',
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#500/)).toBeInTheDocument());
    expect(screen.getByText(/Pagar/i)).toBeInTheDocument();
  });

  test('kebab menu shows Ver factura for Aprobado and Ver pago', async () => {
    localStorage.setItem('role', 'USER');
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '600',
                user_name: 'Cliente B',
                provider_name: 'Prestador B',
                method: { type: 'DEBIT_CARD' },
                status: 'APPROVED',
                amount_subtotal: 40,
                taxes: 0,
                fees: 0,
                amount_total: 40,
                currency: 'ARS',
                created_at: '2023-02-02T10:00:00Z',
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#600/)).toBeInTheDocument());

    // open kebab menu (there is a pl-kebab__btn inside the row)
    const kebabBtn = document.querySelector('.pl-kebab__btn');
    expect(kebabBtn).toBeInTheDocument();
    fireEvent.click(kebabBtn);

    // now the menu should render with 'Ver factura' and 'Ver pago'
    await waitFor(() => expect(screen.getByText(/Ver factura/i)).toBeInTheDocument());
    expect(screen.getByText(/Ver pago/i)).toBeInTheDocument();
  });

  test('export CSV triggers URL.createObjectURL and revoke', async () => {
    localStorage.setItem('role', 'USER');
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '700',
                user_name: 'Cliente C',
                provider_name: 'Prestador C',
                method: { type: 'MERCADO_PAGO' },
                status: 'APPROVED',
                amount_subtotal: 120,
                taxes: 0,
                fees: 0,
                amount_total: 120,
                currency: 'ARS',
                created_at: '2023-03-04T10:00:00Z',
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    const origAnchorClick = HTMLAnchorElement.prototype.click;

    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn(() => {});
    HTMLAnchorElement.prototype.click = vi.fn(() => {});

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#700/)).toBeInTheDocument());

    const exportBtn = screen.getByText(/Exportar CSV/i);
    fireEvent.click(exportBtn);

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    // restore
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
    HTMLAnchorElement.prototype.click = origAnchorClick;
  });

  test('ordering by amount changes row order', async () => {
    localStorage.setItem('role', 'USER');
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '10',
                user_name: 'A',
                provider_name: 'X',
                method: { type: 'CREDIT_CARD' },
                status: 'APPROVED',
                amount_subtotal: 300,
                taxes: 0,
                fees: 0,
                amount_total: 300,
                currency: 'ARS',
                created_at: '2022-01-10T09:00:00Z',
              },
              {
                id: '11',
                user_name: 'B',
                provider_name: 'Y',
                method: { type: 'DEBIT_CARD' },
                status: 'APPROVED',
                amount_subtotal: 50,
                taxes: 0,
                fees: 0,
                amount_total: 50,
                currency: 'ARS',
                created_at: '2021-12-01T12:00:00Z',
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    // Wait for rows
    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());

    // default order Fecha ⬇ should show #10 first (newest)
    const rowsBefore = Array.from(document.querySelectorAll('.pl-tbl tbody tr'));
    expect(rowsBefore[0].textContent).toContain('#10');

    // open Orden select (react-select) by clicking the visible control
    const ordenControl = screen.getByText(/Fecha ⬇/i);
    fireEvent.mouseDown(ordenControl);

    // click Monto ⬆ option
    const montoAsc = await screen.findByText(/Monto ⬆/i);
    fireEvent.click(montoAsc);

    // now rows should be ordered by amount ascending: #11 then #10
    await waitFor(() => {
      const rowsAfter = Array.from(document.querySelectorAll('.pl-tbl tbody tr'));
      expect(rowsAfter[0].textContent).toContain('#11');
    });
  });
});
