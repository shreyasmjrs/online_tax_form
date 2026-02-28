import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/online_tax_form/",  // ← must match your GitHub repo name exactly
})
