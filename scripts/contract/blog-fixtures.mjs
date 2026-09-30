// BabyLoveGrowth fixtures for the BLG contract.
//
// Each payload has the shape scripts/articles-sync/normalize.mjs reads: the
// list summary merged with the detail response ({ ...summary, ...full }), with
// the vendor's mix of snake_case and camelCase keys, `jsonLd` and `faqJsonLd`
// as JSON strings, the hero repeated as the first body paragraph, and extra
// vendor fields the site must ignore. Nothing here changes what the vendor
// sends; the payloads only exercise how the site receives it.

const FILLER = 'Wrocław nocą to kluby, koktajle i muzyka na żywo przy Rzeźniczej. '.repeat(10);
const HERO_URL = (name) => `https://media.babylovegrowth.ai/blog-images/organization-52814/${name}.jpeg`;
const LONG_WORD = 'Nieprzerwanie'.repeat(10); // 130 characters, no break opportunity
const LONG_TOKEN = 'a1b2c3d4e5'.repeat(14); // 140 characters, looks like a hash or a URL slug
const MID_WORD = 'Nieprzerwanie'.repeat(2); // 26 characters: long, but fits a 375 px column

const vendorJsonLd = (headline, keywords) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline,
  keywords,
  url: 'https://blog.babylovegrowth.example/should-never-appear-on-our-pages',
  author: { '@type': 'Organization', name: 'Vendor Author' },
});

const vendorFaq = (pairs) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: pairs.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: `<p>${answer}</p>` },
  })),
});

const vendorExtras = { status: 'published', organization_id: 'org-52814', word_count: 1234, internal_notes: 'ignored by the site' };

const STANDARD_BODY = `
<p><img src="${HERO_URL('contract-standard-hero')}" alt="Hero" loading="lazy" decoding="async" /></p>
<h2>Spis treści</h2>
<ul><li><a href="#pierwsza">Pierwsza sekcja</a></li><li><a href="#druga">Druga sekcja</a></li></ul>
<h2>Pierwsza sekcja: Zażółć gęślą jaźń</h2>
<p>${FILLER}</p>
<p>Zajrzyj do <a href="https://sisiwroclaw.pl/pl/menu/">menu</a> albo na <a href="https://www.sisiwroclaw.pl/pl/rezerwacje/">rezerwacje</a>. Źródło: <a href="https://pl.wikipedia.org/wiki/Wroc%C5%82aw">Wikipedia</a>.</p>
<h2>Druga sekcja</h2>
<p><strong>Ważne:</strong> ćma, łódź, żółć, świerk, źdźbło i Ąę. ${FILLER}</p>
<ol><li>Krok pierwszy</li><li>Krok drugi</li></ol>
`;

const STRESS_BODY = `
<p><img src="${HERO_URL('contract-stress-hero')}" alt="Hero" /></p>
<h1>Nagłówek h1 wewnątrz treści musi zostać zdegradowany do h2</h1>
<h2>${'Bardzo długi nagłówek drugiego poziomu, który ciągnie się i ciągnie bez końca, '.repeat(4)}</h2>
<h3>Nagłówek trzeciego poziomu ze słowem ${MID_WORD} w środku i dalszym ciągiem tekstu</h3>
<p>Średnio długie słowo: ${MID_WORD}. ${FILLER}</p>
<table>
  <caption>Tabela testowa</caption>
  <thead><tr><th>Kolumna A</th><th>Kolumna B</th><th>Kolumna C</th><th>Kolumna D</th><th>Kolumna E</th><th>Kolumna F</th></tr></thead>
  <tbody>
    <tr><td>${MID_WORD}</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr>
    <tr><td>komórka z dłuższym tekstem, który się zawija</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr>
  </tbody>
</table>
<ul>
  <li>Poziom pierwszy
    <ul><li>Poziom drugi
      <ul><li>Poziom trzeci
        <ol><li>Numerowany w środku</li><li>Drugi numerowany</li></ol>
      </li></ul>
    </li></ul>
  </li>
  <li>Kolejny element</li>
</ul>
<blockquote cite="https://example.com/source"><p>Cytat blokowy z „polskimi cudzysłowami” i pauzą.</p><p>Drugi akapit cytatu.</p></blockquote>
<blockquote><blockquote><p>Cytat w cytacie.</p></blockquote></blockquote>
<pre><code>${'const veryLongLine = "x";'.repeat(20)}</code></pre>
<p><img src="https://media.babylovegrowth.ai/blog-images/organization-52814/no-alt-1.jpeg" /></p>
<p><img src="https://media.babylovegrowth.ai/blog-images/organization-52814/no-alt-2.jpeg" width="2400" height="1200" /></p>
<figure><img src="https://media.babylovegrowth.ai/blog-images/organization-52814/with-caption.jpeg" alt="Z podpisem" /><figcaption>Podpis pod zdjęciem</figcaption></figure>
<p>Unicode: zażółć gęślą jaźń, ŁÓDŹ, Čeština: příliš žluťoučký kůň, Deutsch: Größe Straße, 日本語のテキスト, emoji 🍸🎶, znak łączący: e&#769;.</p>
<p>${FILLER}</p>
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315">IFRAME-FALLBACK-MARKER</iframe>
<embed src="https://example.com/flash.swf" />
<object data="https://example.com/x.pdf">OBJECT-FALLBACK-MARKER</object>
<video src="https://example.com/v.mp4" controls>VIDEO-FALLBACK-MARKER</video>
<form action="https://example.com/collect" method="post"><input name="email" /><button>FORM-BUTTON-MARKER</button></form>
<script>window.__BLG_XSS__ = 'SCRIPT-MARKER'; document.title = 'pwned';</script>
<style>body { display: none } /* STYLE-MARKER */</style>
<svg onload="alert('SVG-MARKER')"><text>SVG-TEXT-MARKER</text></svg>
<p onclick="alert('ONCLICK-MARKER')" style="position:absolute;left:5000px" class="x" id="stress-para">Akapit z atrybutami, które trzeba usunąć. <a href="javascript:alert('JSHREF-MARKER')">zły link</a> <a href="data:text/html,DATAHREF-MARKER">data link</a> <a href="//evil.example/protocol-relative">protocol-relative</a></p>
<div><section><span>Nieznane opakowania zostają rozpakowane, a tekst zostaje.</span></section></div>
<p>${FILLER}</p>
`;

