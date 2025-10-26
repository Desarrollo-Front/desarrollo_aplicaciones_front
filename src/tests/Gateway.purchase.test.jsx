import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Gateway from '../views/Gateway';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Lightweight browser API mocks used by components
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

describe('Gateway purchase flows', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('MercadoPago purchase succeeds and navigates to /pagos', async () => {
    const state = {
      id: 'p-mp',
      currency: 'ARS',
      subtotal: 100,
      taxesAndFees: 10,
      total: 110,
      status: 'PENDING',
    };

    // mock fetch for payment-method and confirm
    global.fetch = vi.fn((url, opts) => {
      if (url.includes('/payment-method')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ assigned: true }) });
      }
      if (url.includes('/confirm')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'p-mp', status: 'APPROVED' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/pago/p-mp', state }]}> 
        <Routes>
          <Route path="/pago/:id" element={<Gateway />} />
          <Route path="/pagos" element={<div>Pagos list page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Select MercadoPago option and click pay
    const mpRadio = screen.getByRole('radio', { name: /MercadoPago/i }) || screen.getAllByRole('radio')[1];
    fireEvent.click(mpRadio);

    const payBtn = screen.getByRole('button', { name: /Pagar ahora/i });
    expect(payBtn).not.toBeDisabled();

    fireEvent.click(payBtn);

    // after successful confirm the router should navigate to /pagos
    await waitFor(() => expect(screen.getByText(/Pagos list page/i)).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalled();
  });

  test('Card purchase: open modal, fill card, continue and confirm success', async () => {
    const state = {
      id: 'p-card',
      currency: 'ARS',
      subtotal: 200,
      taxesAndFees: 20,
      total: 220,
      status: 'PENDING',
    };

    global.fetch = vi.fn((url, opts) => {
      if (url.includes('/payment-method')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ assigned: true }) });
      }
      if (url.includes('/confirm')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'p-card', status: 'APPROVED' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/pago/p-card', state }]}> 
        <Routes>
          <Route path="/pago/:id" element={<Gateway />} />
          <Route path="/pagos" element={<div>Pagos list page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Choose card option
    const cardRadio = screen.getAllByRole('radio')[0];
    fireEvent.click(cardRadio);

    // Modal should appear
    expect(screen.getByText(/Nueva tarjeta/i)).toBeInTheDocument();

    // Fill card fields (valid data)
    fireEvent.change(screen.getByPlaceholderText(/1234 1234 1234 1234/), { target: { value: '4111 1111 1111 1111' } });
    fireEvent.change(screen.getByPlaceholderText(/Ej.: María López/), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/MM\/AA/), { target: { value: '12/99' } });
    fireEvent.change(screen.getByPlaceholderText(/3 dígitos/), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText(/Sin puntos ni guiones/), { target: { value: '12345678' } });

    // Click continuar (button text 'Continuar')
    const continuar = screen.getByRole('button', { name: /Continuar/i });
    // The button is disabled until form valid; wait a tick for validation
    await waitFor(() => expect(continuar).not.toBeDisabled());
    fireEvent.click(continuar);

    // Card modal closes and mask appears in summary
    await waitFor(() => expect(screen.getByText(/••••/)).toBeInTheDocument());

    // Click pay
    const payBtn = screen.getByRole('button', { name: /Pagar ahora/i });
    fireEvent.click(payBtn);

    // confirm should succeed and navigate
    await waitFor(() => expect(screen.getByText(/Pagos list page/i)).toBeInTheDocument());
  });

  test('Confirm failure shows an error message', async () => {
    const state = {
      id: 'p-fail',
      currency: 'ARS',
      subtotal: 50,
      taxesAndFees: 5,
      total: 55,
      status: 'PENDING',
    };

    // payment-method OK, confirm fails
    global.fetch = vi.fn((url, opts) => {
      if (url.includes('/payment-method')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ assigned: true }) });
      }
      if (url.includes('/confirm')) {
        // include a minimal headers mock so gateway.fetchJsonOrText doesn't throw
        return Promise.resolve({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('No se pudo confirmar') });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/pago/p-fail', state }]}> 
        <Routes>
          <Route path="/pago/:id" element={<Gateway />} />
        </Routes>
      </MemoryRouter>
    );

    // Select MP and click pay
    const mpRadio = screen.getByRole('radio', { name: /MercadoPago/i }) || screen.getAllByRole('radio')[1];
    fireEvent.click(mpRadio);
    const payBtn = screen.getByRole('button', { name: /Pagar ahora/i });
    fireEvent.click(payBtn);

    // Expect an error message to be displayed in the summary error area
    await waitFor(() => expect(screen.getByText(/No se pudo confirmar|Error al procesar el pago/i)).toBeInTheDocument());
  });
});
