import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosLista from '../views/Pagos-Lista';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
  // Some components use JSX without importing React; ensure React is available globally for those modules
  global.React = React;
});

describe('PagosLista extra branches', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('Pendiente chip groups include PENDING and PENDING_PAYMENT', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: '1', user_name: 'A', provider_name: 'P1', method: { type: 'CREDIT_CARD' }, status: 'PENDING', amount_subtotal: 10, taxes: 0, fees: 0, amount_total: 10, currency: 'ARS', created_at: '2023-01-01T00:00:00Z' },
              { id: '2', user_name: 'B', provider_name: 'P2', method: { type: 'DEBIT_CARD' }, status: 'PENDING_PAYMENT', amount_subtotal: 20, taxes: 0, fees: 0, amount_total: 20, currency: 'ARS', created_at: '2023-02-01T00:00:00Z' },
              { id: '3', user_name: 'C', provider_name: 'P3', method: { type: 'MERCADO_PAGO' }, status: 'APPROVED', amount_subtotal: 30, taxes: 0, fees: 0, amount_total: 30, currency: 'ARS', created_at: '2023-03-01T00:00:00Z' },
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

    await waitFor(() => expect(screen.getByText(/#1/)).toBeInTheDocument());

  // click the Pendiente chip button (there are multiple nodes with the text 'Pendiente')
  const pendMatches = screen.getAllByText(/Pendiente/i);
  const pendienteChip = pendMatches.find((el) => el.tagName === 'BUTTON' || el.closest('button'));
  fireEvent.click(pendienteChip);

    // should contain #1 and #2 but not #3
    await waitFor(() => expect(screen.getByText(/#1/)).toBeInTheDocument());
    expect(screen.getByText(/#2/)).toBeInTheDocument();
    expect(screen.queryByText(/#3/)).not.toBeInTheDocument();
  });

  test('Metodo select filters by Tarjeta crédito', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: '10', user_name: 'A', provider_name: 'X', method: { type: 'CREDIT_CARD' }, status: 'APPROVED', amount_subtotal: 100, taxes: 0, fees: 0, amount_total: 100, currency: 'ARS', created_at: '2022-01-01T00:00:00Z' },
              { id: '11', user_name: 'B', provider_name: 'Y', method: { type: 'DEBIT_CARD' }, status: 'APPROVED', amount_subtotal: 50, taxes: 0, fees: 0, amount_total: 50, currency: 'ARS', created_at: '2022-01-02T00:00:00Z' },
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

    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());

    // open Metodo select (react-select control shows current label)
    const metodoControl = screen.getByText(/Todos los métodos/i);
    fireEvent.mouseDown(metodoControl);

    const creditOpt = await screen.findByText(/Tarjeta crédito/i);
    fireEvent.click(creditOpt);

    // should only show #10
    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());
    expect(screen.queryByText(/#11/)).not.toBeInTheDocument();
  });

  test('fetch error displays message', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/No se pudieron obtener los pagos./i)).toBeInTheDocument());
  });

  test('click Ver factura opens FacturaPreview', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: '99', user_name: 'Z', provider_name: 'ZP', method: { type: 'CREDIT_CARD' }, status: 'APPROVED', amount_subtotal: 15, taxes: 0, fees: 0, amount_total: 15, currency: 'ARS', created_at: '2023-05-01T00:00:00Z' },
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

    await waitFor(() => expect(screen.getByText(/#99/)).toBeInTheDocument());

  // click the visible 'Ver Factura' button in the row
  const verFactura = await screen.findByRole('button', { name: /Ver Factura/i });
  fireEvent.click(verFactura);

  // FacturaPreview should render and show the print/save button
  const imprimirBtn = await screen.findByRole('button', { name: /Imprimir \/ Guardar PDF/i });
  expect(imprimirBtn).toBeInTheDocument();
  });
});
