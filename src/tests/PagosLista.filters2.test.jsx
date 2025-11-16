import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PagosLista from '../views/Pagos-Lista';
import { MemoryRouter } from 'react-router-dom';

// Mock browser APIs used by the component
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

describe('PagosLista filters, date range and reset', () => {
  beforeEach(() => {
    localStorage.setItem('auth', JSON.stringify({ name: 'Tester', role: 'USER' }));
    localStorage.setItem('name', 'Tester');

    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '10',
                user_name: 'Alpha Cliente',
                provider_name: 'Prestador X',
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
                user_name: 'Beta Cliente',
                provider_name: 'Prestador Y',
                method: { type: 'DEBIT_CARD' },
                status: 'PENDING',
                amount_subtotal: 50,
                taxes: 0,
                fees: 0,
                amount_total: 50,
                currency: 'ARS',
                created_at: '2021-12-01T12:00:00Z',
              },
              {
                id: '12',
                user_name: 'Gamma Cliente',
                provider_name: 'Prestador Z',
                method: { type: 'MERCADO_PAGO' },
                status: 'REFUNDED',
                amount_subtotal: 120,
                taxes: 0,
                fees: 0,
                amount_total: 120,
                currency: 'ARS',
                created_at: '2020-06-15T16:00:00Z',
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('search query filters rows and reset restores state', async () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    // wait for table rows to render
    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());

    // type into search box to filter by provider 'Prestador X'
    const search = screen.getByPlaceholderText(/Buscar por/i);
    fireEvent.change(search, { target: { value: 'Prestador X' } });

    // now only the row with Prestador X should be visible
    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());
    expect(screen.queryByText(/#11/)).not.toBeInTheDocument();
    expect(screen.queryByText(/#12/)).not.toBeInTheDocument();

  // click reset button to clear filters (label is 'Reiniciar' in the UI)
  const resetBtn = screen.getByRole('button', { name: /Reiniciar/i });
  fireEvent.click(resetBtn);

    // after reset the other rows should reappear
    await waitFor(() => expect(screen.getByText(/#11/)).toBeInTheDocument());
    expect(screen.getByText(/#12/)).toBeInTheDocument();
  });

  test('chip filtering and date range filter work', async () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());

  // Click the Aprobado chip to filter approved payments (UI chips: Pendiente/Aprobado/Rechazado)
  const aprobadoBtn = screen.getByRole('button', { name: /Aprobado/i });
  fireEvent.click(aprobadoBtn);

    // should show only the approved row (id 10)
    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());
    expect(screen.queryByText(/#11/)).not.toBeInTheDocument();

  // Now set 'desde' to 2021-01-01 and 'hasta' to 2022-12-31 to include id 10 and 11 but not 12
  // set dates (labels are siblings of inputs in the component, so locate inputs via the label's parent)
  const desdeLabel = screen.getByText(/Desde/i);
  const hastaLabel = screen.getByText(/Hasta/i);
  const desdeInput = desdeLabel.parentElement.querySelector('input[type="date"]');
  const hastaInput = hastaLabel.parentElement.querySelector('input[type="date"]');
  fireEvent.change(desdeInput, { target: { value: '2021-01-01' } });
  fireEvent.change(hastaInput, { target: { value: '2022-12-31' } });

  // Toggle Aprobado off to allow date filter to show results
  fireEvent.click(aprobadoBtn); // toggle off

    // now only rows within the date range should be present (10 and 11)
    await waitFor(() => expect(screen.getByText(/#10/)).toBeInTheDocument());
    expect(screen.getByText(/#11/)).toBeInTheDocument();
    expect(screen.queryByText(/#12/)).not.toBeInTheDocument();
  });
});
