import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PagosLista from "./views/Pagos-Lista";
import PagosDetalle from "./views/Pagos-Detalle";
import Intenciones from "./views/Intenciones";
import Facturas from "./views/Facturas";
import Disputas from "./views/Disputas";
import Login from "./views/Login";
const Placeholder = ({ title }) => <div style={{ padding: 24 }}>{title}</div>;
import "./App.css";


export default function App() {
  return (
    <BrowserRouter>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pagos" element={<PagosLista />} />
          <Route path="/detalle/:id" element={<PagosDetalle />} />
          <Route path="/intenciones" element={<Intenciones />} />
          <Route path="/facturas" element={<Facturas />} />
          <Route path="/disputas" element={<Disputas />} />
          <Route path="/reconciliaciones" element={<Placeholder title="Reconciliaciones" />} />
          <Route path="/auditoria" element={<Placeholder title="Auditoría" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
