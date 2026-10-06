import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Portas fixas: a 5173 padrão já é usada por outro projeto nesta máquina. strictPort faz o Vite
// falhar em vez de dividir a porta (no Windows, ::1 e 0.0.0.0 podem escutar na mesma porta).
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, strictPort: true },
  preview: { port: 4180, strictPort: true },
});
