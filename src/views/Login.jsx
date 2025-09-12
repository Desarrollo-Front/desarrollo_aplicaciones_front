import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
      const res = await fetch('http://18.191.118.13:8080/api/auth/login', {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-2">Ingresar</h1>
        <p className="text-gray-500 text-center mb-6">Accedé con tu cuenta para continuar</p>
        {err && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-center" role="alert">
            {err}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="tuemail@ejemplo.com"
              value={form.email}
              onChange={onChange}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                autoComplete="current-password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPass ? 'Ocultar' : 'Mostrar'}
              >
                {showPass ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M1 12s4-7 11-7c2.4 0 4.5.7 6.2 1.7" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M23 13s-4 7-11 7c-2.1 0-4-.5-5.6-1.3" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <button className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md shadow hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
