import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PagosLista from '../views/Pagos-Lista';
import { MemoryRouter } from 'react-router-dom';

// Browser API mocks used by the component
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

describe('PagosLista branches and export', () => {
  beforeEach(() => {
    // default localStorage auth to a non-MERCHANT user so Pagar button may appear
    localStorage.setItem('auth', JSON.stringify({ name: 'User Test', role: 'USER' }));
    localStorage.setItem('name', 'User Test');

    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '1',
                user_name: 'Cliente A',
                provider_name: 'Prestador A',
                method: { type: 'CREDIT_CARD' },
                status: 'PENDING_PAYMENT',
                amount_subtotal: 100,
                taxes: 0,
                fees: 0,
                amount_total: 100,
                currency: 'ARS',
                created_at: '2020-01-01T10:00:00Z',
              },
              {
                id: '2',
                user_name: 'Cliente B',
                provider_name: 'Prestador B',
                method: { type: 'MERCADO_PAGO' },
                status: 'APPROVED',
                amount_subtotal: 200,
                taxes: 10,
                fees: 0,
                amount_total: 210,
                currency: 'ARS',
                created_at: '2021-06-01T12:00:00Z',
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

  test('renders mapped method and status and shows Pagar for Pendiente de Pago', async () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    // wait for the rows to appear
    await waitFor(() => expect(screen.getByText(/#1/)).toBeInTheDocument());

    // method mapping: CREDIT_CARD -> Crédito (rendered inside Badge)
    expect(screen.getByText(/Crédito|Crédito/)).toBeInTheDocument();

    // Pagar button should appear for the PENDING_PAYMENT row
    expect(screen.getByText(/Pagar/i)).toBeInTheDocument();

    // approved row should show Mercado Pago badge
    expect(screen.getAllByText(/Mercado Pago/i).length).toBeGreaterThanOrEqual(1);
  });

  test('export CSV calls URL.createObjectURL and triggers download', async () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#1/)).toBeInTheDocument());

    // ensure URL.createObjectURL and revokeObjectURL exist
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => 'blob:fake';
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = () => {};
    }

    const createSpy = vi.spyOn(URL, 'createObjectURL');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const origCreate = document.createElement.bind(document);
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'a' ? mockAnchor : origCreate(tag)));

    // click export element
    const exportEl = screen.getByText(/Exportar CSV/i);
    fireEvent.click(exportEl);

    expect(createSpy).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();
  });
});
