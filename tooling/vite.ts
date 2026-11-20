import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export function projectConfig(port = 5173) {
  return defineConfig({
    plugins: [react()],
    base: './',
    server: { host: '127.0.0.1', port, strictPort: true },
    preview: { host: '127.0.0.1', port: port + 1000, strictPort: true },
    build: { target: 'es2022' },
  });
}
