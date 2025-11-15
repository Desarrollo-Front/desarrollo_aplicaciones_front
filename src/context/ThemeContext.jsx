import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

// 1. Crear el contexto
const ThemeContext = createContext();

// 2. Crear el Proveedor del contexto
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    // 3. Leer el tema de localStorage o usar 'light' por defecto
    () => localStorage.getItem('theme') || 'light'
  );

  // 4. Efecto que se ejecuta cuando el tema cambia
  useEffect(() => {
    // Aplicar el tema al <html> (o document.body)
    document.documentElement.setAttribute('data-theme', theme);
    // Guardar la preferencia en localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 5. Función para cambiar el tema
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // 6. Valor que proveerá el contexto
  const value = useMemo(() => ({
    theme,
    toggleTheme,
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 7. Hook personalizado para consumir el contexto fácilmente
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};