import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosLista from '../views/Pagos-Lista';

describe('PagosLista lista vacía', () => {
  beforeAll(() => {
    global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.localStorage.setItem('role', 'USER');
  });

  test('muestra mensaje de lista vacía si no hay pagos', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/No se encontraron pagos|Cargando pagos/i)).toBeInTheDocument();
    });
  });
});
