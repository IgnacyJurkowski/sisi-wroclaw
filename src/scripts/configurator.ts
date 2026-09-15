/* Event configurator: live estimate, capacity notices, summary and the hidden
   configuration fields. Submission, validation and the success/error states
   are handled by the shared enquiry-form script (data-event-enquiry-form);
   this module only keeps the page's derived text in sync with the inputs.

   Everything it prints comes from the DOM: prices from data-price on each pick
   row (read from the menu data at build), limits and copy from data-strings on
   the form. It never invents a number. */
import { capacityNotice, estimate, formatZl } from '../lib/configurator-estimate.mjs';

type Strings = {
  capacity: { seated: string; standing: string };
  limits: { seatedTheCork: number; standingR32: number };
  summary: { toBeAgreed: string; none: string; guestsUnit: string; corkCalculator: string; corkCalculatorPl: string };
  units: { perGuest: string; bottle: string; portion: string };
  estimate: { drinks: string; food: string; total: string; guests: string; perGuest: string };
};

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));

function initConfigurator(form: HTMLFormElement): void {
  const strings = JSON.parse(form.getAttribute('data-strings') || '{}') as Strings;
  const q = <T extends Element>(selector: string) => form.querySelector<T>(selector);
  const qa = <T extends Element>(selector: string) => Array.from(form.querySelectorAll<T>(selector));

  const guestsInput = q<HTMLInputElement>('[name="guests"]');
  const capacityEl = q<HTMLElement>('[data-capacity-notice]');
  const spaceSelected = q<HTMLElement>('[data-space-selected]');
  const menuOwn = q<HTMLElement>('[data-menu-own]');
  const menuCork = q<HTMLElement>('[data-menu-cork]');
  const corkFrame = q<HTMLIFrameElement>('[data-menu-cork] iframe[data-src]');
  const est = {
    empty: q<HTMLElement>('[data-est-empty]'),
    rows: q<HTMLElement>('[data-est-rows]'),
    drinks: q<HTMLElement>('[data-est-drinks]'),
    food: q<HTMLElement>('[data-est-food]'),
    total: q<HTMLElement>('[data-est-total]'),
    perGuest: q<HTMLElement>('[data-est-per-guest]'),
    guests: q<HTMLElement>('[data-est-guests]'),
  };
  const hidden = {
    drinks: q<HTMLInputElement>('[data-field-drinks]'),
    food: q<HTMLInputElement>('[data-field-food]'),
    estimate: q<HTMLInputElement>('[data-field-estimate]'),
  };
  const sum = (key: string) => q<HTMLElement>(`[data-sum="${key}"]`);

  const checkedRadio = (name: string) => q<HTMLInputElement>(`input[name="${name}"]:checked`);
  const guests = () => Math.max(0, parseInt(guestsInput?.value || '0', 10) || 0);

  /* --- quantity controls --------------------------------------------------- */
  qa<HTMLElement>('[data-pick]').forEach((row) => {
    const input = row.querySelector<HTMLInputElement>('[data-qty]');
    if (!input) return;
    row.querySelectorAll<HTMLButtonElement>('[data-qty-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.getAttribute('data-qty-step') || '0', 10);
        const next = Math.min(999, Math.max(0, (parseInt(input.value, 10) || 0) + step));
        input.value = String(next);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    input.addEventListener('blur', () => {
      const n = parseInt(input.value, 10);
      input.value = String(Number.isNaN(n) ? 0 : Math.min(999, Math.max(0, n)));
    });
  });

  type Line = { row: HTMLElement; qty: number; kind: 'perGuest' | 'unit'; group: 'drinks' | 'food'; price: number };
  const lines = (): Line[] =>
    qa<HTMLElement>('[data-pick]')
      .map((row) => ({
        row,
        qty: Math.max(0, parseInt(row.querySelector<HTMLInputElement>('[data-qty]')?.value || '0', 10) || 0),
        kind: (row.getAttribute('data-kind') === 'perGuest' ? 'perGuest' : 'unit') as 'perGuest' | 'unit',
        group: (row.getAttribute('data-group') === 'food' ? 'food' : 'drinks') as 'drinks' | 'food',
        price: Number(row.getAttribute('data-price')) || 0,
      }))
      .map((line) => {
        line.row.classList.toggle('is-picked', line.qty > 0);
        return line;
      });

  /** "2× Hugo Spritz (na gościa), 3 but. Halka" in the page language or Polish. */
  const describe = (picked: Line[], pl: boolean) =>
    picked
      .map(({ row, qty }) => {
        const name = row.getAttribute(pl ? 'data-name-pl' : 'data-name') || '';
        const unit = row.getAttribute(pl ? 'data-unit-pl' : 'data-unit') || '';
        return `${qty} × ${name} (${unit})`;
      })
      .join(', ');

  /* --- derived text -------------------------------------------------------- */
  function update(): void {
    const g = guests();
    const all = lines();
    const picked = all.filter((line) => line.qty > 0);
    const result = estimate({ guests: g, lines: all });

    // Estimate panel
    const hasLines = result.lineCount > 0;
    if (est.empty) est.empty.hidden = hasLines;
    if (est.rows) est.rows.hidden = !hasLines;
    if (est.drinks) est.drinks.textContent = formatZl(result.drinks);
    if (est.food) est.food.textContent = formatZl(result.food);
    if (est.total) est.total.textContent = formatZl(result.total);
    if (est.perGuest) est.perGuest.textContent = formatZl(result.perGuest);
    if (est.guests) est.guests.textContent = String(g);

    // Capacity notice (verified limits only)
    const seating = checkedRadio('seating');
    const notice = capacityNotice({ guests: g, seating: seating?.getAttribute('data-key') || '' }, strings.limits);
    if (capacityEl) {
      if (notice) {
        capacityEl.textContent = fill(strings.capacity[notice.limit], { guests: g, capacity: notice.capacity });
        capacityEl.hidden = false;
      } else {
        capacityEl.hidden = true;
        capacityEl.textContent = '';
      }
    }

    // Space "Selected:" line + the clickable plan (r32 lights both venues)
    const space = checkedRadio('space');
    if (spaceSelected && space) spaceSelected.textContent = space.getAttribute('data-label') || '';
    const spaceKey = space?.getAttribute('data-key') || '';
    // The Cork alone: swap the SiSi menu for the restaurant's own configurator,
    // loading the third-party frame only once a visitor actually chooses it.
    const corkMode = spaceKey === 'cork';
    if (menuOwn) menuOwn.hidden = corkMode;
    if (menuCork) menuCork.hidden = !corkMode;
    if (corkMode && corkFrame && !corkFrame.src) corkFrame.src = corkFrame.getAttribute('data-src') || '';
    mapRegions.forEach((region) => {
      const key = region.getAttribute('data-map-space') || '';
      const on = spaceKey === key || spaceKey === 'r32';
      region.classList.toggle('is-selected', on);
      region.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    // Summary card
    const label = (input: HTMLInputElement | null) => input?.getAttribute('data-label') || strings.summary.toBeAgreed;
    const dateValue = q<HTMLInputElement>('[name="preferred_date"]')?.value.trim();
    const timeValue = q<HTMLInputElement>('[name="start_time"]')?.value.trim();
    const extras = qa<HTMLInputElement>('input[name="extras"]:checked').map((input) => input.getAttribute('data-label') || '');
    const drinks = picked.filter((line) => line.group === 'drinks');
    const food = picked.filter((line) => line.group === 'food');
    const set = (key: string, value: string) => {
      const el = sum(key);
      if (el) el.textContent = value;
    };
    set('occasion', label(checkedRadio('occasion')));
    set('date', dateValue || strings.summary.toBeAgreed);
    set('time', timeValue || strings.summary.toBeAgreed);
    set('guests', g > 0 ? `${g} ${strings.summary.guestsUnit}` : strings.summary.toBeAgreed);
    set('seating', label(seating));
    set('space', label(space));
    const cork = strings.summary.corkCalculator;
    set('drinks', corkMode ? cork : drinks.length ? describe(drinks, false) : strings.summary.none);
    set('food', corkMode ? cork : food.length ? describe(food, false) : strings.summary.none);
    set('extras', extras.length ? extras.join(', ') : strings.summary.none);
    set(
      'estimate',
      corkMode
        ? cork
        : hasLines
          ? `${formatZl(result.total)} (${g} ${strings.estimate.guests}, ${formatZl(result.perGuest)} ${strings.estimate.perGuest})`
          : strings.summary.none,
    );

    // Hidden fields for the notification email (Polish, like every other form)
    const corkPl = strings.summary.corkCalculatorPl;
    if (hidden.drinks) hidden.drinks.value = corkMode ? corkPl : describe(drinks, true);
    if (hidden.food) hidden.food.value = corkMode ? corkPl : describe(food, true);
    if (hidden.estimate) {
      hidden.estimate.value = corkMode
        ? corkPl
        : hasLines
          ? `wg karty: napoje ${formatZl(result.drinks)}, przekąski ${formatZl(result.food)}, razem ${formatZl(result.total)} (${g} gości, ${formatZl(result.perGuest)} na gościa)`
          : '';
    }
  }

  /* --- clickable plan: each venue region selects its radio --------------- */
  const mapRegions = qa<SVGGElement>('[data-map-space]');
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

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();

  /* --- menu tabs ----------------------------------------------------------- */
  const tabs = qa<HTMLButtonElement>('[data-cfg-tab]');
  const panels = qa<HTMLElement>('[data-cfg-panel]');
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
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.getAttribute('data-cfg-tab') || ''));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[next].getAttribute('data-cfg-tab') || '', true);
    });
  });

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
          const isCurrent = key === current;
          if (isCurrent) link.setAttribute('aria-current', 'step');
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
