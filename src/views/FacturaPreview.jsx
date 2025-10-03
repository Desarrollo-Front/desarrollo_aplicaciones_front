import { useRef } from 'react';
import './FacturaPreview.css';

export default function FacturaPreview({ html, onClose }) {
  const iframeRef = useRef(null);

  const onImprimir = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  };

  const onDescargarHTML = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'factura.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gx-ticket-ov" role="dialog" aria-modal="true">
      <div className="gx-ticket">
        <header className="gx-ticket-h">
          <div className="gx-ticket-title">Vista previa de la factura</div>
          <button className="gx-ticket-close" onClick={onClose}>Cerrar</button>
        </header>
        <div className="gx-ticket-body">
          <iframe className="gx-ticket-iframe" ref={iframeRef} title="Factura" srcDoc={html} />
        </div>
        <footer className="gx-ticket-f">
          <button className="gx-btn gx-btn--ghost" onClick={onDescargarHTML}>Descargar HTML</button>
          <button className="gx-btn gx-btn--pri" onClick={onImprimir}>Imprimir / Guardar PDF</button>
        </footer>
      </div>
    </div>
  );
}
