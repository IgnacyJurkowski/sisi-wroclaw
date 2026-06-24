/* Previous-projects ("selected realizations") data model for the B2B page.

   CRITICAL: do not invent real projects. The public grid renders ONLY case
   studies with `published: true`. The example below is development-only data
   with `published: false`, so no fake client ever appears in production.
   To add a real, verified project: copy the example, fill every locale, set
   `published: true`. See docs/B2B.md. */

import { LOCALES, type Locale } from '../i18n/config';

type L10n = Record<Locale, string>;

export interface CaseStudy {
  id: string;
  /** Public only when true. */
  published: boolean;
  /** Pin to the top of the grid. */
  featured: boolean;
  /** Localized URL slug (reserved for future detail pages). */
  slug: L10n;
  category: string;
  /** Event year or date, e.g. "2025". */
  year: string;
  client?: string;
  clientLogo?: string;
  guestCount?: number;
  spacesUsed?: string[];
  services?: string[];
  image?: string;
  imageAlt?: L10n;
  gallery?: string[];
  title: L10n;
  summary: L10n;
  challenge?: L10n;
  solution?: L10n;
  results?: L10n;
  testimonial?: { quote: L10n; author: string };
  seo?: { title: L10n; description: L10n };
}

const everyLocale = (value: string): L10n =>
  Object.fromEntries(LOCALES.map((l) => [l, value])) as L10n;

// TODO(ignacy): add 2+ real, approved case studies for "Wybrane realizacje".
// Until a published:true entry exists, the section renders its empty state.
export const CASE_STUDIES: CaseStudy[] = [
  // --- DEVELOPMENT-ONLY EXAMPLE (published: false -> never rendered publicly).
  // Shows the shape a real project should follow. Replace with verified data.
  {
    id: 'example-conference',
    published: false,
    featured: false,
    slug: everyLocale('example-conference'),
    category: 'Konferencja',
    year: '2025',
    client: 'TODO: nazwa klienta (za zgodą)',
    clientLogo: undefined, // TODO: logo (za zgodą klienta)
    guestCount: 0, // TODO: zweryfikowana liczba gości
    spacesUsed: ['The Cork', 'SiSi'],
    services: ['TODO: faktycznie zrealizowane usługi'],
    image: undefined, // TODO: profesjonalne zdjęcie z wydarzenia
    imageAlt: everyLocale('TODO: opis zdjęcia'),
    gallery: [],
    title: everyLocale('Przykładowa realizacja (szablon)'),
    summary: everyLocale('To jest przykładowy rekord. Nie jest publikowany.'),
    challenge: everyLocale('TODO: wyzwanie'),
    solution: everyLocale('TODO: rozwiązanie'),
    results: undefined, // TODO: tylko zweryfikowane wyniki
    testimonial: undefined, // TODO: tylko zatwierdzona przez klienta opinia
    seo: {
      title: everyLocale('Przykładowa realizacja - SiSi & The Cork'),
      description: everyLocale('Szablon rekordu realizacji.'),
    },
  },
];

/** Case studies safe to show publicly. */
export function publishedCaseStudies(): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.published).sort(
    (a, b) => Number(b.featured) - Number(a.featured),
  );
}
