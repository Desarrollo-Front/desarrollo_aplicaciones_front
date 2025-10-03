import { useRef } from 'react';

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
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'grid',placeItems:'center',zIndex:9999}}>
      <div style={{background:'#fff',width:'min(1000px,95vw)',height:'min(85vh,900px)',borderRadius:12,boxShadow:'0 10px 30px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700,fontSize:16}}>Vista previa de la factura</div>
          <button onClick={onClose} style={{border:'1px solid #e5e7eb',background:'#fff',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}>Cerrar</button>
        </div>
        <div style={{flex:1,background:'#f7f7f8'}}>
          <iframe ref={iframeRef} title="Factura" style={{width:'100%',height:'100%',border:'none'}} srcDoc={html} />
        </div>
        <div style={{padding:'12px 16px',borderTop:'1px solid #eee',display:'flex',gap:12,justifyContent:'flex-end'}}>
          <button onClick={onDescargarHTML} style={{border:'1px solid #e5e7eb',background:'#fff',borderRadius:8,padding:'10px 14px',cursor:'pointer'}}>Descargar HTML</button>
          <button onClick={onImprimir} style={{border:'none',background:'#0ea5a6',color:'#fff',borderRadius:8,padding:'10px 14px',cursor:'pointer'}}>Imprimir / Guardar PDF</button>
        </div>
      </div>
    </div>
  );
}
