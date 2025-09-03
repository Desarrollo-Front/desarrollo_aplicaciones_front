import { NavLink } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  const items = [
    { to: "/pagos", label: "Pagos" },
    { to: "/intenciones", label: "Intenciones" },
    { to: "/facturas", label: "Facturas" },
    { to: "/disputas", label: "Disputas"},
    { to: "/reconciliaciones", label: "Reconciliaciones"},
    { to: "/auditoria", label: "Auditoría" },
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
      <ul className="nav-list">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <span className="label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      </div>
    </nav>
  );
}
