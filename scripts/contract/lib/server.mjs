// Serves a dist/ with the repo's own createDistServer on a random local port.

import { createDistServer } from '../../serve-dist.mjs';

export async function startServer(dist) {
  const server = createDistServer({ dist, onError: () => {} });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    port,
    /** HEAD (never redirects, never follows) -> { status, location }. */
    async head(path) {
      const res = await fetch(base + path, { method: 'HEAD', redirect: 'manual' });
      return { status: res.status, location: res.headers.get('location'), type: res.headers.get('content-type') };
    },
    async get(path) {
      const res = await fetch(base + path, { redirect: 'manual' });
      return { status: res.status, location: res.headers.get('location'), text: await res.text() };
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
