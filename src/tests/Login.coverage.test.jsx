import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../views/Login';

beforeAll(() => {
  global.React = React;
});

describe('Login additional branch coverage', () => {
  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  test('renders login form with email and password fields', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/email|usuario/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/);
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  test('login button is rendered and clickable', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const loginBtn = screen.getByRole('button', { name: /ingresar|login/i });
    expect(loginBtn).toBeInTheDocument();
    expect(loginBtn).not.toBeDisabled();
  });

  test('handles input change in email field', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/email|usuario/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  test('handles input change in password field', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText(/••••••••/);
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    expect(passwordInput.value).toBe('mypassword');
  });
});
