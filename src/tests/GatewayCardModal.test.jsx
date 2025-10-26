import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Gateway from '../views/Gateway';

describe('Gateway Card Modal', () => {
  test('abre modal de tarjeta, completa datos y muestra máscara', async () => {
    const state = {
      id: 1,
      currency: 'ARS',
      subtotal: 1000,
      taxesAndFees: 200,
      total: 1200,
      status: 'PENDING',
    };

    render(
      <MemoryRouter initialEntries={[{ pathname: '/pago/1', state }] }>
        <Gateway />
      </MemoryRouter>
    );

    // seleccionar método tarjeta para abrir modal
    const cardRadio = screen.getAllByRole('radio').find((r) => r.name === '' || r);
    fireEvent.click(cardRadio);

    // modal debe aparecer
    expect(await screen.findByText(/Nueva tarjeta/i)).toBeInTheDocument();

    // completar formulario con datos válidos
    const numberInput = screen.getByPlaceholderText(/1234 1234 1234 1234/i);
    const nameInput = screen.getByPlaceholderText(/Ej.: María López/i);
    const expInput = screen.getByPlaceholderText(/MM\/AA/i);
    const cvvInput = screen.getByPlaceholderText(/3 dígitos/i);
    const docInput = screen.getByPlaceholderText(/Sin puntos ni guiones/i);

    fireEvent.change(numberInput, { target: { value: '4242 4242 4242 4242' } });
    fireEvent.change(nameInput, { target: { value: 'María López' } });
    fireEvent.change(expInput, { target: { value: '12/29' } });
    fireEvent.change(cvvInput, { target: { value: '123' } });
    fireEvent.change(docInput, { target: { value: '12345678' } });

    // el botón Continuar debe activarse
    const continuar = screen.getByRole('button', { name: /Continuar/i });
    expect(continuar).toBeEnabled();

    fireEvent.click(continuar);

    // la máscara de la tarjeta debe mostrarse en la sección de método
    expect(await screen.findByText(/•••• •••• ••••/)).toBeInTheDocument();
  });
});
