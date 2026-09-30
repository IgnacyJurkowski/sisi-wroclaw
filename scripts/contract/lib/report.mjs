// Result collector: PASS / FAIL / UNVERIFIED counters per contract and a
// printer that shows the first N failures with URL and field.

export const CONTRACTS = ['url', 'seo', 'links', 'blog', 'facts'];

export function createReport() {
  const results = [];
  const notes = new Map();
  const waiverHits = new Map();
  const api = {
    results,
    /** One assertion. `ok` false records a failure with url/field/message. */
    check(contract, ok, detail = {}) {
      results.push({ contract, status: ok ? 'pass' : 'fail', ...detail });
      return ok;
    },
    /** Record n passing assertions without materialising each. */
    pass(contract, n = 1) {
      for (let i = 0; i < n; i += 1) results.push({ contract, status: 'pass' });
    },
    fail(contract, detail) {
      results.push({ contract, status: 'fail', ...detail });
    },
    /** A check that could not run in this environment (never counts as fail). */
    unverified(contract, detail) {
      results.push({ contract, status: 'unverified', ...detail });
    },
    /** Non-failing observation (improvements, waived known issues, warnings). */
    note(contract, detail) {
      results.push({ contract, status: 'note', ...detail });
    },
    /** Free-form lines printed under the contract summary (e.g. the CTA table). */
    lines(contract, list) {
      notes.set(contract, [...(notes.get(contract) ?? []), ...list]);
    },
    /**
     * Turn failures that match a documented waiver into status "waived". A
     * waiver names a real, known defect: it stays visible in every run, it never
     * hides a failure that does not match, and one that matches nothing is
     * reported as stale so it gets deleted once the defect is fixed.
     */
    applyWaivers(waivers = []) {
      for (const waiver of waivers) {
        const url = waiver.urlRegex ? new RegExp(waiver.urlRegex) : null;
        const field = waiver.fieldRegex ? new RegExp(waiver.fieldRegex) : null;
        const message = waiver.messageRegex ? new RegExp(waiver.messageRegex) : null;
        let hits = 0;
        for (const r of results) {
          if (r.status !== 'fail' || r.contract !== waiver.contract) continue;
          if (url && !url.test(r.url ?? '')) continue;
          if (field && !field.test(r.field ?? '')) continue;
          if (message && !message.test(r.message ?? '')) continue;
          r.status = 'waived';
          r.waiver = waiver.id;
          hits += 1;
        }
        waiverHits.set(waiver.id, { waiver, hits });
      }
    },
    counts(contract) {
      const own = results.filter((r) => r.contract === contract);
      const n = (status) => own.filter((r) => r.status === status).length;
      return { pass: n('pass'), fail: n('fail'), unverified: n('unverified'), note: n('note'), waived: n('waived') };
    },
    failed() {
      return results.some((r) => r.status === 'fail');
    },
    print({ contracts, maxFailures = 15, log = console.log } = {}) {
      const selected = contracts ?? CONTRACTS.filter((c) => results.some((r) => r.contract === c));
      log('');
      log('=== Contract summary ===');
      for (const contract of selected) {
        const c = api.counts(contract);
        const verdict = c.fail ? 'FAIL' : 'PASS';
        log(`${verdict}  ${contract.padEnd(6)} pass ${c.pass}  fail ${c.fail}  waived ${c.waived}  unverified ${c.unverified}  notes ${c.note}`);
      }
      for (const contract of selected) {
        const own = results.filter((r) => r.contract === contract);
        const fails = own.filter((r) => r.status === 'fail');
        const unv = own.filter((r) => r.status === 'unverified');
        const notesOf = own.filter((r) => r.status === 'note');
        const extra = notes.get(contract) ?? [];
        if (!fails.length && !unv.length && !notesOf.length && !extra.length) continue;
        log('');
        log(`--- ${contract} ---`);
        for (const line of extra) log(line);
        for (const r of fails.slice(0, maxFailures)) log(`  FAIL ${fmt(r)}`);
        if (fails.length > maxFailures) log(`  ... ${fails.length - maxFailures} more failures (use --max-failures ${fails.length})`);
        for (const r of unv.slice(0, maxFailures)) log(`  UNVERIFIED ${fmt(r)}`);
        if (unv.length > maxFailures) log(`  ... ${unv.length - maxFailures} more unverified`);
        for (const r of notesOf.slice(0, maxFailures)) log(`  NOTE ${fmt(r)}`);
        if (notesOf.length > maxFailures) log(`  ... ${notesOf.length - maxFailures} more notes`);
      }
      const active = [...waiverHits.values()].filter(({ waiver }) => selected.includes(waiver.contract));
      if (active.length) {
        log('');
        log('--- known issues (waived, still real; see contract/waivers.json) ---');
        for (const { waiver, hits } of active) {
          log(hits ? `  WAIVED ${waiver.id} x${hits}: ${waiver.reason}` : `  STALE WAIVER ${waiver.id}: matched nothing, delete it from contract/waivers.json`);
        }
      }
      const total = api.failed();
      log('');
      log(total ? 'RESULT: FAIL' : 'RESULT: PASS');
    },
  };
  return api;
}

function fmt(r) {
  const where = [r.url, r.field].filter(Boolean).join(' ');
  return `${where ? `[${where}] ` : ''}${r.message ?? ''}`;
}
