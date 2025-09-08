import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PagosLista from "./views/Pagos-Lista";
import PagosDetalle from "./views/Pagos-Detalle";
import Login from "./views/Login";
import Gateway from "./views/Gateway";

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
          <Route path="/pago/:id" element={<Gateway />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
