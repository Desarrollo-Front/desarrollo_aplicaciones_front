import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import PagosLista from "./views/Pagos-Lista";
import PagosDetalle from "./views/Pagos-Detalle";
import Intenciones from "./views/Intenciones";
const Placeholder = ({ title }) => <div style={{ padding: 24 }}>{title}</div>;
import "./App.css";


export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/pagos" replace />} />
          <Route path="/pagos" element={<PagosLista />} />
          <Route path="/detalle/:id" element={<PagosDetalle />} />
          <Route path="/intenciones" element={<Intenciones />} />
          <Route path="/facturas" element={<Placeholder title="Facturas" />} />
          <Route path="/reembolsos" element={<Placeholder title="Reembolsos" />} />
          <Route path="/disputas" element={<Placeholder title="Disputas" />} />
          <Route path="/reconciliaciones" element={<Placeholder title="Reconciliaciones" />} />
          <Route path="/auditoria" element={<Placeholder title="Auditoría" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
