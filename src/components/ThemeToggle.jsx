import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export function ThemeToggle({ className, ...props }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`theme-toggle ${className || ''} ${theme === 'dark' ? 'dark' : ''}`}
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    >
      <div className="theme-toggle__icon-wrapper">
        {/* El círculo que se expande se queda igual */}
        <div className="theme-toggle__circle"></div>
        
        {/* CAMBIO: Reemplazamos el <svg> por este <div>.
          Este div será el ícono que se transforma.
        */}
        <div className="theme-toggle__sun-moon"></div>

      </div>
    </button>
  );
}