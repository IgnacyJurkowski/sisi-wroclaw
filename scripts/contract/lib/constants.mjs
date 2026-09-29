// Constants shared by the contracts.

export const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';
export const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];
export const DEFAULT_LOCALE = 'pl';

/** Start of the robots directive an indexable page carries in production. */
export const INDEXABLE_MARK = 'index, follow';

/** External hosts a page may load its og:image from; unverifiable offline. */
export const EXTERNAL_IMAGE_HOSTS = ['framerusercontent.com'];

/** Redirect targets that are documented proxies or external, not dist pages. */
export const DOCUMENTED_EXTERNAL_TARGETS = {
  'https://eu.i.posthog.com': 'PostHog reverse proxy (netlify.toml, /ph/*), analytics rides the canonical origin',
};

/** Utility pages that are in dist on purpose and never belong in the sitemap. */
export const UTILITY_PAGES = new Set(['/404.html', '/']);
