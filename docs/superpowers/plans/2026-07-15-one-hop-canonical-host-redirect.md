# One-Hop Canonical Host Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirect both bare-domain protocols directly to the matching final `https://www.sisiwroclaw.pl` URL in one permanent hop.

**Architecture:** Keep redirect behavior in Netlify's versioned rules engine. Add two forced, protocol-specific domain rules before all path rules and protect their values and order with a focused configuration regression test.

**Tech Stack:** Netlify configuration, Node.js 22.12.0 test runner, GitHub Actions, curl.

## Global Constraints

- Add no public text, metadata copy, public element, image, event, hours, structured-data fact, or placeholder.
- The final canonical origin remains exactly `https://www.sisiwroclaw.pl`.
- Preserve every path with `:splat` and every query string through Netlify's documented 301 behavior.
- Direct `www` requests must remain untouched.
- Domain rules must precede existing path redirects.
- Preserve `.claude/worktrees/b2b/` and unrelated untracked files.
- Use Node `22.12.0` for focused and full verification.
- Publish through an exact-SHA validation branch before fast-forwarding `main`.

---

### Task 1: Test-drive the protocol-specific domain redirects

**Files:**
- Modify: `scripts/workflows.test.mjs`
- Modify: `netlify.toml`

**Interfaces:**
- Consumes: Netlify `[[redirects]]` tables in source order.
- Produces: forced `301` rules from both bare protocols to `https://www.sisiwroclaw.pl/:splat`.

- [ ] **Step 1: Write the failing configuration test**

Add this helper after `workflow` in `scripts/workflows.test.mjs`:

```js
function netlifyRedirects(source) {
  return source
    .split(/(?=^\[\[redirects\]\]\s*$)/m)
    .filter((block) => /^\[\[redirects\]\]\s*$/m.test(block))
    .map((block) => Object.fromEntries(
      [...block.matchAll(/^\s*(from|to|status|force)\s*=\s*(?:"([^"]*)"|(\d+|true|false))\s*$/gm)]
        .map((match) => [match[1], match[2] ?? (match[3] === 'true' ? true : match[3] === 'false' ? false : Number(match[3]))]),
    ));
}
```

Add this test immediately after `Netlify production builds use the exact audited Node runtime`:

```js
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
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```bash
npx --yes node@22.12.0 --test scripts/workflows.test.mjs
```

Expected: exit non-zero; the new test reports that the first two redirects are the existing root and legacy path rules instead of the required domain rules.

- [ ] **Step 3: Add the minimal Netlify rules**

Insert this block immediately after `[build.environment]` and before the existing root redirect in `netlify.toml`:

```toml
# Bare host -> final www host in one hop for both protocols.
[[redirects]]
  from = "http://sisiwroclaw.pl/*"
  to = "https://www.sisiwroclaw.pl/:splat"
  status = 301
  force = true

[[redirects]]
  from = "https://sisiwroclaw.pl/*"
  to = "https://www.sisiwroclaw.pl/:splat"
  status = 301
  force = true
```

- [ ] **Step 4: Run the focused test and verify green**

Run:

```bash
npx --yes node@22.12.0 --test scripts/workflows.test.mjs
```

Expected: exit `0`; all workflow/configuration tests pass.

- [ ] **Step 5: Run the build assertions**

Run:

```bash
npx --yes node@22.12.0 /usr/bin/npm run build:check
```

Expected: exit `0`; every rendered-build assertion passes.

- [ ] **Step 6: Commit the redirect fix**

```bash
git add scripts/workflows.test.mjs netlify.toml
git commit -m "fix(seo): redirect bare host to www in one hop"
```

### Task 2: Verify, publish, and prove the production redirect contract

**Files:**
- Verify only: `scripts/workflows.test.mjs`, `netlify.toml`

**Interfaces:**
- Consumes: Task 1's two ordered domain rules.
- Produces: a protected `main` SHA and live one-hop redirects for both bare protocols.

- [ ] **Step 1: Run the complete release gate**

Run:

```bash
npx --yes node@22.12.0 /usr/bin/npm run verify:release
```

Expected: exit `0`; unit, Astro, rendered-build, and browser-security checks pass.

- [ ] **Step 2: Review the exact scope**

Run:

```bash
git diff origin/main...HEAD --check
git diff origin/main...HEAD --stat
git status --short --branch --untracked-files=all
```

Expected: only the design/plan documentation, `scripts/workflows.test.mjs`, and `netlify.toml` differ; the worktree is otherwise clean.

- [ ] **Step 3: Rebase if `main` advanced and rerun the gate after any changed SHA**

Run:

```bash
git fetch origin main
git rebase origin/main
```

If rebase changes `HEAD`, rerun:

```bash
npx --yes node@22.12.0 /usr/bin/npm run verify:release
```

- [ ] **Step 4: Push the validation branch and wait for its exact-SHA Launch gate**

```bash
git push -u origin HEAD:refs/heads/agent/one-hop-host-redirect
sha="$(git rev-parse HEAD)"
run_id=''
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  run_id="$(gh run list --branch agent/one-hop-host-redirect --workflow "Launch gate" --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$sha\") | .databaseId" | head -n 1)"
  if [ -n "$run_id" ]; then break; fi
  sleep 3
done
test -n "$run_id"
gh run watch "$run_id" --exit-status
```

Expected: the exact-SHA `Launch gate / test` succeeds.

- [ ] **Step 5: Confirm ancestry and push the validated SHA to main**

```bash
git fetch origin main
test "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)"
git push origin HEAD:main
git push origin --delete agent/one-hop-host-redirect
git fetch origin main
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
```

Expected: `main` equals the exact validated SHA and the temporary branch is deleted.

- [ ] **Step 6: Wait for both main workflows**

```bash
sha="$(git rev-parse HEAD)"
for workflow in "Launch gate" "Deploy to Netlify"; do
  run_id=''
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    run_id="$(gh run list --commit "$sha" --workflow "$workflow" --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$sha\") | .databaseId" | head -n 1)"
    if [ -n "$run_id" ]; then break; fi
    sleep 3
  done
  test -n "$run_id"
  gh run watch "$run_id" --exit-status
done
```

Expected: both workflows exit `0`, including the deploy gate and Netlify production-build trigger.

- [ ] **Step 7: Wait for the deployed rule and verify both protocols**

Probe every 20 seconds for at most 15 attempts until this command returns the expected direct location:

```bash
curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{redirect_url}\n' 'http://sisiwroclaw.pl/pl/?utm_source=redirect-test'
```

Expected:

```text
301 https://www.sisiwroclaw.pl/pl/?utm_source=redirect-test
```

Then run:

```bash
curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://sisiwroclaw.pl/pl/?utm_source=redirect-test'
curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://www.sisiwroclaw.pl/pl/'
```

Expected:

```text
301 https://www.sisiwroclaw.pl/pl/?utm_source=redirect-test
200 
```

- [ ] **Step 8: Re-run live indexing acceptance and the complete host smoke**

```bash
html="$(curl -sS --max-time 20 https://www.sisiwroclaw.pl/pl/)"
printf '%s' "$html" | rg -o 'rel="canonical" href="https://www\.sisiwroclaw\.pl/pl/"'
if printf '%s' "$html" | rg -n '<meta name="robots"'; then exit 1; fi
npx --yes node@22.12.0 scripts/smoke-host.mjs https://www.sisiwroclaw.pl none
```

Expected: the canonical is final, the robots tag is absent, and the smoke summary reports `"ok": true`.
