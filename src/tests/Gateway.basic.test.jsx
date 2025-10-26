import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Gateway from '../views/Gateway';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Simple global mocks used by components
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

describe('Gateway basic UI', () => {
  test('renders resumen from location state and enables pay when method selected', () => {
    const state = {
      id: 'p1',
      currency: 'ARS',
      subtotal: 1000,
      taxesAndFees: 200,
      total: 1200,
      status: 'PENDING',
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: '/pago/p1', state }]}> 
        <Routes>
          <Route path="/pago/:id" element={<Gateway />} />
        </Routes>
      </MemoryRouter>
    );

  // Summary should show formatted subtotal and total (may appear multiple times)
  expect(screen.getAllByText(/Subtotal/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Total/i).length).toBeGreaterThan(0);
    // Initially pay button disabled because no method
    const payBtn = screen.getByRole('button', { name: /Pagar ahora/i });
    expect(payBtn).toBeDisabled();

    // Select MercadoPago method -> enable pay button
    const mpRadio = screen.getByRole('radio', { name: /MercadoPago/i }) || screen.getByRole('radio');
    fireEvent.click(mpRadio);

    expect(payBtn).not.toBeDisabled();
  });

  test('selecting card shows card modal', () => {
    const state = {
      id: 'p1',
      currency: 'ARS',
      subtotal: 100,
      total: 100,
      status: 'PENDING',
    };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/pago/p1', state }]}> 
        <Routes>
          <Route path="/pago/:id" element={<Gateway />} />
        </Routes>
      </MemoryRouter>
    );

    const cardRadio = screen.getAllByRole('radio')[0];
    fireEvent.click(cardRadio);

    // The modal title 'Nueva tarjeta' should appear
    expect(screen.getByText(/Nueva tarjeta/i)).toBeInTheDocument();
  });
});
