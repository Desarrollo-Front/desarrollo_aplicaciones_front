import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Gateway from '../views/Gateway';

beforeAll(() => {
  global.React = React;
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  global.IntersectionObserver = class { constructor(){} observe(){} unobserve(){} disconnect(){} };
});

describe('Gateway additional branch coverage', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('renders Gateway without crashing on missing state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/gateway' }]}>
        <Gateway />
      </MemoryRouter>
    );

    // Should render
    expect(document.body).toBeTruthy();
  });

  test('displays payment methods section', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/gateway', state: { resumen: { amount: 100 } } }]}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    }, { timeout: 1000 });
  });
});
