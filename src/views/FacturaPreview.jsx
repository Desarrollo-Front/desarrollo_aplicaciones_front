import { useRef, useEffect } from 'react';
import './FacturaPreview.css';

export default function FacturaPreview({ html, onClose }) {
  const iframeRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const onImprimir = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="invoice-modal-overlay" 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleBackdropClick}
    >
      <div className="invoice-modal" ref={modalRef}>
        <header className="invoice-modal-header">
          <div className="invoice-modal-title">
            <div className="invoice-modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 id="modal-title" className="invoice-modal-title-text">Vista previa de la factura</h2>
              <p className="invoice-modal-subtitle">Revisa el contenido antes de imprimir o descargar</p>
            </div>
          </div>
          <button 
            className="invoice-modal-close" 
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </header>
        
        <div className="invoice-modal-body">
          <div className="invoice-modal-iframe-container">
            <iframe 
              className="invoice-modal-iframe" 
              ref={iframeRef} 
              title="Vista previa de la factura" 
              srcDoc={html}
              loading="lazy"
            />
          </div>
        </div>
        
        <footer className="invoice-modal-footer">
          <div className="invoice-modal-actions">
            <button 
              className="invoice-btn invoice-btn--primary" 
              onClick={onImprimir}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="6,9 6,2 18,2 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="6,14 6,18 18,18 18,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Imprimir / Guardar PDF
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}