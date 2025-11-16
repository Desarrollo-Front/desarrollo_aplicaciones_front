import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { ThemeProvider } from '../context/ThemeContext';

describe('App', () => {
  test('redirecciona / a /login', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    // Verifica el botón de ingresar
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeInTheDocument();
  });

  test('renderiza rutas principales', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    // App text changed to use "Ingresá a tu cuenta para continuar" in UI
    expect(screen.getByText(/Ingresá a tu cuenta para continuar|Accedé con tu cuenta para continuar/i)).toBeInTheDocument();
  });
});
