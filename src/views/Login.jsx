import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.email || !form.password) {
      setErr("Completá email y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Credenciales inválidas.");
        throw new Error("No se pudo iniciar sesión.");
      }

      const data = await res.json(); // { token, userId, email, name, role, type }
      localStorage.setItem("auth", JSON.stringify(data));
      localStorage.setItem("token", data.token);
      localStorage.setItem("tokenType", data.type);
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("email", data.email);
      localStorage.setItem("name", data.name);
      localStorage.setItem("role", data.role);
      localStorage.setItem("authHeader", `${data.type} ${data.token}`);

      navigate("/pagos");
    } catch (e2) {
      setErr(e2.message || "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pl-wrap login-wrap">
      <div className="login-head">
        <h1 className="pl-title login-title">Ingresar</h1>
        <p className="pl-sub login-sub">Accedé con tu cuenta para continuar</p>
      </div>

      <div className="pl-card login-card">
        {err && <div className="login-alert" role="alert">{err}</div>}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="pl-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="pl-input"
              placeholder="tuemail@ejemplo.com"
              value={form.email}
              onChange={onChange}
              autoComplete="email"
              required
            />
          </div>

          {/* Password con ojo dentro del input */}
          <div className="pl-field">
            <label htmlFor="password">Contraseña</label>
            <div className="pass-wrapper">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                className="pl-input"
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                autoComplete="current-password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPass ? "Ocultar" : "Mostrar"}
              >
                {showPass ? (
                  /* ojo tachado */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M1 12s4-7 11-7c2.4 0 4.5.7 6.2 1.7" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M23 13s-4 7-11 7c-2.1 0-4-.5-5.6-1.3" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                ) : (
                  /* ojo abierto */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="login-actions">
            <button className="pl-btn pl-btn--ver login-submit" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
