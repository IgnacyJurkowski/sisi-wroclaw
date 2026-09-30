// Command-line parsing for `npm run contract`.

import { CONTRACTS } from './lib/report.mjs';

export const USAGE = `Usage: npm run contract -- [options]

Default flow: npm run build, then npm run contract. Serves dist/ with
scripts/serve-dist.mjs on a random local port and checks it.

Options:
  --dist <dir>              dist folder to check (default: ./dist)
  --only <list>             comma list of: ${CONTRACTS.join(', ')}
  --update-snapshot         rewrite the snapshots under contract/ from this dist, then check
  --source <text>           source label written into snapshots (default: local-build <branch>@<sha>)
  --offline                 skip every live network request (og:image hosts, reservation CTA HEAD)
  --build                   run "npm run build" first with CONTEXT=production URL=<canonical> (as Netlify does)
  --no-browser              skip the 375 px overflow check in the blog contract (reported UNVERIFIED)
  --keep-scratch            keep the scratch build folder of the blog contract
  --refresh-from-production rebuild contract/urls.json from https://www.sisiwroclaw.pl (GET sitemap, HEAD the rest)
  --max-failures <n>        failures printed per contract (default 15)
  --write-inventory         write contract/facts-inventory.json (also done by --update-snapshot)
  --json <file>             also write the raw results as JSON
  -h, --help                this text
`;

export function parseArgs(argv) {
  const opts = {
    dist: 'dist', only: null, updateSnapshot: false, offline: false, build: false, noBrowser: false,
    keepScratch: false, writeInventory: false, refreshFromProduction: false, maxFailures: 15, json: null, source: null, help: false,
  };
  const takeValue = (i, flag) => {
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--dist': opts.dist = takeValue(i, arg); i += 1; break;
      case '--only': opts.only = takeValue(i, arg).split(',').map((s) => s.trim()).filter(Boolean); i += 1; break;
      case '--update-snapshot': opts.updateSnapshot = true; break;
      case '--offline': opts.offline = true; break;
      case '--build': opts.build = true; break;
      case '--no-browser': opts.noBrowser = true; break;
      case '--write-inventory': opts.writeInventory = true; break;
      case '--keep-scratch': opts.keepScratch = true; break;
      case '--refresh-from-production': opts.refreshFromProduction = true; break;
      case '--max-failures': opts.maxFailures = Number(takeValue(i, arg)); i += 1; break;
      case '--json': opts.json = takeValue(i, arg); i += 1; break;
      case '--source': opts.source = takeValue(i, arg); i += 1; break;
      case '-h': case '--help': opts.help = true; break;
      default: throw new Error(`unknown option ${arg}`);
    }
  }
  if (opts.only) {
    const bad = opts.only.filter((name) => !CONTRACTS.includes(name));
    if (bad.length) throw new Error(`--only accepts ${CONTRACTS.join('|')}, got ${bad.join(',')}`);
  }
  if (!Number.isInteger(opts.maxFailures) || opts.maxFailures < 1) throw new Error('--max-failures needs a positive integer');
  return opts;
}
