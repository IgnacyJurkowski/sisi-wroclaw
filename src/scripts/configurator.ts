/* Event configurator: adapts the steps to the chosen venue, keeps the live
   estimate, the notices and the summary in sync, and fills the hidden
   configuration fields. Submission, validation and the success/error states
   are handled by the shared enquiry-form script (data-event-enquiry-form).

   Everything printed comes from the DOM and data-strings: SiSi prices from
   data-price on each pick row (read from the menu data at build), The Cork
   packages and rules from src/data/cork-configurator.mjs, venue limits from
   VENUE_FACTS. It never invents a number. */
import {
  capacityNotice, corkBaseHours, corkEstimate, decorTablesCost, estimate, formatMinutes, formatZl, recommendSpace, sisiNightFee, toMinutes,
} from '../lib/configurator-estimate.mjs';

type Strings = {
  capacity: { seated: string; standing: string; min: string; corkExclusive: string };
  limits: { minGuests: number; seatedTheCork: number; standingR32: number };
  cork: {
    minGuests: number;
    exclusiveFrom: number;
    baseHours: { minGuests: number; hours: number | null }[];
    startWindows: Record<string, [string, string]>;
    close: string;
    extensions: { key: string; hours: number; surcharge: number }[];
    rules: { childShare: number; serviceFee: number; depositShare: number };
  };
  duration: { base: string; hours: string; individual: string; extensionAuto: string; tooLong: string; closing: string; none: string; plus1: string; plus2: string };
  durationPl: { none: string; plus1: string; plus2: string };
  corkClosing: string;
  details: { plan: string; planCork: string; planSisi: string; corkWindow: string; corkWindowFix: string; extensionSave: string; nightFee: { friday: string; saturday: string } };
  recommend: { heading: string; note: string; proposal: string; reasons: Record<string, string> };
  spaceTitles: Record<string, string>;
  spaceTitlesPl: Record<string, string>;
  nightFees: Record<number, number>;
  eveningFrom: string;
  decorSeats: number;
  perTable: string;
  durations: number[];
  time: { other: string };
  summary: { toBeAgreed: string; none: string; guestsUnit: string };
  estimate: { guests: string; adults: string; extension: string; perGuest: string };
  units: { perGuest: string; bottle: string; portion: string };
  chosen: string;
  hints: { occasion: string; space: string; details: string; menu: string; summary: string };
};

const OTHER_TIME = 'inna';
const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
const toMin = (value: string | undefined): number | null => toMinutes(value);
const fmtMin = (m: number) => formatMinutes(m);

