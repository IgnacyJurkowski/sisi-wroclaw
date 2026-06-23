// @ts-check
import { defineConfig } from 'astro/config';

// SiSi Wrocław — static marketing site, deployed to Netlify (publish: dist/)
export default defineConfig({
  site: 'https://sisiwroclaw.pl',
  // Inline component CSS into the HTML so the small stylesheets stop being
  // render-blocking network requests (improves FCP/LCP).
  build: { inlineStylesheets: 'always' },
});
