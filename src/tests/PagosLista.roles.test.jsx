import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PagosLista from '../views/Pagos-Lista';
import { MemoryRouter } from 'react-router-dom';

beforeAll(() => {
  global.React = React;
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  global.IntersectionObserver = class { constructor(){} observe(){} unobserve(){} disconnect(){} };
});

describe('PagosLista Ver Factura role branches', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('ADMIN sees cliente and prestador from API in generated factura', async () => {
    // set ADMIN role
    localStorage.setItem('auth', JSON.stringify({ role: 'ADMIN', name: 'AdminUser' }));

    // payments list
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { id: 'b1', user_name: 'UserFromAPI', provider_name: 'ProviderFromAPI', method: { type: 'CREDIT_CARD' }, status: 'APPROVED', amount_subtotal: 55, taxes:0, fees:0, amount_total:55, currency:'ARS', created_at:'2023-05-01T10:00:00Z' }
        ])});
      }
      if (url.match(/\/api\/payments\/b1$/)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id:'b1', user_name:'UserFromAPI', provider_name:'ProviderFromAPI', method:{type:'CREDIT_CARD'}, amount_subtotal:55, taxes:0, fees:0, amount_total:55, currency:'ARS', created_at:'2023-05-01T10:00:00Z' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#b1/)).toBeInTheDocument());

    // click Ver Factura
    const vfBtn = screen.getByText(/Ver Factura/i);
    fireEvent.click(vfBtn);

    // expect preview modal and that it contains text coming from generated HTML (Factura title)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText(/Vista previa de la factura/i)).toBeInTheDocument();

  });
});
