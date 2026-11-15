import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function readAndroidVersion(): {versionName: string; versionCode: number} {
  let versionName = process.env.ANDROID_VERSION_NAME?.trim() || '';
  let versionCodeRaw = process.env.ANDROID_VERSION_CODE?.trim() || '';

  try {
    const propsPath = path.resolve(__dirname, 'android/gradle.properties');
    if (fs.existsSync(propsPath)) {
      const content = fs.readFileSync(propsPath, 'utf8');
      if (!versionName) {
        const nameMatch = content.match(/^\s*VERSION_NAME\s*=\s*(.+)\s*$/m);
        if (nameMatch?.[1]) versionName = nameMatch[1].trim();
      }
      if (!versionCodeRaw) {
        const codeMatch = content.match(/^\s*VERSION_CODE\s*=\s*(\d+)\s*$/m);
        if (codeMatch?.[1]) versionCodeRaw = codeMatch[1].trim();
      }
    }
  } catch {
    // Fallback cleanly to defaults below
  }

  return {
    versionName: versionName || '1.0.0',
    versionCode: Number.parseInt(versionCodeRaw || '1', 10) || 1,
  };
}

export default defineConfig(() => {
  const {versionName, versionCode} = readAndroidVersion();

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(versionName),
      __APP_VERSION_CODE__: JSON.stringify(versionCode),
    },
    worker: {
      format: 'es' as const,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
