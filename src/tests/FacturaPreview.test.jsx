import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

let FacturaPreview;

describe('FacturaPreview', () => {
  beforeAll(async () => {
    global.React = React;
    // dynamic import so global.React is set for the module evaluation
    FacturaPreview = (await import('../views/FacturaPreview')).default;
  });

  afterEach(() => {
    vi.resetAllMocks();
    // clean up any globals we may have defined on URL
    if (global.URL) {
      if (global.URL.createObjectURL && global.URL.createObjectURL._isMock) delete global.URL.createObjectURL;
      if (global.URL.revokeObjectURL && global.URL.revokeObjectURL._isMock) delete global.URL.revokeObjectURL;
    }
  });

  test('calls URL.createObjectURL when Descargar HTML es clicked', async () => {
    const html = '<h1>Factura</h1>';
    const onClose = vi.fn();

    // make sure URL.createObjectURL exists so spyOn won't throw
    if (!URL.createObjectURL) {
      // mark the mock so we can clean up later
      const fn = () => 'blob:url';
      fn._isMock = true;
      URL.createObjectURL = fn;
    }
    if (!URL.revokeObjectURL) {
      const fn = () => {};
      fn._isMock = true;
      URL.revokeObjectURL = fn;
    }

    const createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:url');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // mock anchor creation to avoid actually navigating
    const origCreate = document.createElement.bind(document);
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return origCreate(tag);
    });

    render(<FacturaPreview html={html} onClose={onClose} />);

    const btn = screen.getByRole('button', { name: /Descargar HTML/i });
    fireEvent.click(btn);

    expect(createSpy).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();
  });

  test('calls iframe print when Imprimir is clicked', () => {
    const html = '<p>Hola</p>';
    const onClose = vi.fn();

    render(<FacturaPreview html={html} onClose={onClose} />);

    const iframe = document.querySelector('iframe');
    // attach mock contentWindow - define property since contentWindow has only a getter in jsdom
    const mockWin = { print: vi.fn(), focus: vi.fn() };
    try {
      Object.defineProperty(iframe, 'contentWindow', { value: mockWin, configurable: true });
    } catch (e) {
      // fallback: try to set directly (may fail in some environments)
      // eslint-disable-next-line no-empty
      try { iframe.contentWindow = mockWin; } catch (err) {}
    }

    const btn = screen.getByRole('button', { name: /Imprimir \/ Guardar PDF/i });
    fireEvent.click(btn);

    expect(iframe.contentWindow.print).toHaveBeenCalled();
    expect(iframe.contentWindow.focus).toHaveBeenCalled();
  });

  test('calls onClose when backdrop or close button is used', () => {
    const html = '<p>Close</p>';
    const onClose = vi.fn();

    render(<FacturaPreview html={html} onClose={onClose} />);

    // click close button
    const closeBtn = screen.getByLabelText(/Cerrar modal/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // click backdrop (overlay) - find the dialog wrapper by role
    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
