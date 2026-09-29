// Contract suite entry point: `npm run contract`.
// See docs/sisi-elevate/CONTRACT.md for what each contract guards.

import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, USAGE } from './args.mjs';
import { CANONICAL_ORIGIN } from './lib/constants.mjs';
import { loadDist } from './lib/dist.mjs';
import { CONTRACTS, createReport } from './lib/report.mjs';
import { startServer } from './lib/server.mjs';
import { fetchProductionSnapshot } from './lib/production.mjs';
import { legacyRules, loadRedirects, runUrlContract } from './contracts/url.mjs';
import { runSeoContract } from './contracts/seo.mjs';
import { runLinksContract } from './contracts/links.mjs';
import { runBlogContract } from './contracts/blog.mjs';
import { runFactsContract } from './contracts/facts.mjs';
import { readSnapshot, writeSnapshot } from './lib/snapshot.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACT_DIR = join(REPO_ROOT, 'contract');

function gitLabel() {
  try {
    const git = (args) => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return `${git(['rev-parse', '--abbrev-ref', 'HEAD'])}@${git(['rev-parse', '--short', 'HEAD'])}`;
  } catch {
    return 'unknown-revision';
  }
}

function buildProduction() {
  console.log('Building with CONTEXT=production (as Netlify does) ...');
  const res = spawnSync('npm', ['run', 'build'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, CONTEXT: 'production', URL: CANONICAL_ORIGIN },
  });
  if (res.status !== 0) throw new Error('npm run build failed');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  const started = Date.now();
  const selected = opts.only ?? CONTRACTS;
  const report = createReport();
  const source = opts.source ?? `local-build ${gitLabel()}`;

  if (opts.refreshFromProduction) {
    const rules = loadRedirects(REPO_ROOT);
    const previous = readSnapshot(CONTRACT_DIR, 'urls.json') ?? {};
    const fresh = await fetchProductionSnapshot({ legacyPaths: legacyRules(rules).map((r) => r.from) });
    writeSnapshot(CONTRACT_DIR, 'urls.json', { ...fresh, nonIndexable: previous.nonIndexable ?? [] });
    console.log(`Wrote contract/urls.json from production (${Object.keys(fresh.urls).length} URLs).`);
    return 0;
  }

  if (opts.build) buildProduction();

  const distDir = resolve(REPO_ROOT, opts.dist);
  const needsDist = selected.some((name) => name !== 'blog');
  let model = null;
  let server = null;
  const ctx = { report, opts, repoRoot: REPO_ROOT, contractDir: CONTRACT_DIR, source };
  try {
    if (needsDist) {
      model = loadDist(distDir);
      server = await startServer(distDir);
      ctx.model = model;
      ctx.server = server;
      ctx.rules = loadRedirects(REPO_ROOT);
      console.log(`Checking ${distDir}: ${model.pages.size} pages, ${model.sitemap.length} sitemap URLs, build context ${model.buildContext}, server ${server.base}`);
    }
    const runners = { url: runUrlContract, seo: runSeoContract, links: runLinksContract, blog: runBlogContract, facts: runFactsContract };
    for (const name of CONTRACTS) {
      if (!selected.includes(name)) continue;
      const t0 = Date.now();
      try {
        await runners[name](ctx);
      } catch (error) {
        report.fail(name, { message: `contract crashed: ${error.stack ?? error.message}` });
      }
      console.log(`  ${name} contract finished in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  } finally {
    await server?.close();
  }

  report.applyWaivers(readSnapshot(CONTRACT_DIR, 'waivers.json')?.waivers ?? []);
  report.print({ contracts: CONTRACTS.filter((name) => selected.includes(name)), maxFailures: opts.maxFailures });
  console.log(`Elapsed ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (opts.json) writeFileSync(opts.json, `${JSON.stringify(report.results, null, 2)}\n`);
  return report.failed() ? 1 : 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (error) => {
    console.error(`contract: ${error.message}`);
    process.exitCode = 2;
  },
);
