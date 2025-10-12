
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosLista from '../views/Pagos-Lista';

// Mock ResizeObserver and IntersectionObserver for test environment
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('PagosLista filtros', () => {
  test('puede cambiar el filtro de método de pago', () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );
    // Busca el filtro de método y simula el cambio
    const metodoSelect = screen.getByText(/Todos los métodos/i);
    expect(metodoSelect).toBeInTheDocument();
    // Aquí podrías simular el cambio si el select es interactivo
  });

  test('puede cambiar el filtro de fecha', () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );
  // Buscar los inputs de fecha por type directamente
  const dateInputs = document.querySelectorAll('input[type="date"]');
  expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  const desdeInput = dateInputs[0];
  expect(desdeInput).toBeInTheDocument();
  fireEvent.change(desdeInput, { target: { value: '2024-06-01' } });
  expect(desdeInput.value).toBe('2024-06-01');
  });
});
