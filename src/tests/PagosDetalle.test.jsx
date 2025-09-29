import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PagosDetalle from '../views/Pagos-Detalle';

describe('PagosDetalle', () => {
  test('renderiza el componente y muestra el título', () => {
    render(
      <MemoryRouter>
        <PagosDetalle />
      </MemoryRouter>
    );
    expect(screen.getByText(/Detalle/i)).toBeInTheDocument();
  });
});
