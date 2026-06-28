import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port:        5402,  // ScanCodeZW dedicated — do not use for other apps
    strictPort:  false, // allow auto-shift when port is taken (needed for netlify dev)
    host:        true,
    proxy: {
      '/api': {
        target: 'http://localhost:3042',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-stripe':   ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'vendor-pdf':      ['jspdf', 'html2canvas'],
          'vendor-barcode':  ['jsbarcode', 'qrcode'],
          'vendor-charts':   ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
