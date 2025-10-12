import React from 'react';
import '@testing-library/jest-dom';
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
import { render, screen } from '@testing-library/react';
import PagosLista from '../views/Pagos-Lista';
import { MemoryRouter } from 'react-router-dom';

describe('PagosLista', () => {
  test('renderiza correctamente el nombre de usuario por defecto', () => {
    render(
      <MemoryRouter>
        <PagosLista />
      </MemoryRouter>
    );
    expect(screen.getByText(/Usuario/i)).toBeInTheDocument();
  });
});
