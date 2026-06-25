# TODOS

Deferred work, captured so the reasoning isn't lost. Each item is out of scope
for the current change but worth doing later.

## Events: copy localization strategy

- **What:** Decide whether event titles/notes get localized per locale.
- **Why:** Events are not localized today (single `title`/`note` shown in all 5
  locales). Once staff type Polish event names, the EN/DE/IT/CS pages show Polish
  copy. That may be fine (club night names + DJ names usually aren't translated),
  but it's a product decision, not an accident to leave unexamined.
- **Context:** If localization is wanted, the lowest-friction path is optional
  per-locale labels in the Opisy doc template (`Title EN:`, `Description DE:`, ...)
  that override the Polish default when filled - no AI, staff control the copy.
  That ripples `EventItem` to per-locale fields and touches `EventCard`,
  `EventDetailPage`, and `eventSchema`.
- **Depends on:** owner's product call.

## Events sync: service account key -> Workload Identity Federation

- **What:** Replace the long-lived Google service-account JSON (stored as a
  GitHub Actions secret) with keyless GitHub OIDC -> Google Workload Identity
  Federation.
- **Why:** A long-lived JSON key is high-blast-radius if leaked. OIDC issues
  short-lived credentials per run, nothing to rotate or leak.
- **Context:** v1 ships with a read-only, minimal-scope SA key plus a documented
  rotation cadence. WIF is the hardening step once the pipeline is proven.
- **Depends on:** the events pipeline + its GitHub Action existing.
