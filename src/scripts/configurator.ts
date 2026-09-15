/* Event configurator: adapts the steps to the chosen venue, keeps the live
   estimate, the notices and the summary in sync, and fills the hidden
   configuration fields. Submission, validation and the success/error states
   are handled by the shared enquiry-form script (data-event-enquiry-form).

   Everything printed comes from the DOM and data-strings: SiSi prices from
   data-price on each pick row (read from the menu data at build), The Cork
   packages and rules from src/data/cork-configurator.mjs, venue limits from
   VENUE_FACTS. It never invents a number. */
import { capacityNotice, corkBaseHours, corkEstimate, corkStartSlots, estimate, formatZl } from '../lib/configurator-estimate.mjs';

type Strings = {
  capacity: { seated: string; standing: string; corkMin: string; corkExclusive: string };
  limits: { seatedTheCork: number; standingR32: number };
  cork: {
    minGuests: number;
    exclusiveFrom: number;
    baseHours: { minGuests: number; hours: number | null }[];
    startWindows: Record<string, [string, string]>;
    rules: { childShare: number; serviceFee: number; depositShare: number };
  };
  duration: { base: string; hours: string; individual: string };
  time: { other: string };
  summary: { toBeAgreed: string; none: string; guestsUnit: string };
  estimate: { guests: string; adults: string; children: string; extension: string; perGuest: string };
  units: { perGuest: string; bottle: string; portion: string };
  chosen: string;
};

