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
          // React core — cached aggressively, changes least often
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Stripe — only loaded on payment pages
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          // PDF/image generation — heavy, only used on barcode page
          'vendor-pdf': ['jspdf', 'html2canvas'],
          // Barcode/QR rendering
          'vendor-barcode': ['jsbarcode', 'qrcode'],
        },
      },
    },
    // Raise the warning threshold — our largest remaining chunk (vendor-pdf)
    // is expected to be ~400KB; suppress noise below 600KB
    chunkSizeWarningLimit: 600,
  },
});
