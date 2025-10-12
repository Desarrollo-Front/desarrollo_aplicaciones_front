import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../views/Login.jsx';

describe('Login error', () => {
  test('muestra error de credenciales inválidas', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@mail.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas.');
    });
  });
});
