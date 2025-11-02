import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

describe('PagosDetalle timeline error', () => {
  beforeEach(() => {
    window.localStorage.setItem('role', 'USER');
    window.localStorage.setItem('authHeader', 'Bearer testtoken');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('muestra mensaje de error si la consulta de timeline falla', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) return Promise.resolve({ ok: false, status: 500 });
      if (url.includes('/api/payments/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: '1', amount_total: 100, currency: 'ARS', status: 'APPROVED' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter initialEntries={["/detalle/1"]}>
        <Routes>
          <Route path="/detalle/:id" element={<PagosDetalle />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No se pudo obtener el timeline/i)).toBeInTheDocument();
    });
  });
});
