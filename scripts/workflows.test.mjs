import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const CHECKOUT_SHA = '34e114876b0b11c390a56381ad16ebd13914f8d5';
const SETUP_NODE_SHA = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const REQUIRED_TEST = 'npm run test:unit && npm run check && npm run build && npm run test:build';
const REQUIRED_HOOK = 'curl --fail-with-body --silent --show-error -X POST "$NETLIFY_DEPLOY_HOOK"';

async function workflow(name) {
  return readFile(`.github/workflows/${name}.yml`, 'utf8');
}

function netlifyRedirects(source) {
  return source
    .split(/(?=^\[\[redirects\]\]\s*$)/m)
    .filter((block) => /^\[\[redirects\]\]\s*$/m.test(block))
    .map((block) => Object.fromEntries(
      [...block.matchAll(/^\s*(from|to|status|force)\s*=\s*(?:"([^"]*)"|(\d+|true|false))\s*$/gm)]
        .map((match) => [match[1], match[2] ?? (match[3] === 'true' ? true : match[3] === 'false' ? false : Number(match[3]))]),
    ));
}

function assertNodeGate(source) {
  assert.match(source, new RegExp(`uses: actions/checkout@${CHECKOUT_SHA}\\b`));
  assert.match(source, new RegExp(`uses: actions/setup-node@${SETUP_NODE_SHA}\\b`));
  assert.match(source, /node-version:\s*['"]?22\.12\.0['"]?/);
  assert.match(source, /cache:\s*['"]?npm['"]?/);
  assert.match(source, /run:\s*npm ci\b/);
  assert.match(source, /run:\s*npm test\b/);
}

function assertFailClosedHook(source) {
  assert.match(source, /NETLIFY_DEPLOY_HOOK:\s*\$\{\{ secrets\.NETLIFY_DEPLOY_HOOK \}\}/);
  assert.ok(source.includes(REQUIRED_HOOK));
  assert.doesNotMatch(source, /run:[^\n]*secrets\.NETLIFY_DEPLOY_HOOK/);
}

test('package scripts expose the complete launch and exploit gates', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(pkg.scripts.test, REQUIRED_TEST);
  assert.equal(pkg.scripts['test:security'], 'node scripts/security-browser.mjs');
  assert.equal(pkg.scripts['verify:release'], 'npm test && npm run test:security');
  assert.equal(pkg.scripts['smoke:host'], 'node scripts/smoke-host.mjs');
  assert.equal(pkg.scripts['test:notices'], 'node scripts/site-notices-browser.mjs');
  assert.equal(pkg.scripts['test:build'], 'node scripts/check-build.mjs && npm run test:notices');
});

test('clean installs declare the Node build types used by Astro', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const tsconfig = JSON.parse(await readFile('tsconfig.json', 'utf8'));

  assert.match(pkg.devDependencies['@types/node'], /^\^22\./);
  assert.deepEqual(tsconfig.compilerOptions.types, ['node']);
});

test('Netlify production builds use the exact audited Node runtime', async () => {
  const source = await readFile('netlify.toml', 'utf8');
  assert.match(source, /^\s*NODE_VERSION\s*=\s*"22\.12\.0"\s*$/m);
  assert.doesNotMatch(source, /^\s*NODE_VERSION\s*=\s*"22"\s*$/m);
});

test('Netlify redirects both bare protocols directly to the final www host', async () => {
  const source = await readFile('netlify.toml', 'utf8');
  const redirects = netlifyRedirects(source);
  const expected = ['http:', 'https:'].map((protocol) => ({
    from: `${protocol}//sisiwroclaw.pl/*`,
    to: 'https://www.sisiwroclaw.pl/:splat',
    status: 301,
    force: true,
  }));

  assert.deepEqual(redirects.slice(0, 2), expected);
  assert.equal(redirects.filter(({ from }) => expected.some((rule) => rule.from === from)).length, 2);
  assert.equal(redirects.some(({ from }) => from?.startsWith('https://www.sisiwroclaw.pl')), false);
  assert.equal(redirects[2]?.from, '/');
});

test('CI publishes the exact Launch gate / test status on pushes and pull requests', async () => {
  const source = await workflow('ci');
  assert.match(source, /^name:\s*Launch gate\s*$/m);
  assert.match(source, /^\s{2}pull_request:\s*$/m);
  assert.match(source, /^\s{2}push:\s*$/m);
  assert.match(source, /^\s{2}test:\s*$/m);
  assert.match(source, /^\s{4}name:\s*Launch gate \/ test\s*$/m);
  assertNodeGate(source);
});

test('production deploy waits for the complete launch gate and fails closed', async () => {
  const source = await workflow('deploy');
  assert.match(source, /^\s{2}test:\s*$/m);
  assert.match(source, /^\s{4}name:\s*Deploy gate \/ test\s*$/m);
  assert.doesNotMatch(source, /^\s{4}name:\s*Launch gate \/ test\s*$/m);
  assertNodeGate(source);
  assert.match(source, /^\s{2}deploy:\s*$/m);
  assert.match(source, /^\s{4}needs:\s*test\s*$/m);
  assertFailClosedHook(source);
});

test('event sync uses the pinned runtime, complete gate, and fail-closed hook', async () => {
  const source = await workflow('sync-events');
  assert.match(source, /^\s{2}contents:\s*read\s*$/m);
  assert.doesNotMatch(source, /^\s{2}contents:\s*write\s*$/m);
  assert.match(source, /ssh-key:\s*\$\{\{ secrets\.EVENT_SYNC_DEPLOY_KEY \}\}/);
  assertNodeGate(source);
  assertFailClosedHook(source);

  const pullIndex = source.indexOf('git pull --rebase --autostash origin main');
  const postRebaseGateIndex = source.indexOf('npm test', pullIndex);
  const pushIndex = source.indexOf('git push', pullIndex);
  assert.ok(pullIndex >= 0 && pullIndex < postRebaseGateIndex && postRebaseGateIndex < pushIndex);
});

test('workflow dependencies are immutable and legacy launch settings stay absent', async () => {
  const sources = (await Promise.all(['ci', 'deploy', 'sync-events'].map(workflow))).join('\n');
  assert.doesNotMatch(sources, /uses:\s*actions\/(?:checkout|setup-node)@v\d+\b/);
  assert.doesNotMatch(sources, /node-version:\s*['"]?(?:20|22)['"]?\s*$/m);
  assert.doesNotMatch(sources, /curl\s+(?:-s|-fsS)\s+-X POST/);
});