const LONG_TOKEN_BODY = `
<p><img src="${HERO_URL('contract-longtokens-hero')}" alt="Hero" /></p>
<h2>${LONG_WORD}</h2>
<p>Długie słowo bez spacji: ${LONG_WORD}. Długi token: ${LONG_TOKEN}. ${FILLER}</p>
<p>Źródło: <a href="https://example.com/${LONG_TOKEN}/${LONG_TOKEN}">https://example.com/${LONG_TOKEN}/${LONG_TOKEN}</a></p>
<table><tbody><tr><td>${LONG_WORD}</td><td>${LONG_TOKEN}</td></tr></tbody></table>
<pre><code>${LONG_TOKEN}${LONG_TOKEN}</code></pre>
<p>${FILLER}</p>
`;

const NO_HERO_BODY = `
<h2>Artykuł bez zdjęcia głównego</h2>
<p>${FILLER}</p>
<h2>Pytanie w treści</h2>
<p>${FILLER}</p>
`;

const EN_BODY = `
<p><img src="${HERO_URL('contract-standard-hero-en')}" alt="Hero" /></p>
<h2>Table of contents</h2>
<p>${'Wroclaw by night means clubs, cocktails and live music on Rzeźnicza street. '.repeat(10)}</p>
<h2>Second section</h2>
<p>${'Book a table ahead of time and arrive early. '.repeat(12)}</p>
`;

const CAMEL_BODY = `
<h2>Wariant camelCase</h2>
<p>${FILLER}</p>
`;

