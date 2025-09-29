import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosLista from '../views/Pagos-Lista';

describe('PagosLista exportar CSV', () => {
  beforeAll(() => {
    global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.localStorage.setItem('role', 'USER');
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
  });

  test('renderiza el botón de exportar CSV', () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );
    expect(screen.getByText(/Exportar CSV/i)).toBeInTheDocument();
  });
});
