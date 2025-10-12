import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../views/Login.jsx';

describe('Login', () => {
  test('renderiza el formulario y campos', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeInTheDocument();
  });

  test('muestra error si los campos están vacíos', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Completá email y contraseña.');
    });
  });

  test('toggle de mostrar/ocultar contraseña', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    const passInput = screen.getByLabelText('Contraseña');
    const toggleBtn = screen.getByRole('button', { name: /Mostrar/i });
    expect(passInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute('type', 'password');
  });
});
