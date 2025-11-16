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

describe('PagosLista export CSV', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('clicking Exportar CSV triggers createObjectURL, click and revoke', async () => {
    localStorage.setItem('role', 'USER');
    global.fetch = vi.fn((url) => {
      if (url.endsWith('/my-payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          {
            id: '900',
            user_name: 'ClienteX',
            provider_name: 'PrestadorX',
            method: { type: 'CREDIT_CARD' },
            status: 'APPROVED',
            amount_subtotal: 100,
            taxes: 0,
            fees: 0,
            amount_total: 100,
            currency: 'ARS',
            created_at: '2023-01-01T10:00:00Z',
          }
        ])});
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    const origAnchorClick = HTMLAnchorElement.prototype.click;

    const createMock = vi.fn(() => 'blob:fake');
    const revokeMock = vi.fn();
    const anchorClickMock = vi.fn();

    URL.createObjectURL = createMock;
    URL.revokeObjectURL = revokeMock;
    HTMLAnchorElement.prototype.click = anchorClickMock;

    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/#900/)).toBeInTheDocument());

    const exportBtn = screen.getByText(/Exportar CSV/i);
    fireEvent.click(exportBtn);

    expect(createMock).toHaveBeenCalled();
    expect(anchorClickMock).toHaveBeenCalled();
    expect(revokeMock).toHaveBeenCalled();

    // restore
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
    HTMLAnchorElement.prototype.click = origAnchorClick;
  });
});
