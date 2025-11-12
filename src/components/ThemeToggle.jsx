import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // Usamos el estado 'theme' para aplicar la clase 'dark' al botón,
  // lo que activará nuestras animaciones CSS.
  return (
    <button
      className={`theme-toggle ${theme === 'dark' ? 'dark' : ''}`}
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    >
      <div className="theme-toggle__icon-wrapper">
        {/* El círculo que pediste */}
        <div className="theme-toggle__circle"></div>
        
        {/* La luna (se transforma en sol) */}
        <svg
          className="theme-toggle__icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Este path es la luna, que se animará */}
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </div>
    </button>
  );
}