/** Articles the site must publish. `expect` documents what the contract asserts. */
export const ACCEPTED = [
  {
    expect: { locale: 'pl', hero: true, faq: 2, translatedTo: ['en'], keywords: true },
    payload: {
      id: 'blg-fixture-0001',
      slug: 'contract-fixture-standard',
      title: 'Zażółć gęślą jaźń: kontrakt BLG dla standardowego artykułu',
      meta_description: 'Standardowy artykuł testowy w kształcie, w jakim dostarcza go BabyLoveGrowth: nagłówki, listy, linki i pytania FAQ do sprawdzenia szablonu.',
      content_html: STANDARD_BODY,
      content_markdown: '# ignored by the site',
      hero_image_url: HERO_URL('contract-standard-hero'),
      jsonLd: vendorJsonLd('Standardowy artykuł', 'kontrakt, blog, wrocław'),
      faqJsonLd: vendorFaq([
        ['Czy fixture jest prawdziwym artykułem?', 'Nie, to dane testowe kontraktu.'],
        ['Kiedy działa test?', 'Przy każdym uruchomieniu npm run contract.'],
      ]),
      languageCode: 'pl',
      publishedAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-02T09:30:00.000Z',
      ...vendorExtras,
    },
  },
  {
    expect: { locale: 'pl', hero: true, faq: 0, stress: true },
    payload: {
      id: 'blg-fixture-0002',
      slug: 'contract-fixture-stress',
      title: 'Stres: tabele, cytaty, listy zagnieżdżone i osadzenia do usunięcia, czyli test szablonu artykułu',
      meta_description: 'Artykuł testowy z tabelą, zagnieżdżonymi listami, cytatami, osadzeniami do usunięcia, obrazami bez opisu, długimi słowami i znakami spoza łaciny.',
      content_html: STRESS_BODY,
      hero_image_url: HERO_URL('contract-stress-hero'),
      jsonLd: vendorJsonLd('Stres', 'tabele,listy, cytaty'),
      languageCode: 'pl',
      publishedAt: '2026-09-03T08:00:00Z',
      ...vendorExtras,
    },
  },
  {
    // Unbroken strings wider than a phone screen: a heading, a paragraph, link text.
    expect: { locale: 'pl', hero: true, faq: 0, longTokens: true },
    payload: {
      id: 'blg-fixture-0006',
      slug: 'contract-fixture-longtokens',
      title: `Długie tokeny: ${LONG_WORD.slice(0, 70)} w tytule`,
      meta_description: 'Artykuł testowy z ciągami znaków bez spacji: w tytule, nagłówku, akapicie, tekście linku, komórce tabeli i bloku kodu.',
      content_html: LONG_TOKEN_BODY,
      hero_image_url: HERO_URL('contract-longtokens-hero'),
      languageCode: 'pl',
      publishedAt: '2026-09-03T09:00:00Z',
      ...vendorExtras,
    },
  },
  {
    expect: { locale: 'pl', hero: false, faq: 1 },
    payload: {
      id: 'blg-fixture-0003',
      slug: 'contract-fixture-no-hero',
      title: 'Artykuł bez zdjęcia głównego',
      meta_description: 'Artykuł testowy bez hero_image_url, który musi się wyrenderować bez zdjęcia głównego i bez błędów w metadanych.',
      content_html: NO_HERO_BODY,
      jsonLd: vendorJsonLd('Bez zdjęcia', 'bez zdjęcia'),
      faqJsonLd: vendorFaq([['Czy strona ma zdjęcie główne?', 'Nie, ten artykuł go nie ma.']]),
      languageCode: 'pl',
      publishedAt: '2026-09-04T08:00:00Z',
      ...vendorExtras,
    },
  },
  {
    expect: { locale: 'en', hero: true, faq: 0, translatedTo: ['pl'] },
    payload: {
      id: 'blg-fixture-0004',
      slug: 'contract-fixture-standard',
      title: 'Contract fixture: a standard translated article',
      meta_description: 'English edition of the standard test article, published under the same slug so both pages cross-link through hreflang.',
      content_html: EN_BODY,
      hero_image_url: HERO_URL('contract-standard-hero-en'),
      languageCode: 'en-GB',
      publishedAt: '2026-09-01T08:05:00Z',
      ...vendorExtras,
    },
  },
  {
    expect: { locale: 'pl', hero: false, faq: 0, camel: true },
    payload: {
      id: 'blg-fixture-0005',
      slug: 'Contract Fixture Camel Case!',
      title: 'Wariant camelCase payloadu',
      metaDescription: 'Ten sam kształt danych z kluczami camelCase: contentHtml, metaDescription, language_code i published_at.',
      contentHtml: CAMEL_BODY,
      language_code: 'pl-PL',
      published_at: '2026-09-05',
      ...vendorExtras,
    },
    publishedSlug: 'contract-fixture-camel-case',
  },
];

/** Rows the sync must skip (bad-row policy); the site must never show them. */
export const REJECTED = [
  {
    reason: 'unverified 21+ claim',
    payload: { id: 'blg-bad-0001', slug: 'contract-fixture-rejected-claim', title: 'Odrzucony: wstęp od 21+', meta_description: 'x', content_html: `<p>Wstęp tylko dla osób 21+.</p><p>${FILLER}</p>`, languageCode: 'pl', publishedAt: '2026-09-06T08:00:00Z' },
  },
  {
    reason: 'unsupported language',
    payload: { id: 'blg-bad-0002', slug: 'contract-fixture-rejected-lang', title: 'Artículo en español', meta_description: 'x', content_html: `<p>${FILLER}</p>`, languageCode: 'es', publishedAt: '2026-09-06T08:00:00Z' },
  },
  {
    reason: 'stub body',
    payload: { id: 'blg-bad-0003', slug: 'contract-fixture-rejected-stub', title: 'Za krótki', meta_description: 'x', content_html: '<p>Krótko.</p>', languageCode: 'pl', publishedAt: '2026-09-06T08:00:00Z' },
  },
];

/** Strings that must not survive into the published page (raw-text elements are dropped WITH content). */
export const STRIPPED_MARKERS = [
  'IFRAME-FALLBACK-MARKER', 'SCRIPT-MARKER', 'STYLE-MARKER', 'SVG-MARKER', 'SVG-TEXT-MARKER',
  'ONCLICK-MARKER', 'JSHREF-MARKER', 'DATAHREF-MARKER', 'should-never-appear-on-our-pages',
];

/** Fallback text inside object / video / form / button: the sanitiser drops the tag and keeps the text.
    Harmless (escaped plain text) but it contradicts the "dropped with their content" wording in docs/BLOG.md. */
export const TEXT_KEPT_MARKERS = ['OBJECT-FALLBACK-MARKER', 'VIDEO-FALLBACK-MARKER', 'FORM-BUTTON-MARKER'];
