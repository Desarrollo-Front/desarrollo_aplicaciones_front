import { test, expect } from '@playwright/test';

test('flujo completo de login', async ({ page }) => {
  // Ir al login
  await page.goto('https://desarrollo-aplicaciones-front.vercel.app/login');

  // Completar formulario
  await page.fill('input[name="email"]', 'tutest@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Ingresar")');

  // Esperar a que la URL cambie a /pagos
  await page.waitForURL('**/pagos', { timeout: 20000 });

  // (Opcional) validar que la tabla de pagos cargue
  await expect(page.locator('table')).toBeVisible();
});