function initConfigurator(form: HTMLFormElement): void {
  const strings = JSON.parse(form.getAttribute('data-strings') || '{}') as Strings;
  const q = <T extends Element>(selector: string) => form.querySelector<T>(selector);
  const qa = <T extends Element>(selector: string) => Array.from(form.querySelectorAll<T>(selector));
  const text = (selector: string, value: string) => {
    const el = q<HTMLElement>(selector);
    if (el) el.textContent = value;
  };
  const show = (el: HTMLElement | null, on: boolean) => {
    if (el) el.hidden = !on;
  };
  const checkedRadio = (name: string) => q<HTMLInputElement>(`input[name="${name}"]:checked`);
  const num = (name: string) => Math.max(0, parseInt(q<HTMLInputElement>(`[name="${name}"]`)?.value || '0', 10) || 0);
  const labelOf = (input: HTMLInputElement | null, fallback: string) => input?.getAttribute('data-label') || fallback;

  const timeSelect = q<HTMLSelectElement>('[data-cfg-time]');
  const extensionField = q<HTMLInputElement>('[data-field-extension]');
  const mapRegions = qa<SVGGElement>('[data-map-space]');
  const corkOnly = qa<HTMLElement>('[data-cork-only]');
  const tabs = qa<HTMLButtonElement>('[data-cfg-tab]');
  const panels = qa<HTMLElement>('[data-cfg-panel]');
  const premium = q<HTMLInputElement>('[data-cork-premium]');
  const cakeOptions = q<HTMLElement>('[data-cake-options]');
  const hidden = {
    drinks: q<HTMLInputElement>('[data-field-drinks]'),
    food: q<HTMLInputElement>('[data-field-food]'),
    corkDishes: q<HTMLInputElement>('[data-field-cork-dishes]'),
    estimate: q<HTMLInputElement>('[data-field-estimate]'),
  };
  const body = q<HTMLElement>('[data-cfg-body]');
  const calcBar = {
    root: q<HTMLElement>('[data-cfg-bar]'),
    line: q<HTMLElement>('[data-bar-line]'),
    hint: q<HTMLElement>('[data-bar-hint]'),
    total: q<HTMLElement>('[data-bar-total]'),
    per: q<HTMLElement>('[data-bar-per]'),
    back: q<HTMLButtonElement>('[data-wizard-back]'),
    next: q<HTMLButtonElement>('[data-wizard-next]'),
  };

  /* --- dish lists fold behind a toggle so the menu step stays short ------- */
  qa<HTMLButtonElement>('[data-dish-toggle]').forEach((toggle) => {
    const list = toggle.parentElement?.querySelector<HTMLElement>('[data-dish-list]');
    if (!list) return;
    toggle.addEventListener('click', () => {
      const open = list.hidden;
      list.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.firstChild!.textContent = toggle.getAttribute(open ? 'data-label-close' : 'data-label-open') || '';
    });
  });

  /* --- package radios can be switched off again (no "à la carte" option) --- */
  qa<HTMLInputElement>('input[type="radio"][data-toggle]').forEach((radio) => {
    radio.addEventListener('pointerdown', () => { radio.dataset.wasChecked = radio.checked ? 'true' : 'false'; });
    radio.addEventListener('click', () => {
      if (radio.dataset.wasChecked !== 'true') return;
      radio.checked = false;
      radio.dataset.wasChecked = 'false';
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  /* --- cake size follows the guest count until the visitor picks one ------ */
  let cakeSizeTouched = false;
  qa<HTMLInputElement>('input[name="cake_size"]').forEach((input) => input.addEventListener('change', () => { cakeSizeTouched = true; }));
  const CAKE_SIZE_FOR = [[12, 'd16'], [15, 'd17'], [18, 'd18'], [23, 'd20'], [25, 'd21']] as const;
  function suggestCakeSize(adults: number, wanted: boolean): void {
    const note = q<HTMLElement>('[data-cake-auto]');
    if (!wanted || cakeSizeTouched || adults <= 0) {
      show(note, false);
      return;
    }
    const key = CAKE_SIZE_FOR.find(([max]) => adults <= max)?.[1] || 'tiered';
    const radio = q<HTMLInputElement>(`input[name="cake_size"][data-key="${key}"]`);
    if (radio && !radio.checked) radio.checked = true;
    show(note, true);
  }

  /* --- venue mode --------------------------------------------------------- */
  const spaceKey = () => checkedRadio('space')?.getAttribute('data-key') || '';
  // Planned hours: start + the chosen length (may run past midnight).
  const startMin = () => toMin(timeSelect?.value);
  const durationHours = () => Number(checkedRadio('duration')?.getAttribute('data-hours') || 0);
  const endMin = (): number | null => {
    const start = startMin();
    const hours = durationHours();
    return start === null || !hours ? null : start + hours * 60;
  };
  const closeMin = toMin(strings.cork.close) ?? 22 * 60;
  const eveningMin = toMin(strings.eveningFrom) ?? 19 * 60;
  const isoDate = () => q<HTMLInputElement>('[name="preferred_date_iso"]')?.value.slice(0, 10) || '';
  /** The space the details point to (only the verified capacities and hours). */
  const recommendation = () =>
    recommendSpace(
      { guests: num('guests'), seating: (checkedRadio('seating')?.getAttribute('data-key') || '') as 'seated' | 'standing' | 'mixed' | '', startMin: startMin(), endMin: endMin() },
      { seatedTheCork: strings.limits.seatedTheCork, standingR32: strings.limits.standingR32, closeMin, eveningFromMin: eveningMin },
    );
  /** The venue the rest of the flow prices: the chosen one, else the proposal. */
  const effectiveSpace = (): 'sisi' | 'cork' | 'r32' => {
    const chosen = spaceKey();
    if (chosen === 'sisi' || chosen === 'cork' || chosen === 'r32') return chosen;
    return recommendation()?.key ?? 'r32';
  };
  const corkActive = () => effectiveSpace() !== 'sisi';
  // A dinner at The Cork that runs past closing continues at SiSi.
  const afterClose = () => effectiveSpace() === 'cork' && (endMin() ?? 0) > closeMin;
  const sisiActive = () => effectiveSpace() !== 'cork' || afterClose();

  /* --- clickable plan: each venue region selects its radio --------------- */
  mapRegions.forEach((region) => {
    const choose = () => {
      const radio = q<HTMLInputElement>(`input[name="space"][data-key="${region.getAttribute('data-map-space')}"]`);
      if (!radio || radio.checked) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    };
    region.addEventListener('click', choose);
    region.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      choose();
    });
  });

  /* --- quantity controls (SiSi picks) ------------------------------------- */
  qa<HTMLElement>('[data-pick]').forEach((row) => {
    const input = row.querySelector<HTMLInputElement>('[data-qty]');
    if (!input) return;
    row.querySelectorAll<HTMLButtonElement>('[data-qty-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.getAttribute('data-qty-step') || '0', 10);
        input.value = String(Math.min(999, Math.max(0, (parseInt(input.value, 10) || 0) + step)));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    input.addEventListener('blur', () => {
      const n = parseInt(input.value, 10);
      input.value = String(Number.isNaN(n) ? 0 : Math.min(999, Math.max(0, n)));
    });
  });

  type Line = { row: HTMLElement; qty: number; kind: 'perGuest' | 'unit'; group: 'drinks' | 'food'; price: number };
  const sisiLines = (): Line[] =>
    qa<HTMLElement>('[data-pick]').map((row) => {
      const qty = Math.max(0, parseInt(row.querySelector<HTMLInputElement>('[data-qty]')?.value || '0', 10) || 0);
      row.classList.toggle('is-picked', qty > 0);
      return {
        row,
        qty,
        kind: (row.getAttribute('data-kind') === 'perGuest' ? 'perGuest' : 'unit') as 'perGuest' | 'unit',
        group: (row.getAttribute('data-group') === 'food' ? 'food' : 'drinks') as 'drinks' | 'food',
        price: Number(row.getAttribute('data-price')) || 0,
      };
    });
  const describe = (picked: Line[], pl: boolean) =>
    picked
      .map(({ row, qty }) => `${qty} × ${row.getAttribute(pl ? 'data-name-pl' : 'data-name') || ''} (${row.getAttribute(pl ? 'data-unit-pl' : 'data-unit') || ''})`)
      .join(', ');

  /* --- menu tabs (only the chosen venue's tabs stay visible) -------------- */
  function selectTab(key: string, focus = false): void {
    tabs.forEach((tab) => {
      const on = tab.getAttribute('data-cfg-tab') === key;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.getAttribute('data-cfg-panel') !== key;
    });
  }
  const visibleTabs = () => tabs.filter((tab) => !tab.hidden);
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.getAttribute('data-cfg-tab') || ''));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const list = visibleTabs();
      const index = list.indexOf(tab);
      const next = list[(index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
      selectTab(next.getAttribute('data-cfg-tab') || '', true);
    });
  });
  function syncTabs(): void {
    const cork = corkActive();
    const sisi = sisiActive();
    tabs.forEach((tab) => {
      const venue = tab.getAttribute('data-venue');
      tab.hidden = (venue === 'cork' && !cork) || (venue === 'sisi' && !sisi);
    });
    const selected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    if (!selected || selected.hidden) {
      const first = visibleTabs()[0];
      if (first) selectTab(first.getAttribute('data-cfg-tab') || '');
    }
  }

  /* --- start-time options: one plain list (12:00-23:30); The Cork's weekday
         window is explained with a one-click fix instead of hidden ----------- */
  let timeOptionsBuilt = false;
  function syncTimeOptions(): void {
    if (!timeSelect || timeOptionsBuilt) return;
    timeOptionsBuilt = true;
    const current = timeSelect.value;
    const slots: string[] = [];
    for (let m = 12 * 60; m <= 23 * 60 + 30; m += 30) slots.push(fmtMin(m));
    timeSelect.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '—';
    timeSelect.appendChild(blank);
    slots.forEach((slot) => {
      const option = document.createElement('option');
      option.value = slot;
      option.textContent = slot;
      timeSelect.appendChild(option);
    });
    const other = document.createElement('option');
    other.value = OTHER_TIME;
    other.textContent = strings.time.other;
    timeSelect.appendChild(other);
    timeSelect.value = Array.from(timeSelect.options).some((o) => o.value === current) ? current : '';
  }
  /* --- The Cork dish picks choose the package: the first pick selects the
         smallest package, one pick too many steps up to the next size, and a
         pick beyond the largest package is refused. Choosing a smaller package
         drops the surplus picks. ------------------------------------------- */
  const packagesOf = (course: string) => qa<HTMLInputElement>(`input[name="cork_${course}"]`);
  const dishesOf = (course: string) => qa<HTMLInputElement>(`[data-cork-dish][data-course="${course}"]`);
  qa<HTMLInputElement>('[data-cork-dish]').forEach((box) => {
    box.addEventListener('change', () => {
      if (!box.checked) return;
      const course = box.getAttribute('data-course') || '';
      const chosen = dishesOf(course).filter((b) => b.checked).length;
      const fitting = packagesOf(course).find((pkg) => Number(pkg.getAttribute('data-size')) >= chosen);
      if (!fitting) { box.checked = false; return; }
      if (!fitting.checked) fitting.checked = true;
    });
  });
  qa<HTMLInputElement>('[data-cork-course] input[type="radio"]').forEach((pkg) => {
    pkg.addEventListener('change', () => {
      if (!pkg.checked) return;
      const size = Number(pkg.getAttribute('data-size'));
      dishesOf(pkg.name.replace('cork_', '')).filter((b) => b.checked).slice(size).forEach((b) => { b.checked = false; });
    });
  });
  function syncCourses(): string[] {
    const lines: string[] = [];
    qa<HTMLElement>('[data-cork-course]').forEach((card) => {
      const course = card.getAttribute('data-cork-course') || '';
      const pkg = checkedRadio(`cork_${course}`);
      const packages = packagesOf(course);
      const size = Number((pkg ?? packages[0])?.getAttribute('data-size') || 0);
      const boxes = dishesOf(course);
      const chosen = boxes.filter((b) => b.checked);
      const counter = card.querySelector<HTMLElement>('[data-cork-chosen]');
      if (counter) counter.textContent = fill(strings.chosen, { n: chosen.length, size });
      const names = chosen.map((b) => b.getAttribute('data-dish') || '');
      if (pkg) lines.push(`${labelOf(pkg, '')}${names.length ? `: ${names.join(', ')}` : ''}`);
    });
    return lines;
  }

  /* --- one-click starting menu, then everything stays editable ------------ */
  const setRadio = (name: string, key: string) => {
    const radio = q<HTMLInputElement>(`input[name="${name}"][data-key="${key}"]`);
    if (radio) radio.checked = true;
  };
  const setQty = (id: string, qty: number) => {
    const input = q<HTMLInputElement>(`[data-pick][data-id="${id}"] [data-qty]`);
    if (input) input.value = String(qty);
  };
  let extHoursNow = 0; // derived in update() from the end time
  const includedHours = () => {
    const base = corkBaseHours(num('guests'), strings.cork.baseHours);
    return base === null ? null : base + extHoursNow;
  };
  /** The shortest wine / open-bar package that covers the included time (+extension). */
  const packageForHours = (name: string) => {
    const hours = includedHours();
    if (hours === null) return null;
    const options = qa<HTMLInputElement>(`input[name="${name}"][data-hours]`);
    return options.find((o) => Number(o.getAttribute('data-hours')) >= hours) ?? options[options.length - 1] ?? null;
  };
  function proposeMenu(): void {
    const occasion = checkedRadio('occasion')?.getAttribute('data-key') || '';
    const festive = occasion === 'birthday' || occasion === 'anniversary';
    const start = startMin();
    const dinnerTime = start === null || start < closeMin - 60;
    if (corkActive() && dinnerTime) {
      // A sharing dinner: starters + mains for everyone; desserts on a celebration;
      // the wine package that runs as long as the included time.
      setRadio('cork_starters', 'four');
      setRadio('cork_mains', 'four');
      if (festive) setRadio('cork_desserts', 'three');
      const wine = packageForHours('cork_wine');
      if (wine) wine.checked = true;
    }
    if (sisiActive()) setQty('cocktail-per-guest', 1);
    update();
  }
  function clearMenu(): void {
    qa<HTMLInputElement>('[data-cork-course] input[type="radio"], input[name="cork_wine"], [data-cork-dish]:not(:disabled), [data-cork-premium], [data-cork-flat]').forEach((i) => { i.checked = false; });
    setRadio('cork_bar', 'none');
    qa<HTMLInputElement>('[data-pick] [data-qty]').forEach((i) => { i.value = '0'; });
    update();
  }
  q<HTMLButtonElement>('[data-propose-btn]')?.addEventListener('click', proposeMenu);
  q<HTMLButtonElement>('[data-cork-window-fix]')?.addEventListener('click', (event) => {
    const time = (event.currentTarget as HTMLElement).getAttribute('data-time') || '';
    if (timeSelect && time) { timeSelect.value = time; timeSelect.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  q<HTMLButtonElement>('[data-clear-menu]')?.addEventListener('click', clearMenu);

  const steps = qa<HTMLElement>('[data-cfg-step]');
  const progress = qa<HTMLAnchorElement>('[data-cfg-progress] [data-step]');
  let current = 0;
  const requirementMet = (key: string) => (key === 'occasion' ? !!checkedRadio('occasion') : key === 'space' ? !!checkedRadio('space') : true);
  /** Index of the first step whose choice is still missing, or -1. */
  const firstUnmet = () => steps.findIndex((step) => !requirementMet(step.getAttribute('data-cfg-step') || ''));

  /* --- everything derived ------------------------------------------------ */
  function update(): void {
    const mode = spaceKey();
    const cork = corkActive();
    const sisi = sisiActive();
    corkOnly.forEach((el) => show(el, cork));
    syncTimeOptions();
    syncTabs();

    // Adults-only venue: every head-count is the guest count.
    const adults = num('guests');
    const childrenHalf = 0;
    const totalGuests = adults;

    // Proposal from the details (guests, format, hours) and the venue in effect.
    const proposal = recommendation();
    const effective = effectiveSpace();
    const undecided = mode === '' || mode === 'unsure';
    const proposalTitle = proposal ? strings.spaceTitles[proposal.key] : '';
    const reasonWords = (proposal?.reasons ?? []).map((r) =>
      fill(strings.recommend.reasons[r] || r, { close: strings.cork.close, seated: strings.limits.seatedTheCork, standing: strings.limits.standingR32 }));
    const recommendEl = q<HTMLElement>('[data-recommend]');
    if (recommendEl) {
      text('[data-recommend-space]', proposal ? `${strings.recommend.heading}: ${proposalTitle}` : '');
      text('[data-recommend-why]', reasonWords.length ? `· ${reasonWords.join(' · ')}` : '');
      recommendEl.hidden = !proposal;
    }
    qa<HTMLElement>('[data-suggest-space]').forEach((badge) => show(badge, !!proposal && badge.getAttribute('data-suggest-space') === proposal.key));
    const recommendedPl = proposal ? strings.spaceTitlesPl[proposal.key] : '';
    const recommendedField = q<HTMLInputElement>('[data-field-recommended]');
    if (recommendedField) recommendedField.value = undecided && proposal ? recommendedPl : '';

    // Map + "Selected:" line: the chosen venue, or a lighter tint on the proposed one.
    const space = checkedRadio('space');
    const spaceLabel = space
      ? mode === 'unsure' && proposal ? `${labelOf(space, '')} · ${fill(strings.recommend.proposal, { space: proposalTitle })}` : labelOf(space, '')
      : '';
    text('[data-space-selected]', spaceLabel || '—');
    const highlightKey = undecided ? (proposal?.key ?? '') : mode;
    mapRegions.forEach((region) => {
      const key = region.getAttribute('data-map-space') || '';
      const on = !undecided && (mode === key || mode === 'r32');
      const suggested = undecided && (highlightKey === key || highlightKey === 'r32');
      region.classList.toggle('is-selected', on);
      region.classList.toggle('is-recommended', suggested);
      region.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    // The shared area between the venues lights up with either of them, and the
    // plan draws one border around the chosen venue plus the shared area.
    qa<SVGGElement>('[data-map-shared]').forEach((region) => {
      region.classList.toggle('is-selected', !undecided);
      region.classList.toggle('is-recommended', undecided && !!proposal);
    });
    const svg = q<SVGSVGElement>('.cfg-map-svg');
    if (svg) svg.setAttribute('data-mode', undecided ? '' : mode);

    // Capacity notices (verified limits) + The Cork group rules
    const seating = checkedRadio('seating');
    const notice = capacityNotice({ guests: totalGuests, seating: seating?.getAttribute('data-key') || '' }, strings.limits);
    const capacityEl = q<HTMLElement>('[data-capacity-notice]');
    if (capacityEl) {
      capacityEl.textContent = notice ? fill(strings.capacity[notice.limit], { guests: totalGuests, capacity: notice.capacity }) : '';
      capacityEl.hidden = !notice;
    }
    const corkNoticeEl = q<HTMLElement>('[data-cork-notice]');
    if (corkNoticeEl) {
      let message = '';
      if (adults > 0 && adults < strings.limits.minGuests) message = fill(strings.capacity.min, { min: strings.limits.minGuests });
      else if (cork && adults >= strings.cork.exclusiveFrom) message = fill(strings.capacity.corkExclusive, { min: strings.cork.exclusiveFrom });
      corkNoticeEl.textContent = message;
      corkNoticeEl.hidden = !message;
    }

    // Included time at The Cork (the block waits for a group size)
    const baseHours = corkBaseHours(adults, strings.cork.baseHours);
    show(q<HTMLElement>('[data-duration]'), cork && adults >= strings.limits.minGuests);
    text('[data-duration-base]', adults > 0 ? fill(strings.duration.base, { guests: adults }) : '');
    text('[data-duration-hours]', adults === 0 ? '—' : baseHours === null ? strings.duration.individual : fill(strings.duration.hours, { hours: baseHours }));
    // Paid extension derived from the end time: the time at The Cork (until
    // closing) beyond the included hours, in whole hours, capped at the longest
    // extension the restaurant offers; anything longer is agreed individually.
    const startM = startMin();
    const endM = endMin();
    const maxExt = Math.max(...strings.cork.extensions.map((e) => e.hours));
    let extHours = 0;
    let tooLong = false;
    if (cork && baseHours !== null && startM !== null && endM !== null) {
      const atCork = Math.max(0, Math.min(endM, closeMin) - startM);
      extHours = Math.max(0, Math.ceil((atCork - baseHours * 60) / 60));
      tooLong = extHours > maxExt;
      extHours = Math.min(extHours, maxExt);
    }
    extHoursNow = extHours;
    const ext = strings.cork.extensions.find((e) => e.hours === extHours) ?? strings.cork.extensions[0];
    const extPct = Math.round(ext.surcharge * 100);
    const extKey = (ext.key === 'plus1' || ext.key === 'plus2' ? ext.key : 'none') as 'none' | 'plus1' | 'plus2';
    if (extensionField) extensionField.value = cork ? strings.durationPl[extKey] : '';
    const extEl = q<HTMLElement>('[data-duration-ext]');
    if (extEl) { extEl.textContent = extHours > 0 ? fill(strings.duration.extensionAuto, { hours: extHours, pct: extPct }) : ''; extEl.hidden = extHours === 0; }
    const noteEl = q<HTMLElement>('[data-duration-note]');
    if (noteEl) {
      const note = tooLong && baseHours !== null ? fill(strings.duration.tooLong, { hours: baseHours + maxExt })
        : extHours > 0 && baseHours !== null ? fill(strings.details.extensionSave, { hours: baseHours })
        : '';
      noteEl.textContent = note;
      noteEl.hidden = !note;
    }
    // Menu step: the evening after The Cork closes moves to the SiSi bar.
    const closingEl = q<HTMLElement>('[data-cork-closing]');
    if (closingEl) {
      const on = afterClose() && endM !== null;
      closingEl.textContent = on ? fill(strings.corkClosing, { close: strings.cork.close, end: fmtMin(endM as number) }) : '';
      closingEl.hidden = !on;
    }
    // Plan for the evening: which venue hosts which hours.
    const planEl = q<HTMLElement>('[data-plan]');
    if (planEl) {
      const parts: string[] = [];
      if (startM !== null && endM !== null) {
        const corkEnd = Math.min(endM, closeMin);
        if (effective !== 'sisi' && corkEnd > startM) parts.push(fill(strings.details.planCork, { from: fmtMin(startM), to: fmtMin(corkEnd) }));
        if (effective === 'sisi') parts.push(fill(strings.details.planSisi, { from: fmtMin(startM), to: fmtMin(endM) }));
        else if (endM > corkEnd && (effective === 'r32' || afterClose())) parts.push(fill(strings.details.planSisi, { from: fmtMin(Math.max(startM, corkEnd)), to: fmtMin(endM) }));
      }
      text('[data-plan-text]', parts.join(' · '));
      planEl.hidden = parts.length === 0;
    }
    // The Cork's weekday start window: explain it and offer the nearest allowed time.
    const windowEl = q<HTMLElement>('[data-cork-window]');
    const fixBtn = q<HTMLButtonElement>('[data-cork-window-fix]');
    if (windowEl && fixBtn) {
      const iso = isoDate();
      const day = iso ? new Date(`${iso}T00:00:00`).getDay() : NaN;
      const win = Number.isNaN(day) ? null : strings.cork.startWindows[String(day)];
      const from = win ? toMin(win[0]) : null;
      const to = win ? toMin(win[1]) : null;
      const outside = cork && win && startM !== null && from !== null && to !== null && (startM < from || startM > to);
      if (outside) {
        const fixTo = startM < (from as number) ? (win as [string, string])[0] : (win as [string, string])[1];
        text('[data-cork-window-text]', fill(strings.details.corkWindow, { from: (win as [string, string])[0], to: (win as [string, string])[1] }));
        fixBtn.textContent = fill(strings.details.corkWindowFix, { time: fixTo });
        fixBtn.setAttribute('data-time', fixTo);
      }
      windowEl.hidden = !outside;
    }
    // SiSi hire fee on its club nights (Friday / Saturday), when SiSi is booked.
    const feeDay = isoDate() ? new Date(`${isoDate()}T00:00:00`).getDay() : -1;
    const nightFee = effective === 'sisi' || effective === 'r32' ? sisiNightFee(isoDate(), strings.nightFees) : 0;
    const feeText = nightFee > 0 ? fill(feeDay === 5 ? strings.details.nightFee.friday : strings.details.nightFee.saturday, { fee: formatZl(nightFee) }) : '';
    ['[data-night-fee]', '[data-space-night-fee]'].forEach((sel) => { const el = q<HTMLElement>(sel); if (el) { el.textContent = feeText; el.hidden = !feeText; } });

    // The Cork packages
    const courseLines = syncCourses();
    const foodPerAdult = qa<HTMLElement>('[data-cork-course]').reduce((sum, card) => {
      const pkg = checkedRadio(`cork_${card.getAttribute('data-cork-course')}`);
      return sum + Number(pkg?.getAttribute('data-price') || 0);
    }, 0);
    const wine = checkedRadio('cork_wine');
    const bar = checkedRadio('cork_bar');
    const barPrice = Number(bar?.getAttribute('data-price') || 0);
    if (premium) {
      premium.disabled = barPrice === 0;
      if (barPrice === 0) premium.checked = false;
      show(q<HTMLElement>('[data-premium-hint]'), barPrice === 0);
    }
    const drinksPerAdult = Number(wine?.getAttribute('data-price') || 0) + barPrice + (premium?.checked ? Number(premium.getAttribute('data-price')) || 0 : 0);
    const corkFlat = qa<HTMLInputElement>('[data-cork-flat]:checked').reduce((sum, box) => sum + (Number(box.getAttribute('data-price')) || 0), 0);
    const corkResult = cork
      ? corkEstimate({ adults, childrenHalf, foodPerAdult, extensionSurcharge: extPct / 100, drinksPerAdult, flat: corkFlat }, strings.cork.rules)
      : { food: 0, drinks: 0, flat: 0, value: 0, service: 0, total: 0, deposit: 0, balance: 0 };
    const corkDrinksValue = corkResult.drinks + corkResult.flat;

    // SiSi picks (adults only) and shared decorations
    const all = sisiLines();
    const picked = all.filter((line) => line.qty > 0);
    const sisiResult = sisi ? estimate({ guests: adults, lines: all }) : { drinks: 0, food: 0, total: 0, perGuest: 0, lineCount: 0 };
    const tablesPkg = checkedRadio('decor_tables');
    const tablesCost = decorTablesCost(Number(tablesPkg?.getAttribute('data-price') || 0), adults, strings.decorSeats);
    const photoCost = Number(checkedRadio('decor_photo')?.getAttribute('data-price') || 0);
    const decorFlat = tablesCost + photoCost;
    qa<HTMLElement>('[data-decor-per-table]').forEach((line) => {
      const price = Number(q<HTMLInputElement>(`input[name="decor_tables"][data-key="${line.getAttribute('data-decor-per-table')}"]`)?.getAttribute('data-price') || 0);
      const total = decorTablesCost(price, adults, strings.decorSeats);
      line.textContent = total > 0 ? fill(strings.perTable, { guests: adults, total: formatZl(total) }) : '';
      line.hidden = total === 0;
    });

    // Cake: the size's published "from" price, counted so the total moves with the choice.
    const cakeWanted = checkedRadio('cake')?.getAttribute('data-key') === 'with';
    show(cakeOptions, cakeWanted);
    suggestCakeSize(adults, cakeWanted);
    const cakeFrom = cakeWanted ? Number(checkedRadio('cake_size')?.getAttribute('data-price-from') || 0) : 0;

    const total = corkResult.total + sisiResult.total + decorFlat + cakeFrom + nightFee;
    const hasLines = corkResult.value > 0 || sisiResult.lineCount > 0 || decorFlat > 0 || cakeFrom > 0 || nightFee > 0;
    const menuEmpty = corkResult.value === 0 && sisiResult.lineCount === 0;

    // Starting-menu offer while the menu is empty; "clear" once something is picked.
    qa<HTMLElement>('[data-propose]').forEach((el) => show(el, menuEmpty && adults > 0));
    show(q<HTMLElement>('[data-clear-menu]'), !menuEmpty);
    show(q<HTMLElement>('[data-need-guests]'), adults === 0);
    // Wine / open-bar length that matches the included time at The Cork.
    const wineFit = cork ? packageForHours('cork_wine') : null;
    const barFit = cork ? packageForHours('cork_bar') : null;
    qa<HTMLElement>('[data-suggest-wine]').forEach((badge) => show(badge, !!wineFit && badge.getAttribute('data-suggest-wine') === wineFit.getAttribute('data-key')));
    qa<HTMLElement>('[data-suggest-bar]').forEach((badge) => show(badge, !!barFit && badge.getAttribute('data-suggest-bar') === barFit.getAttribute('data-key')));

    // Estimate card (only once something is priced)
    show(q<HTMLElement>('[data-est-card]'), hasLines);
    const row = (key: string, amount: number, on: boolean) => {
      show(q<HTMLElement>(`[data-est-row="${key}"]`), on);
      text(`[data-est-${key}]`, formatZl(amount));
    };
    row('corkFood', corkResult.food, cork && corkResult.food > 0);
    row('corkDrinks', corkDrinksValue, cork && corkDrinksValue > 0);
    row('drinks', sisiResult.drinks, sisi && sisiResult.drinks > 0);
    row('food', sisiResult.food, sisi && sisiResult.food > 0);
    row('cake', cakeFrom, cakeFrom > 0);
    row('decor', decorFlat, decorFlat > 0);
    row('nightFee', nightFee, nightFee > 0);
    row('service', corkResult.service, corkResult.service > 0);
    text('[data-est-total]', formatZl(total));
    text('[data-est-per-guest]', formatZl(adults > 0 ? Math.round(total / adults) : 0));
    const meta: string[] = [`${adults} ${strings.estimate.adults}`];
    if (cork && extPct > 0 && corkResult.food > 0) meta.push(fill(strings.estimate.extension, { pct: extPct }));
    text('[data-est-meta]', meta.join(' · '));

    // The Cork payment card in the summary
    show(q<HTMLElement>('[data-cork-terms]'), corkResult.value > 0);
    text('[data-cork-value]', formatZl(corkResult.value));
    text('[data-cork-service]', formatZl(corkResult.service));
    text('[data-cork-total]', formatZl(corkResult.total));
    text('[data-cork-deposit]', formatZl(corkResult.deposit));
    text('[data-cork-balance]', formatZl(corkResult.balance));

    // Gentle suggestions from the occasion: a cake for birthdays and
    // anniversaries, the presentation screens for company events.
    const occasionKey = checkedRadio('occasion')?.getAttribute('data-key') || '';
    show(q<HTMLElement>('[data-suggest="cake"]'), occasionKey === 'birthday' || occasionKey === 'anniversary');
    show(q<HTMLElement>('[data-suggest="screens"]'), occasionKey === 'corporate');
    show(q<HTMLElement>('[data-suggest="exclusive"]'), cork && adults >= strings.cork.exclusiveFrom);

    // Summary card
    const tba = strings.summary.toBeAgreed;
    const none = strings.summary.none;
    const dateValue = q<HTMLInputElement>('[name="preferred_date"]')?.value.trim() || '';
    const timeValue = timeSelect?.value || '';
    const hoursLabel = timeValue === OTHER_TIME ? strings.time.other : timeValue && endM !== null ? `${timeValue}–${fmtMin(endM)} (${durationHours()} h)` : timeValue || tba;
    const drinksCork: string[] = [];
    if (cork && Number(wine?.getAttribute('data-price')) > 0) drinksCork.push(labelOf(wine, ''));
    if (cork && barPrice > 0) drinksCork.push(labelOf(bar, '') + (premium?.checked ? ` + ${labelOf(premium, '')}` : ''));
    if (cork) qa<HTMLInputElement>('[data-cork-flat]:checked').forEach((box) => drinksCork.push(labelOf(box, '')));
    const cakeParts = cakeWanted
      ? [labelOf(checkedRadio('cake_size'), ''), labelOf(checkedRadio('cake_base'), ''), labelOf(checkedRadio('cake_flavour'), '')].filter(Boolean)
      : [];
    const decorParts = [
      ...['decor_tables', 'decor_photo']
        .map((name) => checkedRadio(name))
        .filter((input): input is HTMLInputElement => !!input && input.getAttribute('data-key') !== 'none')
        .map((input) => labelOf(input, '')),
      ...qa<HTMLInputElement>('[data-decor-extra]:checked').map((input) => labelOf(input, '')),
    ];
    const extras = qa<HTMLInputElement>('input[name="extras"]:checked').map((input) => labelOf(input, ''));
    const guestsLabel = adults > 0 ? `${adults} ${strings.estimate.adults}` : tba;
    const durationLabel = cork && adults > 0
      ? `${baseHours === null ? strings.duration.individual : fill(strings.duration.hours, { hours: baseHours })}${extHours > 0 ? ` · ${strings.duration[extKey]}` : ''}`
      : '';

    const rows: Record<string, { value: string; on: boolean }> = {
      occasion: { value: labelOf(checkedRadio('occasion'), tba), on: true },
      date: { value: dateValue || tba, on: true },
      time: { value: hoursLabel, on: true },
      guests: { value: guestsLabel, on: true },
      seating: { value: labelOf(seating, tba), on: true },
      space: { value: spaceLabel || tba, on: true },
      duration: { value: durationLabel || tba, on: cork },
      corkMenu: { value: courseLines.length ? courseLines.join(' · ') : none, on: cork },
      corkDrinks: { value: drinksCork.length ? drinksCork.join(', ') : none, on: cork },
      drinks: { value: describe(picked.filter((l) => l.group === 'drinks'), false) || none, on: sisi },
      food: { value: describe(picked.filter((l) => l.group === 'food'), false) || none, on: sisi },
      cake: { value: cakeWanted ? `${cakeParts.length ? cakeParts.join(' · ') : labelOf(checkedRadio('cake'), '')}${cakeFrom ? ` · od ${formatZl(cakeFrom)}` : ''}` : none, on: true },
      decor: { value: decorParts.length ? decorParts.join(', ') : none, on: true },
      extras: { value: extras.length ? extras.join(', ') : none, on: true },
    };
    Object.entries(rows).forEach(([key, { value, on }]) => {
      show(q<HTMLElement>(`[data-sum-row="${key}"]`), on);
      text(`[data-sum="${key}"]`, value);
    });
    text('[data-sum="estimate"]', hasLines ? `${formatZl(total)} (${formatZl(adults > 0 ? Math.round(total / adults) : 0)} ${strings.estimate.perGuest})` : none);

    // Calculator bar: what is chosen, the total, and the one thing the current step still needs.
    if (calcBar.line) calcBar.line.textContent = [labelOf(checkedRadio('occasion'), ''), adults > 0 ? `${adults} ${strings.estimate.adults}` : '', spaceLabel].filter(Boolean).join(' · ');
    if (calcBar.total) calcBar.total.textContent = formatZl(total);
    if (calcBar.per) calcBar.per.textContent = adults > 0 && hasLines ? `${formatZl(Math.round(total / adults))} ${strings.estimate.perGuest}` : '';
    const stepKey = steps[current]?.getAttribute('data-cfg-step') || '';
    const contactMissing = !(q<HTMLInputElement>('[name="name"]')?.value.trim() && q<HTMLInputElement>('[name="email"]')?.value.trim());
    const hint = stepKey === 'occasion' && !checkedRadio('occasion') ? strings.hints.occasion
      : stepKey === 'space' && !checkedRadio('space') ? strings.hints.space
      : stepKey === 'details' && (!dateValue || !timeValue || !durationHours() || adults < strings.limits.minGuests) ? strings.hints.details
      : stepKey === 'menu' && menuEmpty ? strings.hints.menu
      : stepKey === 'summary' && contactMissing ? strings.hints.summary
      : '';
    if (calcBar.hint) { calcBar.hint.textContent = hint; calcBar.hint.hidden = !hint; }
    // The occasion and the space must be chosen before moving on.
    const limit = firstUnmet();
    if (calcBar.next) calcBar.next.disabled = limit === current;
    progress.forEach((link, i) => {
      if (limit >= 0 && i > limit) link.setAttribute('aria-disabled', 'true');
      else link.removeAttribute('aria-disabled');
    });

    // Hidden fields for the notification email (Polish, like every other form)
    if (hidden.drinks) hidden.drinks.value = sisi ? describe(picked.filter((l) => l.group === 'drinks'), true) : '';
    if (hidden.food) hidden.food.value = sisi ? describe(picked.filter((l) => l.group === 'food'), true) : '';
    if (hidden.corkDishes) hidden.corkDishes.value = cork ? courseLines.join(' | ') : '';
    if (hidden.estimate) {
      const parts: string[] = [];
      if (corkResult.value > 0) {
        parts.push(`The Cork: menu ${formatZl(corkResult.food)}, napoje ${formatZl(corkDrinksValue)}, serwis 10% ${formatZl(corkResult.service)}, razem ${formatZl(corkResult.total)} (zadatek 50% ${formatZl(corkResult.deposit)})`);
      }
      if (sisiResult.lineCount > 0) parts.push(`SiSi wg karty: bar ${formatZl(sisiResult.drinks)}, przekąski ${formatZl(sisiResult.food)}`);
      if (cakeFrom > 0) parts.push(`tort od ${formatZl(cakeFrom)}`);
      if (decorFlat > 0) parts.push(`dekoracje ${formatZl(decorFlat)}`);
      if (nightFee > 0) parts.push(`wynajem SiSi ${formatZl(nightFee)}`);
      if (undecided && proposal) parts.push(`propozycja przestrzeni: ${recommendedPl}`);
      hidden.estimate.value = hasLines
        ? `${parts.join('; ')}; łącznie ${formatZl(total)} (${adults} gości${cork && extPct ? `, przedłużenie +${extPct}%` : ''})`
        : '';
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();

  /* --- wizard: one step at a time, driven by the progress strip and the bar --- */
  function goTo(index: number, scroll = true): void {
    const limit = firstUnmet();
    current = Math.min(steps.length - 1, Math.max(0, limit >= 0 ? Math.min(index, limit) : index));
    steps.forEach((step, i) => { step.hidden = i !== current; });
    progress.forEach((link, i) => {
      if (i === current) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
      link.setAttribute('data-done', i < current ? 'true' : 'false');
    });
    if (calcBar.back) calcBar.back.hidden = current === 0;
    if (calcBar.next) calcBar.next.hidden = current === steps.length - 1;
    if (scroll) (body ?? window).scrollTo({ top: 0, behavior: 'smooth' });
    update();
  }
  if (steps.length && progress.length === steps.length && calcBar.root) {
    form.classList.add('cfg-wizard');
    calcBar.root.hidden = false;
    progress.forEach((link, i) => link.addEventListener('click', (event) => { event.preventDefault(); goTo(i); }));
    // In-step "next" links stay in the markup for no-JS visitors; route them through the wizard.
    qa<HTMLAnchorElement>('[data-step-actions] a[href^="#cfg-"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = steps.findIndex((step) => `#${step.id}` === link.getAttribute('href'));
        if (target < 0) return;
        event.preventDefault();
        goTo(target);
      });
    });
    calcBar.back?.addEventListener('click', () => goTo(current - 1));
    calcBar.next?.addEventListener('click', () => goTo(current + 1));
    const fromHash = steps.findIndex((step) => `#${step.id}` === location.hash);
    goTo(fromHash >= 0 ? fromHash : 0, fromHash >= 0);
  }
}

document.querySelectorAll<HTMLFormElement>('[data-configurator]').forEach(initConfigurator);
