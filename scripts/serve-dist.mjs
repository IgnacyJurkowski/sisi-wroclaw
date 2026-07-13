import {
  constants,
  lstatSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { headersForPath, parseHeaderRules } from './generate-headers.mjs';

export { headersForPath, parseHeaderRules } from './generate-headers.mjs';

const DEFAULT_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

export function resolveRequestPath(distRoot, rawPathname) {
  const decoded = decodeRequestPath(rawPathname);
  const root = resolve(distRoot);
  const candidate = resolve(root, `.${decoded}`);
  if (!isWithin(root, candidate)) throw httpError(400, 'request path escapes dist');

  rejectExistingSymlinks(root, candidate);
  return candidate;
}

export function contentType(file) {
  return MIME_TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream';
}

export function createDistServer({
  dist = DEFAULT_DIST,
  openFile = open,
  onError = (error) => console.error('serve-dist request failed:', error.message),
} = {}) {
  const distRoot = resolve(dist);
  const distReal = realpathSync(distRoot);
  const rules = parseHeaderRules(readFileSync(join(distRoot, '_headers'), 'utf8'));
  const rootRule = rules.find((rule) => rule.pattern === '/*');
  if (!rootRule) throw new Error('dist/_headers is missing the required root /* policy.');
  const rootHeaders = { ...rootRule.headers };

  return createServer((request, response) => {
    void handleRequest({ request, response, distRoot, distReal, rules, rootHeaders, openFile })
      .catch((error) => {
        onError(error);
        if (response.headersSent) {
          response.destroy(error);
          return;
        }
        const status = [400, 403].includes(error.statusCode) ? error.statusCode : 500;
        const body = status === 400 ? 'Bad Request' : status === 403 ? 'Forbidden' : 'Internal Server Error';
        sendText(response, status, rootHeaders, body, request.method);
      });
  });
}

async function handleRequest({ request, response, distRoot, distReal, rules, rootHeaders, openFile }) {
  const rawPathname = (request.url ?? '/').split('?', 1)[0];
  const method = request.method ?? 'GET';

  if (!['GET', 'HEAD'].includes(method)) {
    sendText(response, 405, { ...rootHeaders, Allow: 'GET, HEAD' }, 'Method Not Allowed', method);
    return;
  }

  if (rawPathname === '/') {
    response.writeHead(301, { ...headersForPath(rules, '/'), Location: '/pl/' });
    response.end();
    return;
  }

  let requestPath;
  let candidate;
  try {
    candidate = resolveRequestPath(distRoot, rawPathname);
    requestPath = canonicalRequestPath(distRoot, candidate);
  } catch (error) {
    const status = error.statusCode === 403 ? 403 : 400;
    sendText(response, status, rootHeaders, status === 403 ? 'Forbidden' : 'Bad Request', method);
    return;
  }

  let status = 200;
  let file;
  try {
    file = await findBuiltFile(candidate, distReal);
  } catch (error) {
    if (error.statusCode !== 403) throw error;
    sendText(response, 403, rootHeaders, 'Forbidden', method);
    return;
  }

  if (!file) {
    status = 404;
    try {
      file = await findBuiltFile(join(distRoot, '404.html'), distReal);
    } catch (error) {
      if (error.statusCode !== 403) throw error;
      sendText(response, 500, rootHeaders, 'Internal Server Error', method);
      return;
    }
    if (!file) {
      sendText(response, 404, rootHeaders, 'Not Found', method);
      return;
    }
  }

  await serveFile({
    request,
    response,
    requestPath,
    status,
    file,
    distReal,
    rules,
    rootHeaders,
    openFile,
  });
}

async function serveFile({
  request,
  response,
  requestPath,
  status,
  file,
  distReal,
  rules,
  rootHeaders,
  openFile,
}) {
  let handle;
  try {
    handle = await openFile(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === 'ELOOP') throw httpError(403, 'final symlink is forbidden');
    throw error;
  }
  let handedToStream = false;

  try {
    const fileStat = await verifiedOpenedFileStat(handle, distReal);
    if (!fileStat.isFile()) throw httpError(403, 'opened response is not a regular file');

    let headers = {
      ...(status === 200 ? headersForPath(rules, requestPath) : rootHeaders),
      'Content-Type': contentType(file),
      'Accept-Ranges': 'bytes',
    };
    const range = status === 200 ? validRange(request.headers.range, fileStat.size) : undefined;
    if (range === null) {
      headers = {
        ...rootHeaders,
        'Content-Type': contentType(file),
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes */${fileStat.size}`,
        'Content-Length': '0',
      };
      response.writeHead(416, headers);
      response.end();
      return;
    }
    if (range) {
      status = 206;
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${fileStat.size}`;
      headers['Content-Length'] = String(range.end - range.start + 1);
    } else {
      headers['Content-Length'] = String(fileStat.size);
    }

    response.writeHead(status, headers);
    if ((request.method ?? 'GET') === 'HEAD') {
      response.end();
      return;
    }

    const stream = handle.createReadStream(range ? { ...range, autoClose: true } : { autoClose: true });
    handedToStream = true;
    stream.once('error', (error) => response.destroy(error));
    response.once('close', () => {
      if (!stream.destroyed) stream.destroy();
    });
    stream.pipe(response);
  } finally {
    if (!handedToStream) await handle.close();
  }
}

async function verifiedOpenedFileStat(handle, distReal) {
  let descriptorTarget;
  try {
    descriptorTarget = await realpath(`/proc/self/fd/${handle.fd}`);
  } catch {
    throw httpError(403, 'opened descriptor target cannot be verified');
  }
  if (!isWithin(distReal, descriptorTarget)) {
    throw httpError(403, 'opened descriptor target escapes dist');
  }

  const [handleStat, targetStat] = await Promise.all([
    handle.stat(),
    stat(descriptorTarget),
  ]);
  if (handleStat.dev !== targetStat.dev || handleStat.ino !== targetStat.ino) {
    throw httpError(403, 'opened descriptor identity changed');
  }
  return handleStat;
}

async function findBuiltFile(candidate, distReal) {
  const resolved = await containedRealPath(candidate, distReal);
  if (!resolved) return undefined;
  const candidateStat = await stat(resolved);
  if (candidateStat.isFile()) return resolved;
  if (!candidateStat.isDirectory()) return undefined;

  const index = await containedRealPath(join(resolved, 'index.html'), distReal);
  if (!index) return undefined;
  return (await stat(index)).isFile() ? index : undefined;
}

async function containedRealPath(candidate, distReal) {
  try {
    const resolved = await realpath(candidate);
    if (!isWithin(distReal, resolved)) throw httpError(403, 'resolved path escapes dist');
    return resolved;
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return undefined;
    throw error;
  }
}

function decodeRequestPath(rawPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {
    throw httpError(400, 'malformed request path');
  }
  if (!decoded.startsWith('/') || decoded.includes('\0')) throw httpError(400, 'malformed request path');
  return decoded.replaceAll('\\', '/');
}

function canonicalRequestPath(root, candidate) {
  const containedPath = relative(root, candidate).split(sep).join('/');
  return containedPath ? `/${containedPath}` : '/';
}

function rejectExistingSymlinks(root, candidate) {
  const parts = relative(root, candidate).split(sep).filter(Boolean);
  let current = root;

  for (const part of parts) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) throw httpError(403, 'symlink paths are forbidden');
    } catch (error) {
      if (error.statusCode === 403) throw error;
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return;
      throw error;
    }
  }
}

function isWithin(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

function validRange(rangeHeader, size) {
  if (!rangeHeader) return undefined;
  if (size === 0) return null;
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return null;

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    if (start >= size || end < start) return null;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function sendText(response, status, headers, body, method = 'GET') {
  const outputHeaders = {
    ...headers,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(body)),
  };
  response.writeHead(status, outputHeaders);
  response.end(method === 'HEAD' ? undefined : body);
}

function httpError(statusCode, message) {
  const reason = statusCode === 400 ? 'Bad Request' : statusCode === 403 ? 'Forbidden' : 'Error';
  return Object.assign(new Error(`${statusCode} ${reason}: ${message}`), { statusCode });
}

function startServer() {
  const server = createDistServer();
  const port = Number(process.env.PORT || 4321);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new Error(`Invalid PORT: ${process.env.PORT}`);

  server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    console.log(`Serving dist/ with generated root headers at http://127.0.0.1:${address.port}`);
  });

  const close = () => server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
