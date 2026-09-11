import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { resolve } from 'node:path';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    root: resolve(process.cwd(), 'frontend'),
    base: '/urtc-registration/',
    publicDir: resolve(process.cwd(), 'public'),
    plugins: [react()],
    resolve: { alias: { '@': process.cwd() } },
    css: { postcss: { plugins: [tailwindcss()] } },
    define: {
      __URTC_PAGES__: 'true',
      __URTC_SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
      __URTC_SUPABASE_KEY__: JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
      ),
    },
    build: { outDir: resolve(process.cwd(), 'dist/pages'), emptyOutDir: true },
  };
});
