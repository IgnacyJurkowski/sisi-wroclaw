// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// SiSi Wrocław — static marketing site, deployed to Netlify (publish: dist/)
export default defineConfig({
  site: 'https://sisiwroclaw.pl',
  integrations: [react()],
});
