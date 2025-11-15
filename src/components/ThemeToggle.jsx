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
        
        {/* --- ICONOS (Ahora son dos) --- */}

        {/* 1. Tu Luna Original (Ahora con clase específica) */}
        <svg
          className="theme-toggle__icon theme-toggle__icon-moon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>

        {/* 2. El nuevo ícono de Sol (de la misma familia) */}
        <svg
          className="theme-toggle__icon theme-toggle__icon-sun"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>

      </div>
    </button>
  );
}