/* Load a TypeScript module (and the relative TypeScript it imports) from plain
 * Node, with no flags and no build step.
 *
 * Node 22.12 (the version CI and Netlify pin) cannot import `.ts`. The venue
 * data is plain TypeScript with relative imports only, so this loader strips the
 * types with the `typescript` compiler that is already a devDependency, writes
 * the result as `.mjs` into a temp directory that mirrors the repo layout, and
 * imports it from there. `.mjs`/`.js` dependencies are copied unchanged.
 *
 * It is a loader for data and pure functions, not a bundler: no aliases, no
 * `import.meta.env`, no `.astro`.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

const CANDIDATES = ['', '.ts', '.mjs', '.js', '/index.ts', '/index.mjs'];

function resolveSpecifier(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  for (const suffix of CANDIDATES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && !candidate.endsWith(sep) && /\.(ts|mjs|js)$/.test(candidate)) return candidate;
  }
  throw new Error(`load-ts: cannot resolve "${specifier}" from ${fromFile}`);
}

const outputName = (file) => file.replace(/\.ts$/, '.mjs');

/**
 * @param {string} entry absolute path of a `.ts`, `.mjs` or `.js` file
 * @param {{ root: string }} options `root` is the repository root; every loaded file must sit under it
 * @returns {Promise<{ module: any, dir: string, cleanup: () => void }>}
 */
export async function loadTs(entry, { root }) {
  const outDir = mkdtempSync(join(tmpdir(), 'sisi-ts-'));
  const done = new Map();

  const outPathFor = (file) => {
    const rel = relative(root, file);
    if (rel.startsWith('..')) throw new Error(`load-ts: ${file} is outside ${root}`);
    return join(outDir, outputName(rel));
  };

  const emit = (file) => {
    if (done.has(file)) return done.get(file);
    const out = outPathFor(file);
    done.set(file, out);

    let code = readFileSync(file, 'utf8');
    if (file.endsWith('.ts')) {
      code = ts.transpileModule(code, {
        fileName: file,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          verbatimModuleSyntax: false,
          isolatedModules: true,
        },
      }).outputText;
    }

    // Rewrite relative specifiers using the compiler's own import scanner, so
    // an example import inside a comment is never touched.
    const imports = ts
      .preProcessFile(code, true, true)
      .importedFiles.filter((imported) => imported.fileName.startsWith('.'))
      .sort((a, b) => b.pos - a.pos);
    for (const imported of imports) {
      // `pos` points at the opening quote, so the specifier text starts one later.
      const from = imported.pos + 1;
      const to = from + imported.fileName.length;
      if (code.slice(from, to) !== imported.fileName) continue;
      const depOut = emit(resolveSpecifier(file, imported.fileName));
      let relSpec = relative(dirname(out), depOut).split(sep).join('/');
      if (!relSpec.startsWith('.')) relSpec = `./${relSpec}`;
      code = code.slice(0, from) + relSpec + code.slice(to);
    }

    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, code);
    return out;
  };

  const entryOut = emit(resolve(entry));
  const module = await import(pathToFileURL(entryOut).href);
  return { module, dir: outDir, cleanup: () => rmSync(outDir, { recursive: true, force: true }) };
}
