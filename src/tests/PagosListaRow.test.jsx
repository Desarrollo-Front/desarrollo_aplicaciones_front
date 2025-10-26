import React from 'react';
import '@testing-library/jest-dom';
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosLista from '../views/Pagos-Lista';

describe('PagosLista row rendering', () => {
  beforeEach(() => {
    window.localStorage.setItem('name', 'Usuario Test');
    window.localStorage.setItem('role', 'USER');
  });

  test('muestra un pago devuelto por la API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 1,
            provider_name: 'Proveedor Test',
            method: { type: 'CREDIT_CARD' },
            status: 'APPROVED',
            amount_total: 1000,
            currency: 'ARS',
            created_at: '2025-10-25T12:00:00Z',
          },
        ]),
    });

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Proveedor Test/i)).toBeInTheDocument();
  });
});
