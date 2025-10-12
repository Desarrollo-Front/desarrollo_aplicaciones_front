import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Credenciales inválidas.');
        throw new Error('No se pudo iniciar sesión.');
      }

      const data = await res.json(); // { token, userId, email, name, role, type }
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
    <div className="login-container">
      <div className="login-box">
        <div className="login-head">
          <i className="ri-secure-payment-line login-brand-ico" />
          <h1 className="login-title">Bienvenido</h1>
          <p className="login-sub">Ingresá a tu cuenta para continuar</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="pl-field">
            <label htmlFor="email">Email</label>
            <div className="pl-input-wrapper">
              <i className="ri-mail-line pl-input-ico" />
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
          </div>

          <div className="pl-field">
            <label htmlFor="password">Contraseña</label>
            <div className="pl-input-wrapper">
              <i className="ri-lock-password-line pl-input-ico" />
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
                <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} />
              </button>
            </div>
          </div>

          {err && (
            <p className="login-alert" role="alert">
              {err}
            </p>
          )}

          <div className="login-actions">
            <button className="pl-btn pl-btn--primary pl-btn--xl" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
