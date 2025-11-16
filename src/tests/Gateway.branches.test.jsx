import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Gateway from '../views/Gateway';

beforeAll(() => {
  global.React = React;
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  global.IntersectionObserver = class { constructor(){} observe(){} unobserve(){} disconnect(){} };
});

describe('Gateway branch coverage - loading and error states', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('shows loading state when payment data is being fetched', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('tokenType', 'Bearer');

    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    const { container } = render(
      <MemoryRouter initialEntries={['/gateway/pay1']}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      const loadingDiv = container.querySelector('.gateway-summary-loading');
      expect(loadingDiv).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('displays error message when API fetch fails', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('tokenType', 'Bearer');

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment not found' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
    );

    render(
      <MemoryRouter initialEntries={['/gateway/invalid-id']}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      const errorDiv = document.querySelector('.gateway-summary-error');
      expect(errorDiv).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('renders summary content when payment loads successfully', async () => {
    const mockPayment = {
      id: 'p1',
      currency: 'ARS',
      amount_subtotal: 100,
      taxes: 10,
      fees: 0,
      amount_total: 110,
    };

    localStorage.setItem('token', 'test-token');
    localStorage.setItem('tokenType', 'Bearer');

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPayment),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
    );

    const { container } = render(
      <MemoryRouter initialEntries={['/gateway/p1']}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      const summaryContent = container.querySelector('.gateway-summary-content');
      expect(summaryContent).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('with location state, skips loading and shows summary immediately', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={[{
        pathname: '/gateway/p1',
        state: {
          id: 'p1',
          currency: 'ARS',
          subtotal: 100,
          total: 110,
          taxesAndFees: 10,
        }
      }]}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      const summaryContent = container.querySelector('.gateway-summary-content');
      expect(summaryContent).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('pay button is disabled when no payment method selected', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={[{
        pathname: '/gateway/p1',
        state: {
          id: 'p1',
          currency: 'ARS',
          subtotal: 100,
          total: 110,
          taxesAndFees: 10,
        }
      }]}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      const payBtn = container.querySelector('.gateway-pay-btn');
      expect(payBtn).toBeDisabled();
    }, { timeout: 1000 });
  });

  test('fetchJsonOrText returns JSON when content-type includes application/json', async () => {
    localStorage.setItem('token', 'test-token');

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
      })
    );

    render(
      <MemoryRouter initialEntries={['/gateway/p1']}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  test('handles non-JSON response from API', async () => {
    localStorage.setItem('token', 'test-token');

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.reject(new Error('Not JSON')),
        text: () => Promise.resolve('Error message in text'),
        headers: new Headers({ 'content-type': 'text/plain' }),
      })
    );

    render(
      <MemoryRouter initialEntries={['/gateway/p1']}>
        <Gateway />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