const OTHER_TIME = 'inna';
const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));

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

  /* --- venue mode --------------------------------------------------------- */
  const spaceKey = () => checkedRadio('space')?.getAttribute('data-key') || 'unsure';
  const corkActive = () => spaceKey() !== 'sisi';
  const sisiActive = () => spaceKey() !== 'cork';

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

  /* --- start-time options: The Cork's weekday windows, else a plain list -- */
  let lastTimeKey = '';
  function syncTimeOptions(): void {
    if (!timeSelect) return;
    const iso = q<HTMLInputElement>('[name="preferred_date_iso"]')?.value || '';
    const cork = corkActive();
    const key = `${cork ? 'cork' : 'sisi'}:${cork ? iso.slice(0, 10) : ''}`;
    if (key === lastTimeKey) return;
    lastTimeKey = key;
    const current = timeSelect.value;
    let slots: string[] = [];
    if (cork) {
      slots = iso ? corkStartSlots(iso, strings.cork.startWindows) : [];
    } else {
      for (let m = 12 * 60; m <= 23 * 60 + 30; m += 30) {
        slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
      }
    }
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

  /* --- The Cork dish picks: at most `size` per course --------------------- */
  const courseSize = (course: string) => Number(checkedRadio(`cork_${course}`)?.getAttribute('data-size') || 0);
  qa<HTMLInputElement>('[data-cork-dish]').forEach((box) => {
    box.addEventListener('change', () => {
      const course = box.getAttribute('data-course') || '';
      const size = courseSize(course);
      const chosen = qa<HTMLInputElement>(`[data-cork-dish][data-course="${course}"]:checked`);
      if (box.checked && size > 0 && chosen.length > size) box.checked = false;
    });
  });
  function syncCourses(): string[] {
    const lines: string[] = [];
    qa<HTMLElement>('[data-cork-course]').forEach((card) => {
      const course = card.getAttribute('data-cork-course') || '';
      const pkg = checkedRadio(`cork_${course}`);
      const size = Number(pkg?.getAttribute('data-size') || 0);
      const boxes = qa<HTMLInputElement>(`[data-cork-dish][data-course="${course}"]`);
      const included = boxes.some((b) => b.disabled && b.checked && !pkg);
      // An à la carte package (size 0) has nothing to pick; drop stale picks.
      if (pkg && size === 0) boxes.forEach((b) => { b.checked = false; });
      if (pkg) boxes.forEach((b) => { b.disabled = size === 0; });
      const chosen = boxes.filter((b) => b.checked && (included || !b.disabled));
      const counter = card.querySelector<HTMLElement>('[data-cork-chosen]');
      if (counter) counter.textContent = fill(strings.chosen, { n: chosen.length, size });
      const names = chosen.map((b) => b.getAttribute('data-dish') || '');
      if (pkg && Number(pkg.getAttribute('data-price')) > 0) {
        lines.push(`${labelOf(pkg, '')}${names.length ? `: ${names.join(', ')}` : ''}`);
      }
    });
    return lines;
  }

  /* --- everything derived ------------------------------------------------ */
  function update(): void {
    const mode = spaceKey();
    const cork = corkActive();
    const sisi = sisiActive();
    corkOnly.forEach((el) => show(el, cork));
    syncTabs();
    syncTimeOptions();

    const adults = num('guests');
    const childrenHalf = cork ? num('children') : 0;
    const childrenSmall = cork ? num('children_small') : 0;
    const totalGuests = adults + childrenHalf + childrenSmall;

    // Map + "Selected:" line
    const space = checkedRadio('space');
    text('[data-space-selected]', labelOf(space, ''));
    mapRegions.forEach((region) => {
      const key = region.getAttribute('data-map-space') || '';
      const on = mode === key || mode === 'r32';
      region.classList.toggle('is-selected', on);
      region.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

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
      if (cork && adults > 0 && adults < strings.cork.minGuests) message = fill(strings.capacity.corkMin, { min: strings.cork.minGuests });
      else if (cork && adults >= strings.cork.exclusiveFrom) message = fill(strings.capacity.corkExclusive, { min: strings.cork.exclusiveFrom });
      corkNoticeEl.textContent = message;
      corkNoticeEl.hidden = !message;
    }

    // Included time at The Cork
    const baseHours = corkBaseHours(adults, strings.cork.baseHours);
    text('[data-duration-base]', fill(strings.duration.base, { guests: adults }));
    text('[data-duration-hours]', baseHours === null ? strings.duration.individual : fill(strings.duration.hours, { hours: baseHours }));
    const extension = checkedRadio('extension');
    const extPct = Number(extension?.getAttribute('data-pct') || 0);

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
    const decorFlat = qa<HTMLInputElement>('[data-decor-flat]:checked').reduce((sum, input) => sum + (Number(input.getAttribute('data-price')) || 0), 0);

    const total = corkResult.total + sisiResult.total + decorFlat;
    const hasLines = corkResult.value > 0 || sisiResult.lineCount > 0 || decorFlat > 0;

    // Estimate panel
    show(q<HTMLElement>('[data-est-empty]'), !hasLines);
    show(q<HTMLElement>('[data-est-rows]'), hasLines);
    const row = (key: string, amount: number, on: boolean) => {
      show(q<HTMLElement>(`[data-est-row="${key}"]`), on);
      text(`[data-est-${key}]`, formatZl(amount));
    };
    row('corkFood', corkResult.food, cork && corkResult.food > 0);
    row('corkDrinks', corkDrinksValue, cork && corkDrinksValue > 0);
    row('drinks', sisiResult.drinks, sisi && sisiResult.drinks > 0);
    row('food', sisiResult.food, sisi && sisiResult.food > 0);
    row('decor', decorFlat, decorFlat > 0);
    row('service', corkResult.service, corkResult.service > 0);
    text('[data-est-total]', formatZl(total));
    text('[data-est-per-guest]', formatZl(adults > 0 ? Math.round(total / adults) : 0));
    const meta: string[] = [`${adults} ${strings.estimate.adults}`];
    if (cork && childrenHalf > 0) meta.push(`${childrenHalf} ${strings.estimate.children}`);
    if (cork && extPct > 0 && corkResult.food > 0) meta.push(fill(strings.estimate.extension, { pct: extPct }));
    text('[data-est-meta]', meta.join(' · '));

    // The Cork payment card in the summary
    show(q<HTMLElement>('[data-cork-terms]'), corkResult.value > 0);
    text('[data-cork-value]', formatZl(corkResult.value));
    text('[data-cork-service]', formatZl(corkResult.service));
    text('[data-cork-total]', formatZl(corkResult.total));
    text('[data-cork-deposit]', formatZl(corkResult.deposit));
    text('[data-cork-balance]', formatZl(corkResult.balance));

    // Cake options only when a cake is wanted
    const cakeWanted = checkedRadio('cake')?.getAttribute('data-key') === 'with';
    show(cakeOptions, cakeWanted);

    // Summary card
    const tba = strings.summary.toBeAgreed;
    const none = strings.summary.none;
    const dateValue = q<HTMLInputElement>('[name="preferred_date"]')?.value.trim() || '';
    const timeValue = timeSelect?.value || '';
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
    const kids = childrenHalf + childrenSmall;
    const guestsLabel = adults > 0
      ? `${adults} ${strings.estimate.adults}${cork && kids > 0 ? ` + ${kids} ${strings.estimate.guests}` : ''}`
      : tba;
    const durationLabel = cork && adults > 0
      ? `${baseHours === null ? strings.duration.individual : fill(strings.duration.hours, { hours: baseHours })}${extPct > 0 ? ` · ${labelOf(extension, '')}` : ''}`
      : '';

    const rows: Record<string, { value: string; on: boolean }> = {
      occasion: { value: labelOf(checkedRadio('occasion'), tba), on: true },
      date: { value: dateValue || tba, on: true },
      time: { value: timeValue === OTHER_TIME ? strings.time.other : timeValue || tba, on: true },
      guests: { value: guestsLabel, on: true },
      seating: { value: labelOf(seating, tba), on: true },
      space: { value: labelOf(space, tba), on: true },
      duration: { value: durationLabel || tba, on: cork },
      corkMenu: { value: courseLines.length ? courseLines.join(' · ') : none, on: cork },
      corkDrinks: { value: drinksCork.length ? drinksCork.join(', ') : none, on: cork },
      drinks: { value: describe(picked.filter((l) => l.group === 'drinks'), false) || none, on: sisi },
      food: { value: describe(picked.filter((l) => l.group === 'food'), false) || none, on: sisi },
      cake: { value: cakeWanted ? (cakeParts.length ? cakeParts.join(' · ') : labelOf(checkedRadio('cake'), '')) : none, on: true },
      decor: { value: decorParts.length ? decorParts.join(', ') : none, on: true },
      extras: { value: extras.length ? extras.join(', ') : none, on: true },
    };
    Object.entries(rows).forEach(([key, { value, on }]) => {
      show(q<HTMLElement>(`[data-sum-row="${key}"]`), on);
      text(`[data-sum="${key}"]`, value);
    });
    text('[data-sum="estimate"]', hasLines ? `${formatZl(total)} (${formatZl(adults > 0 ? Math.round(total / adults) : 0)} ${strings.estimate.perGuest})` : none);

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
      if (decorFlat > 0) parts.push(`dekoracje ${formatZl(decorFlat)}`);
      hidden.estimate.value = hasLines
        ? `${parts.join('; ')}; łącznie ${formatZl(total)} (${adults} dorosłych${cork && childrenHalf ? `, ${childrenHalf} dzieci 50%` : ''}${cork && extPct ? `, przedłużenie +${extPct}%` : ''})`
        : '';
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();

  /* --- progress nav follows the visible step ------------------------------- */
  const steps = qa<HTMLElement>('[data-cfg-step]');
  const progress = qa<HTMLAnchorElement>('[data-cfg-progress] [data-step]');
  if (steps.length && progress.length && 'IntersectionObserver' in window) {
    const order = steps.map((step) => step.getAttribute('data-cfg-step') || '');
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const current = visible.target.getAttribute('data-cfg-step') || '';
        const currentIndex = order.indexOf(current);
        progress.forEach((link) => {
          const key = link.getAttribute('data-step') || '';
          if (key === current) link.setAttribute('aria-current', 'step');
          else link.removeAttribute('aria-current');
          link.setAttribute('data-done', order.indexOf(key) < currentIndex ? 'true' : 'false');
        });
      },
      { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.2, 0.5] },
    );
    steps.forEach((step) => observer.observe(step));
  }
}

document.querySelectorAll<HTMLFormElement>('[data-configurator]').forEach(initConfigurator);
