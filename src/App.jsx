import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import PagosLista from "./views/Pagos-Lista";
const Placeholder = ({ title }) => <div style={{ padding: 24 }}>{title}</div>;
import "./App.css";


export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main className="app-main">
        <Routes>
          {/* redirige / a /pagos */}
          <Route path="/" element={<Navigate to="/pagos" replace />} />
          <Route path="/pagos" element={<PagosLista />} />
          <Route path="/detalle" element={<Placeholder title="Detalle de pago" />} />
          <Route path="/intenciones" element={<Placeholder title="Intenciones" />} />
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
