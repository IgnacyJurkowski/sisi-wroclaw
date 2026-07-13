import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  ['.woff2', 'font/woff2'],
  ['.mp4', 'video/mp4'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

export function parseHeaderRules(source) {
  const rules = [];
  let current;

  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    if (!current) throw new Error('Header pair appears before a path rule in dist/_headers.');

    const pair = line.trim();
    const separator = pair.indexOf(':');
    if (separator < 1) throw new Error(`Malformed header pair in dist/_headers: ${pair}`);
    current.headers[pair.slice(0, separator).trim()] = pair.slice(separator + 1).trim();
  }

  return rules;
}

export function headersForPath(rules, pathname) {
  const headers = {};
  for (const rule of rules) {
    if (headerPattern(rule.pattern).test(pathname)) Object.assign(headers, rule.headers);
  }
  return headers;
}

export function resolveRequestPath(distRoot, rawPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {
    throw badRequest();
  }
  if (!decoded.startsWith('/') || decoded.includes('\0')) throw badRequest();

  const portablePath = decoded.replaceAll('\\', '/');
  const candidate = resolve(distRoot, `.${portablePath}`);
  const root = resolve(distRoot);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) throw badRequest();
  return candidate;
}

export function contentType(file) {
  return MIME_TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream';
}

function headerPattern(pattern) {
  const expression = pattern.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${expression}$`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function badRequest() {
  return new Error('400 Bad Request: request path escapes dist or is malformed.');
}

function responsePath(distRoot, file) {
  return `/${relative(distRoot, file).split(sep).join('/')}`;
}

function findBuiltFile(candidate) {
  if (existsSync(candidate)) {
    const stat = statSync(candidate);
    if (stat.isFile()) return candidate;
    if (stat.isDirectory()) {
      const index = resolve(candidate, 'index.html');
      if (existsSync(index) && statSync(index).isFile()) return index;
    }
  }
  return undefined;
}

function validRange(rangeHeader, size) {
  if (!rangeHeader) return undefined;
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

function startServer() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dist = resolve(root, 'dist');
  const rules = parseHeaderRules(readFileSync(resolve(dist, '_headers'), 'utf8'));
  const rootRule = rules.find((rule) => rule.pattern === '/*');
  if (!rootRule) throw new Error('dist/_headers is missing the required root /* policy.');

  const rootHeaders = { ...rootRule.headers };
  const server = createServer((request, response) => {
    const rawPathname = (request.url ?? '/').split('?', 1)[0];
    const method = request.method ?? 'GET';

    if (!['GET', 'HEAD'].includes(method)) {
      response.writeHead(405, { ...rootHeaders, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(method === 'HEAD' ? undefined : 'Method Not Allowed');
      return;
    }

    if (rawPathname === '/') {
      response.writeHead(301, { ...rootHeaders, Location: '/pl/' });
      response.end();
      return;
    }

    let candidate;
    try {
      candidate = resolveRequestPath(dist, rawPathname);
    } catch {
      response.writeHead(400, { ...rootHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(method === 'HEAD' ? undefined : 'Bad Request');
      return;
    }

    let status = 200;
    let file = findBuiltFile(candidate);
    if (!file) {
      status = 404;
      file = resolve(dist, '404.html');
      if (!existsSync(file)) {
        response.writeHead(404, { ...rootHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(method === 'HEAD' ? undefined : 'Not Found');
        return;
      }
    }

    const fileStat = statSync(file);
    const headers = {
      ...headersForPath(rules, responsePath(dist, file)),
      'Content-Type': contentType(file),
      'Accept-Ranges': 'bytes',
    };
    const range = status === 200 ? validRange(request.headers.range, fileStat.size) : undefined;
    if (range === null) {
      response.writeHead(416, { ...headers, 'Content-Range': `bytes */${fileStat.size}`, 'Content-Length': '0' });
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
    if (method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(file, range ?? undefined).pipe(response);
  });

  const port = Number(process.env.PORT || 4321);
  server.listen(port, '127.0.0.1', () => {
    console.log(`Serving dist/ with generated root headers at http://127.0.0.1:${port}`);
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
