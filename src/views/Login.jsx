import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // 👇 Traemos la URL del back desde el .env
  const API_URL = import.meta.env.VITE_API_URL;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.email || !form.password) {
      setErr('Completá email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      // 👇 usamos la variable de entorno
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Credenciales inválidas.');
        throw new Error('No se pudo iniciar sesión.');
      }

      const data = await res.json(); // { token, userId, email, name, role, type }

      // Guardamos la sesión en localStorage
      localStorage.setItem('auth', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      localStorage.setItem('tokenType', data.type);
      localStorage.setItem('userId', String(data.userId));
      localStorage.setItem('email', data.email);
      localStorage.setItem('name', data.name);
      localStorage.setItem('role', data.role);
      localStorage.setItem('authHeader', `${data.type} ${data.token}`);

      navigate('/pagos');
    } catch (e2) {
      setErr(e2.message || 'Error inesperado.');
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
        {err && (
          <div className="login-alert" role="alert">
            {err}
          </div>
        )}

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

          {/* Password con ojo */}
          <div className="pl-field">
            <label htmlFor="password">Contraseña</label>
            <div className="pass-wrapper">
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
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
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPass ? 'Ocultar' : 'Mostrar'}
              >
                {showPass ? (
                  // Ojo tachado
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    stroke="#3ba8e7"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 2l20 20" />
                    <path d="M10.58 10.58a3.5 3.5 0 0 0 4.95 4.95" />
                    <path d="M9.88 4.55a9.9 9.9 0 0 1 12.12 7.45 9.9 9.9 0 0 1-4.62 6.12" />
                    <path d="M6.17 6.17A9.9 9.9 0 0 0 2 12a9.9 9.9 0 0 0 5.17 6.83" />
                  </svg>
                ) : (
                  // Ojo abierto
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    stroke="#3ba8e7"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="login-actions">
            <button className="pl-btn pl-btn--ver login-submit" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
