import { defineConfig } from 'vite';

// WSL doesn't deliver file-change events for Windows drives (/mnt/*), so poll there.
const onWindowsMount = !!process.env.WSL_DISTRO_NAME && process.cwd().startsWith('/mnt/');

export default defineConfig({
  root: 'app',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Phaser is ~1.4 MB minified; it lives in the lazily loaded play chunk.
    chunkSizeWarningLimit: 1600,
  },
  server: {
    // Expose on the LAN so the mobile-first views can be tested from a phone.
    host: true,
    watch: onWindowsMount ? { usePolling: true, interval: 300 } : undefined,
  },
});
