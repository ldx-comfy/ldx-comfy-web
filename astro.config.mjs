// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import { astroI18nPlugin } from '@gudupao/astro-i18n';
import node from '@astrojs/node';
// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:1145',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'), // 將 /api 路徑轉發到後端
        },
      },
    }
  },

  integrations: [
    astroI18nPlugin({
      localesDir: './locales',
      fallbackLang: 'en',
      pathBasedRouting: false
    }),
    react()],
});