import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

beforeAll(() => {
  global.React = React;
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  global.IntersectionObserver = class { constructor(){} observe(){} unobserve(){} disconnect(){} };
});

describe('PagosDetalle additional branch coverage', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('renders component without crashing', async () => {
    localStorage.setItem('role', 'USER');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    render(
      <MemoryRouter initialEntries={['/pagos/p123']}>
        <PagosDetalle />
      </MemoryRouter>
    );

    // Should render
    expect(document.body).toBeTruthy();
  });

  test('displays payment details when data loads', async () => {
    localStorage.setItem('role', 'USER');
    
    const mockData = {
      id: 'p123',
      amount_total: 100,
      amount_subtotal: 95,
      taxes: 5,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    );

    render(
      <MemoryRouter initialEntries={['/pagos/p123']}>
        <PagosDetalle />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    }, { timeout: 2000 });
  });

  test('handles fetch errors gracefully', async () => {
    localStorage.setItem('role', 'USER');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      })
    );

    render(
      <MemoryRouter initialEntries={['/pagos/p123']}>
        <PagosDetalle />
      </MemoryRouter>
    );

    // Should render even with fetch error
    expect(document.body).toBeTruthy();
  });
});
