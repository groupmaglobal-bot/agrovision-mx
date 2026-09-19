// Smoke tests de AGROVISION_MX. Ejecuta: npm test
// En Windows: `npx playwright install chromium` la primera vez.
// Si ya tienes un Chromium local, puedes usar: set CHROMIUM_PATH=C:\ruta\chrome.exe
import { defineConfig } from '@playwright/test';

const exe = process.env.CHROMIUM_PATH;
export default defineConfig({
  testDir: 'tests',
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/agrovision-mx/',
    launchOptions: exe ? { executablePath: exe } : {},
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://localhost:4173/agrovision-mx/',
    reuseExistingServer: true,
  },
});
