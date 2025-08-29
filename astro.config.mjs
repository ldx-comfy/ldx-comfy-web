// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import { astroI18nPlugin } from '@gudupao/astro-i18n';
// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
},

  integrations: [
    astroI18nPlugin({
      localesDir: './locales',
      fallbackLang: 'en',
      pathBasedRouting: false
    }),
    react()],
});