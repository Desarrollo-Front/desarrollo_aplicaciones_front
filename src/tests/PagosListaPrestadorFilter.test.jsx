import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosLista from '../views/Pagos-Lista';

describe('PagosLista filtro por prestador', () => {
  beforeAll(() => {
    global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.localStorage.setItem('role', 'USER');
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([
        { id: 1, provider_name: 'Prestador Uno', method: { type: 'CREDIT_CARD' }, status: 'APPROVED', amount_total: 1000, currency: 'ARS', created_at: '2025-09-28T10:00:00Z' },
        { id: 2, provider_name: 'Prestador Dos', method: { type: 'DEBIT_CARD' }, status: 'PENDING', amount_total: 500, currency: 'ARS', created_at: '2025-09-28T11:00:00Z' }
      ]) })
    );
  });

  test('filtra la lista por nombre de prestador', async () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );
    // Esperar a que se rendericen ambos prestadores
    expect(await screen.findByText(/Prestador Uno/i)).toBeInTheDocument();
    expect(await screen.findByText(/Prestador Dos/i)).toBeInTheDocument();
    // Filtrar por "Prestador Uno"
    const input = screen.getByPlaceholderText(/Buscar por prestador/i);
    fireEvent.change(input, { target: { value: 'Uno' } });
    // Solo debe aparecer "Prestador Uno"
    expect(screen.getByText(/Prestador Uno/i)).toBeInTheDocument();
    expect(screen.queryByText(/Prestador Dos/i)).toBeNull();
  });
});
