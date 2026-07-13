// @ts-check
import { defineConfig } from 'astro/config';

// SiSi Wrocław — static marketing site, deployed to Netlify (publish: dist/)
export default defineConfig({
  site: 'https://sisiwroclaw.pl',
  // Localized routes are directory-style with a trailing slash; pin it so
  // canonical/hreflang/sitemap URLs all agree and avoid trailing-slash dupes.
  trailingSlash: 'always',
  // Inline component CSS into the HTML so the small stylesheets stop being
  // render-blocking network requests (improves FCP/LCP).
  build: {
    inlineStylesheets: 'always',
    // Keep emitted, content-addressed files aligned with the immutable
    // /assets/* response policy generated after each build.
    assets: 'assets',
  },
  // CSS handled by Lightning CSS instead of Vite's default esbuild. esbuild's
  // minifier collapsed our `backdrop-filter` + `-webkit-backdrop-filter` pairs
  // down to the `-webkit-` form only, which silently killed the nav / cookie /
  // mobile-menu glass blur in Firefox and standards-mode Chromium. Lightning CSS
  // auto-prefixes from `cssTarget`: the Safari/iOS 12 floor keeps
  // `-webkit-backdrop-filter` for older iOS (heavy mobile audience) while
  // emitting the standard `backdrop-filter` for every modern engine. Source CSS
  // now carries a single unprefixed declaration; the prefixing is the build's job.
  vite: {
    css: { transformer: 'lightningcss' },
    build: {
      // CSP permits one exact pre-paint bootstrap only. Everything Astro/Vite
      // processes must remain a same-origin file rather than inline code.
      assetsInlineLimit: 0,
      cssMinify: 'lightningcss',
      cssTarget: ['chrome79', 'firefox78', 'safari12', 'edge88', 'ios12'],
    },
  },
});
