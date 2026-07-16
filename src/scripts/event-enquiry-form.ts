import { campaignAttribution } from '../lib/attribution.mjs';

function initEventEnquiryForm(form: HTMLFormElement): void {
  const messages = JSON.parse(form.getAttribute('data-messages') || '{}') as Record<string, string>;
  const requiredFields = (form.getAttribute('data-required-fields') || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  try {
    const pageEl = form.querySelector<HTMLInputElement>('[data-field-page]');
    const utmEl = form.querySelector<HTMLInputElement>('[data-field-utm]');
    if (pageEl) pageEl.value = location.pathname;
    if (utmEl) utmEl.value = campaignAttribution(location.search);
  } catch {}

  const errBox = form.querySelector<HTMLElement>('[data-form-errors]');
  const okBox = form.querySelector<HTMLElement>('[data-status-success]');
  const failBox = form.querySelector<HTMLElement>('[data-status-error]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  if (!submit) return;

  function setError(name: string, message: string): void {
    const field = form.querySelector<HTMLElement>('[name="' + name + '"]');
    const error = form.querySelector<HTMLElement>('[data-error-for="' + name + '"]');
    if (field) field.setAttribute('aria-invalid', 'true');
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  }

  function clearErrors(): void {
    form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((error) => {
      error.hidden = true;
      error.textContent = '';
    });
    form.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
    if (errBox) errBox.hidden = true;
  }

  function validate(): boolean {
    clearErrors();
    let firstBad: HTMLElement | null = null;
    const flexible = form.querySelector<HTMLInputElement>('[data-field-flexible]');

    requiredFields.forEach((name) => {
      const field = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name="' + name + '"]');
      const flexibleDate = name === 'preferred_date' && flexible?.checked;
      if (field && !flexibleDate && !String(field.value).trim()) {
        setError(name, messages.required);
        firstBad = firstBad || field;
      }
    });

    const email = form.querySelector<HTMLInputElement>('[name="email"]');
    if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setError('email', messages.email);
      firstBad = firstBad || email;
    }

    const consent = form.querySelector<HTMLInputElement>('[data-field-consent]');
    if (consent && !consent.checked) {
      setError('consent', messages.consent);
      firstBad = firstBad || consent;
    }

    if (firstBad) {
      if (errBox) errBox.hidden = false;
      firstBad.focus();
    }
    return !firstBad;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (okBox) okBox.hidden = true;
    if (failBox) failBox.hidden = true;
    if (!validate()) return;

    submit.disabled = true;
    submit.textContent = messages.sending;
    const data = new URLSearchParams();
    for (const [key, value] of new FormData(form)) data.append(key, String(value));

    fetch(location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data.toString(),
    })
      .then((response) => {
        if (!response.ok) throw new Error('bad status');
        form.reset();
        if (okBox) {
          okBox.hidden = false;
          okBox.focus();
        }
      })
      .catch(() => {
        if (failBox) failBox.hidden = false;
      })
      .finally(() => {
        submit.disabled = false;
        submit.textContent = messages.submit;
      });
  });
}

document.querySelectorAll<HTMLFormElement>('[data-event-enquiry-form]').forEach(initEventEnquiryForm);
