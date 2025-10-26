import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

describe('PagosDetalle error', () => {
  beforeEach(() => {
    window.localStorage.setItem('role', 'USER');
    window.localStorage.setItem('authHeader', 'Bearer testtoken');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('muestra mensaje de error si la API falla', async () => {
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/timeline')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/api/payments/')) return Promise.resolve({ ok: false, status: 500 });
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
      expect(screen.getByText(/Error inesperado|No se pudo obtener el pago|No autorizado/i)).toBeInTheDocument();
    });
  });
});
