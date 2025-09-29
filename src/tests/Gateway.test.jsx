import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Gateway from '../views/Gateway';

describe('Gateway', () => {
  test('renderiza el título y botón de volver', () => {
    render(
      <MemoryRouter>
        <Gateway />
      </MemoryRouter>
    );
    expect(screen.getByText(/Medio de pago/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver/i })).toBeInTheDocument();
  });

  test('muestra opciones de método de pago', () => {
    render(
      <MemoryRouter>
        <Gateway />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/card/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mercado/i)).toBeInTheDocument();
  });
});
