# Blog audit: SiSi Wrocław elevate run

Audit date 2026-09-29. Scope: the 31 Polish posts in `src/data/articles.generated.ts` (synced from BabyLoveGrowth, rendered under `/pl/blog/<slug>/`). Baseline: `main` e1feb25. Full per-post detail is in `blog-audit.json` next to this file.

**Approval gate.** Everything in the recommendation columns is **Rec**. Nothing is deleted, noindexed, merged or redirected without Ignacy's approval, and this audit changed no site file. It wrote only this file and `blog-audit.json`.

**Labels.** Confirmed = seen in code, output or the local build. Rec = recommendation. Assumption. Inference. PENDING = unresolved decision. Findings about built pages are Confirmed (local build); production `www.sisiwroclaw.pl` was unreachable and no Search Console or analytics data was available (Assumption: such data exists elsewhere).

Post titles are shown with dashes replaced by hyphens. Quotes are verbatim from the sanitized html, checked by script.

## 1. Verdict

**The blog hurts more than it helps in its current form. [Inference]**

- 31 posts, 51,146 words in total (mean 1,650), published in 28 days. **[Confirmed]**
- 23 of the 31 are explainers about wine, spirits, food or a city jazz scene. Only 8 are about booking, hosting or the night itself. This split is my classification. **[Inference]**
- Only about 12% of the text mentions SiSi, and most of that is generic pitch. The posts almost never say what only SiSi can say (no prices per drink, no dish names, no lineup, no door rules). **[Confirmed]**
- I checked 117 statements about SiSi against the site's own sources: 55 match, 20 contradict a source, 42 cannot be verified from the sources. **[Confirmed]**
- 9 posts hard-contradict the sources (for example, a mezcal cocktail list, an Aperol Spritz, a Sauvignon Blanc tasting, an aperitivo at 17:00 for a club that opens at 22:00). 4 more mislead in smaller ways. Only 4 of 31 posts have no unverifiable or contradicting claim. **[Confirmed]**
- Every post has a dead table of contents, a signature naming Ignacy Jurkowski under first-person opinions, and third-party hosted images; 25 also carry run-on vendor text. **[Confirmed (local build)]**
- The same text is published in `llms-full.txt`, so the unsupported claims also reach AI answer engines. **[Confirmed (local build)]**
- What works: 30 of 31 posts link to the reservations page, heroes are self-hosted and responsive, BlogPosting and BreadcrumbList data are present, and the sanitizer strips scripts. **[Confirmed (local build)]**
- Not known: traffic and rankings. If a post already earns clicks, prefer rewrite to remove. **[Assumption]**

**Posts that contradict the source of truth**, with the source: aperitivo-wroclaw (hours), aperol-vs-campari (bar menu), mezcal-vs-tequila (bar menu), tequila-reposado-vs-anejo (bar menu), tequila-blanco-vs-reposado (food and bar menu), polskie-wina-musujace (wine list), chardonnay-vs-sauvignon-blanc (wine list), pinot-grigio-vs-pinot-gris (wine list, careers page), urodziny-w-klubie-pomysly (reservation rules). Softer: rezerwacja-stolika-koszt-wroclaw (regulamin has no cancellation rule), nocne-menu-co-to (Friday entry is free), kieliszki-do-wina (booking route), koncert-klubowy-co-to (dress code). **[Confirmed]** Details in section 6.

**Fastest reversible step [Rec]:** noindex the 9 hard-contradiction posts until each is rewritten or removed. Needs Ignacy's approval.

## 2. Numbers at a glance [Confirmed]

| Measure | Value | How |
| --- | --- | --- |
| Posts | 31, all `pl` | `node` conversion of `articles.generated.ts` |
| Publish window | 2026-09-02 to 2026-09-29; two posts on 09-02, 09-28 and 09-29, one on every other day | `publishedAt` |
| Words (sanitized html text) | 51,146 total, mean 1,650, min 1,032, max 2,579 | Python `html.parser`, all text nodes |
| Internal links | 157 (reservations in 30 posts, menu in 8, private events in 23, events page in 0, contact in 0, other posts in 0) | href scan of the html |
| External links | 287 to 149 domains; all `target=_blank rel=noopener`, none nofollow; 2 to babylovegrowth.ai | href scan |
| Body images | 115, all third-party (94 supabase.co, 21 media.babylovegrowth.ai); 19 alt texts end in "overview diagram" | img scan |
| Claims about SiSi checked | 117: 55 Matches, 20 Contradicts, 42 Unverifiable | manual comparison with source files |
| Reading load | FOG-PL proxy mean 12.9 (range 10.5 to 15.1); mean sentence 18.2 words | see section 8 (Inference) |
| Recommendations | 10 rewrite, 11 merge, 10 remove, 0 keep, 0 noindex (interim noindex suggested for 9) | section 5 |

## 3. Sources of truth used

- Hours: Friday and Saturday 22:00-04:00 (`src/data/site.ts:90`, `src/i18n/ui/pl.ts:11`). **[Confirmed]**
- Reservation rules (`pl.ts:325-337`): 100 zł per person credited to the bill; Friday entry free with a reservation; Saturday +40 zł per person; collect the reservation 22:00-23:00; table may be released after 30 minutes late; valid ID; selection and smart casual dress code, refusal possible even with a reservation; prepayment confirms the booking; wait for acceptance. **[Confirmed]**
- Bar menu (`src/data/bar-menu.ts`): 33 cocktails, 7 mocktails, 9 Polish wines (2 by the glass), champagne (Mumm, Perrier-Jouët), spirits, 3 draught and 5 bottled beers. Food (`food-menu.ts`): Night Menu by The Cork, no dessert. Legal text: `src/i18n/legal.ts`. **[Confirmed]**
- Sync gate: `src/lib/claims.mjs` blocks only age ("21+"), "120 minut", geo metadata and "InStock" patterns. It does not check prices, hours, menu items or service claims, which is why all 31 posts passed; I re-ran it over html, title, description and excerpt and 0 of 31 are flagged. **[Confirmed]**

**PENDING: the sources disagree with each other.** The regulamin says Saturday entry is 30 zł and the reservation may be collected 22:00-23:30 (`legal.ts:42,44`). The reservations page copy says 40 zł and 22:00-23:00 (`pl.ts:327,328`). I used the page copy, as instructed. The posts also follow the page copy. Ignacy to confirm which is current. **[Confirmed]**

## 4. Defects shared by every post

1. **Dead table of contents, 31 of 31.** The sanitizer keeps no attributes on headings (`scripts/articles-sync/sanitize.mjs:37`), so heading ids vanish while the vendor "Spis treści" keeps its `#fragment` links. 0 ids in any body, 6 to 14 dead anchors per post. **[Confirmed (local build)]**
2. **Run-on vendor card, 25 of 31.** The call-to-action card is unwrapped to loose text: "Odkryj polskie wina w SiSiW SiSi znajdziesz polskie wina..." (`articles.generated.ts:12`). **[Confirmed]**
3. **Signature "Ignacy Jurkowski", 31 of 31** (29 in full, 2 with the first name only), under first-person lines such as "Największym błędem, jaki widzę..." and "Moim zdaniem...". The structured data says the author is the Organization (`src/data/articles.ts:132`). Whether Ignacy wrote or approved these lines is unknown. Assumption: the name comes from a BabyLoveGrowth author setting. **[Confirmed]** for the signature, **[Assumption]** for its origin. PENDING: Ignacy to confirm.
4. **Templated blocks.** "Krótko mówiąc" box in 31 posts; "Porada profesjonalisty" (calque of "Pro tip") 41 times in 29 posts; "Perspektywa SiSi/redakcji/autora" in 13; "Konwencjonalna mądrość/porada" in 7. **[Confirmed]**
5. **English text in Polish posts.** Two disclaimers ("This article is general information, not a substitute for advice from a qualified lawyer/doctor.") and two vendor footers with a follow link: "Created with BabyLoveGrowth to grow your link profile" (aperol-vs-campari) and "Written with help from BabyLoveGrowth" (tequila-blanco-vs-reposado). **[Confirmed (local build)]**
6. **Third-party images and links.** 115 body images load from supabase.co and media.babylovegrowth.ai. 27 posts reuse one supabase-hosted photo named `sisiwroclaw.jpg`. Outbound links and mentions include venues that compete for the same evening (Mollinari and Le Baromètre in aperitivo-wroclaw; club sites such as avalonclub.pl and klubdiament.pl, the last two an Inference from the domain names) and one US site behind the anchor "menu degustacyjnego na prywatne wydarzenia" (prosecco-vs-cava). **[Confirmed (local build)]**
7. **No internal web.** No post links to another post, to the events page or to the contact page. Only 8 link to the menu. **[Confirmed (local build)]**
8. **Prices typed into prose.** Three posts state 100 zł and 40 zł (nocne-menu-co-to, afterparty-co-to, dekantacja-wina). All omit that the 100 zł is credited to the bill and that Friday entry is free. If the price changes, these three go stale without a warning. **[Confirmed]**

## 5. Per post

### Table 1. Metrics and links

Words = all text in the sanitized html. Headings = h2 to h4 in the sanitized html, including vendor sections (Spis treści, Źródła, FAQ, Rekomendacje). Links = internal / external, in the body. **[Confirmed]**

| # | Slug | Title | Published | Words | Headings (h2/h3/h4) | Links int / ext | Cluster |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `wino-naturalne-vs-klasyczne` | Wino naturalne vs klasyczne: co faktycznie odróżnia te style | 2026-09-29 | 2,262 | 19 (15/4/0) | 4 / 8 | Still wine knowledge |
| 2 | `wino-kieliszek-czy-butelka` | Wino: kieliszek czy prosto z butelki? | 2026-09-29 | 1,574 | 15 (10/5/0) | 5 / 10 | Still wine knowledge |
| 3 | `rezerwacja-stolika-koszt-wroclaw` | Rezerwacja stolika we Wrocławiu: ile kosztuje i co sprawdzić przed płatnością | 2026-09-28 | 1,032 | 12 (8/4/0) | 8 / 9 | Guest logistics (booking) |
| 4 | `nocne-menu-co-to` | Nocne menu, czyli co dokładnie oznacza ten termin | 2026-09-28 | 1,393 | 16 (12/4/0) | 5 / 8 | Aperitif, food and pairing |
| 5 | `budzet-na-impreze-klubowa` | Budżet na imprezę klubową: ile zarezerwować i jak go rozplanować | 2026-09-27 | 1,352 | 14 (10/4/0) | 5 / 7 | Private events and party planning |
| 6 | `afterparty-co-to` | Afterparty co to? Znaczenie, konteksty i jak dobrze je zorganizować | 2026-09-26 | 2,161 | 18 (13/5/0) | 10 / 11 | Private events and party planning |
| 7 | `dekantacja-wina` | Dekantacja wina: kiedy i jak to robić prawidłowo | 2026-09-25 | 1,835 | 17 (12/5/0) | 5 / 9 | Still wine knowledge |
| 8 | `bourbon-vs-szkocka` | Bourbon vs szkocka - jak wybrać swoją pierwszą whisky | 2026-09-24 | 1,510 | 13 (9/4/0) | 2 / 11 | Whisky and classic cocktails |
| 9 | `old-fashioned-vs-manhattan` | Old fashioned vs manhattan: co naprawdę różni te dwa klasyki | 2026-09-23 | 1,996 | 18 (13/5/0) | 5 / 14 | Whisky and classic cocktails |
| 10 | `etykieta-na-parkiecie` | Etykieta na parkiecie: zasady dobrego zachowania w klubie | 2026-09-22 | 1,579 | 18 (13/5/0) | 8 / 8 | Live music and going out |
| 11 | `koktajle-do-kolacji` | Koktajle do kolacji: co zamówić w klubie | 2026-09-21 | 2,496 | 20 (15/5/0) | 8 / 9 | Aperitif, food and pairing |
| 12 | `aperitif-co-to` | Aperitif co to jest i jak podać go przed kolacją | 2026-09-20 | 1,380 | 15 (11/4/0) | 5 / 9 | Aperitif, food and pairing |
| 13 | `open-bar-vs-cash-bar` | Open bar czy cash bar? Jak wybrać model baru na imprezę | 2026-09-19 | 1,717 | 17 (12/5/0) | 5 / 4 | Private events and party planning |
| 14 | `jazz-na-zywo-wroclaw` | Jazz na żywo we Wrocławiu: gdzie go szukać w 2026 roku | 2026-09-18 | 1,403 | 15 (10/5/0) | 6 / 9 | Live music and going out |
| 15 | `urodziny-w-klubie-pomysly` | Urodziny w klubie: pomysły gotowe do wdrożenia od ręki | 2026-09-17 | 1,727 | 17 (12/5/0) | 4 / 10 | Private events and party planning |
| 16 | `koncert-klubowy-co-to` | Koncert klubowy co to znaczy i czym różni się od innych występów | 2026-09-16 | 1,505 | 16 (11/5/0) | 7 / 8 | Live music and going out |
| 17 | `aperitivo-wroclaw` | Aperitivo Wrocław: gdzie na spritz i przekąski po pracy | 2026-09-15 | 1,460 | 15 (10/5/0) | 6 / 3 | Aperitif, food and pairing |
| 18 | `tapas-co-to` | Tapas co to: hiszpańska sztuka jedzenia małymi porcjami | 2026-09-14 | 1,631 | 15 (10/5/0) | 4 / 10 | Aperitif, food and pairing |
| 19 | `wino-wytrawne-vs-polwytrawne` | Wino wytrawne vs półwytrawne: czym się różnią i co wybrać | 2026-09-13 | 1,400 | 15 (10/5/0) | 4 / 10 | Still wine knowledge |
| 20 | `zabawa-bez-alkoholu` | Zabawa bez alkoholu: pomysły, które naprawdę działają | 2026-09-12 | 1,315 | 15 (11/4/0) | 7 / 10 | Non-alcoholic |
| 21 | `polskie-wina-musujace` | Polskie wina musujące: jak wybrać styl i dobrze go zaserwować | 2026-09-11 | 2,579 | 15 (10/5/0) | 4 / 9 | Sparkling wine |
| 22 | `mocktail-co-to` | Mocktail co to? Definicja, techniki i przepisy na drinki bez alkoholu | 2026-09-10 | 1,975 | 11 (11/0/0) | 4 / 10 | Non-alcoholic |
| 23 | `prosecco-vs-cava` | Plan na 20 osób dla gospodarzy: Prosecco na powitanie, Cava do kolacji | 2026-09-09 | 1,528 | 12 (12/0/0) | 8 / 10 | Sparkling wine |
| 24 | `tequila-reposado-vs-anejo` | Barman radzi: reposado czy añejo, do koktajlu czy do degustacji | 2026-09-08 | 1,724 | 11 (11/0/0) | 3 / 12 | Agave spirits |
| 25 | `chardonnay-vs-sauvignon-blanc` | Wybierz wino do potrawy: Chardonnay czy sauvignon blanc | 2026-09-07 | 1,634 | 13 (13/0/0) | 3 / 10 | Still wine knowledge |
| 26 | `pinot-grigio-vs-pinot-gris` | 3 kroki, by wybrać pinot: rozpoznaj grigio i gris we Wrocławiu | 2026-09-06 | 1,347 | 10 (10/0/0) | 4 / 10 | Still wine knowledge |
| 27 | `kieliszki-do-wina` | 3 kieliszki, które każdy klub powinien mieć i jak je serwować | 2026-09-05 | 1,794 | 13 (13/0/0) | 2 / 11 | Still wine knowledge |
| 28 | `mezcal-vs-tequila` | Prawie 50 gatunków agawy: co odróżnia mezcal od tequili | 2026-09-04 | 1,333 | 10 (10/0/0) | 2 / 8 | Agave spirits |
| 29 | `martini-dry-vs-wet` | 2:1 czy 6:1, jak zamówić suche lub mokre martini w barze | 2026-09-03 | 1,398 | 11 (11/0/0) | 5 / 9 | Whisky and classic cocktails |
| 30 | `tequila-blanco-vs-reposado` | Jak 60 dni zmienia smak tequili: blanco czy reposado dla barmanów | 2026-09-02 | 1,151 | 9 (9/0/0) | 3 / 8 | Agave spirits |
| 31 | `aperol-vs-campari` | Aperol czy Campari: 11% kontra 24-25% alkoholu, co wybrać w SiSi | 2026-09-02 | 1,955 | 14 (14/0/0) | 6 / 13 | Whisky and classic cocktails |

### Table 2. What only SiSi could say, and how the claims check out

"Only-SiSi text" is the first venue-specific sentence in the post, quoted. "Share" is the part of the text in paragraphs that name SiSi, The Cork or "we" (Inference: a rough proxy; the rest is generic explainer; kieliszki-do-wina says "lokal" instead of the name, so it reads 0%). M/C/U = claims Matching, Contradicting, Unverifiable against the sources. **[Confirmed]** for verdicts.

| # | Slug | Only-SiSi text (first quote) | Share | M/C/U | Worst claim |
| --- | --- | --- | --- | --- | --- |
| 1 | `wino-naturalne-vs-klasyczne` | "Karta win SiSi daje Ci wybór polskich etykiet obu stylów" | 4% | 1/0/4 | Unverifiable: "Karta win SiSi daje Ci wybór polskich etykiet obu stylów" |
| 2 | `wino-kieliszek-czy-butelka` | "Stolik możesz zarezerwować z wyprzedzeniem, co ma sens zwłaszcza w soboty, kiedy obowiązuje..." | 2% | 3/0/0 | All Matches |
| 3 | `rezerwacja-stolika-koszt-wroclaw` | "SiSi udostępnia jasne zasady rezerwacji na własnej stronie." | 18% | 3/1/0 | Contradicts: "Zasady rezerwacji i ewentualnego odwołania znajdziesz w regulaminie klubu." |
| 4 | `nocne-menu-co-to` | "SiSi we Wrocławiu oferuje nocne menu przygotowane we współpracy z restauracją The Cork" | 18% | 3/1/2 | Contradicts: "kosztuje około 100 zł od osoby, a wstęp na weekendowe wydarzenia wynosi około 40 z..." |
| 5 | `budzet-na-impreze-klubowa` | "Można znaleźć opcję łączącą kolację z The Cork i wieczór klubowy w jednym adresie." | 11% | 1/0/2 | Unverifiable: "co najmniej 200 do 350 złotych na osobę" |
| 6 | `afterparty-co-to` | "W Sisi Wrocław rezerwacja stolika wynosi 100 zł od osoby, a wstęp do klubu w soboty kosztuje..." | 11% | 3/0/1 | Unverifiable: "Wstęp w soboty dla gości chcących dołączyć do klubowej imprezy bez wcześniejszej r..." |
| 7 | `dekantacja-wina` | "Nasz personel ocenia każdą butelkę indywidualnie i sięga po karafkę tylko wtedy, gdy wino fa..." | 15% | 2/0/2 | Unverifiable: "Nasz personel ocenia każdą butelkę indywidualnie i sięga po karafkę tylko wtedy, g..." |
| 8 | `bourbon-vs-szkocka` | "barmani doradzają, czy sięgnąć po bourbon, czy po szkocką, zależnie od nastroju i doświadczenia" | 12% | 2/0/1 | Unverifiable: "barmani doradzają, czy sięgnąć po bourbon, czy po szkocką, zależnie od nastroju i..." |
| 9 | `old-fashioned-vs-manhattan` | "SiSi Wrocław serwuje autorskie wersje old fashioned i manhattana w ramach swojej karty kokta..." | 6% | 2/0/1 | Unverifiable: "wstęp w soboty obejmuje wejście do klubu z muzyką na żywo i DJ-ami do samego rana" |
| 10 | `etykieta-na-parkiecie` | "Współpraca z restauracją The Cork sprawia, że wieczór można zacząć od kolacji, a skończyć w..." | 20% | 3/0/1 | Unverifiable: "ogranicza przypadkowy tłok wokół Twojej grupy" |
| 11 | `koktajle-do-kolacji` | "W SiSi barmani przygotowują autorskie koktajle w wersji „dinner-friendly” właśnie pod takim..." | 7% | 2/0/3 | Unverifiable: "W SiSi barmani przygotowują autorskie koktajle w wersji „dinner-friendly” właśnie..." |
| 12 | `aperitif-co-to` | "Karta koktajli i alternatyw bezalkoholowych w SiSi została stworzona z myślą o takich właśni..." | 18% | 4/0/0 | All Matches |
| 13 | `open-bar-vs-cash-bar` | "Organizujemy imprezy prywatne i eventy firmowe, gdzie sami zajmujemy się terminalem, obsługą..." | 5% | 2/0/2 | Unverifiable: "sami zajmujemy się terminalem, obsługą paragonów i logistyką stanowiska barowego" |
| 14 | `jazz-na-zywo-wroclaw` | "SiSi łączy oba te elementy pod jednym dachem w centrum Wrocławia" | 19% | 2/0/2 | Unverifiable: "SiSi: klub muzyczny w centrum Wrocławia na kameralny wieczór z jazzem" |
| 15 | `urodziny-w-klubie-pomysly` | "Rezerwację w klubie SiSi warto rozpocząć od formularza on-line, co gwarantuje dostępny termi..." | 17% | 2/1/2 | Contradicts: "co gwarantuje dostępny termin i spójność ustaleń na każdym etapie organizacji" |
| 16 | `koncert-klubowy-co-to` | "Klub SiSi we Wrocławiu łączy muzykę na żywo z gastronomią i obsługą VIP" | 14% | 2/1/2 | Contradicts: "W większości klubów nie obowiązuje formalny dress code, więc wystarczy strój swobo..." |
| 17 | `aperitivo-wroclaw` | "najlepszą lokalną propozycją jest SiSi" | 31% | 2/2/1 | Contradicts: "Jeśli szukasz aperitivo w centrum Wrocławia, najlepszą lokalną propozycją jest SiSi" |
| 18 | `tapas-co-to` | "Nocne menu do dzielenia, przygotowane we współpracy z restauracją The Cork, działa na tej sa..." | 14% | 3/0/0 | All Matches |
| 19 | `wino-wytrawne-vs-polwytrawne` | "W SiSi Wrocław serwujemy polskie wina obu stylów" | 10% | 2/0/1 | Unverifiable: "poproś obsługę o degustację porównawczą polskich win" |
| 20 | `zabawa-bez-alkoholu` | "Wieczór bez alkoholu można u nas zbudować wokół strefy mocktaili, żywej muzyki i nocnego men..." | 7% | 1/0/1 | Unverifiable: "Wieczór bez alkoholu można u nas zbudować wokół strefy mocktaili, żywej muzyki i n..." |
| 21 | `polskie-wina-musujace` | "możesz spróbować kilku stylów polskich win musujących jednego wieczoru" | 11% | 0/2/1 | Contradicts: "możesz spróbować kilku stylów polskich win musujących jednego wieczoru" |
| 22 | `mocktail-co-to` | "Sisi Wrocław serwuje autorskie koktajle bezalkoholowe przygotowane z tą samą starannością, c..." | 12% | 2/0/1 | Unverifiable: "Zapytaj o to już na etapie rezerwacji, żebyśmy mogli przygotować odpowiednią liczb..." |
| 23 | `prosecco-vs-cava` | "Sisi Wrocław to miejsce w sercu miasta, gdzie oprócz autorskich koktajli i belgijskich piw z..." | 13% | 2/0/0 | All Matches |
| 24 | `tequila-reposado-vs-anejo` | "W naszym menu koktajlowym reposado pojawia się tam, gdzie potrzebujemy balansu między agawą..." | 8% | 0/2/1 | Contradicts: "reposado pojawia się tam, gdzie potrzebujemy balansu między agawą a drewnem, na pr..." |
| 25 | `chardonnay-vs-sauvignon-blanc` | "Oferta win jest dostosowana do nocnego menu do dzielenia." | 10% | 2/1/1 | Contradicts: "można w jeden wieczór postawić na stole kieliszek Chardonnay obok kieliszka Sauvig..." |
| 26 | `pinot-grigio-vs-pinot-gris` | "Testujemy styl przy stole, sprawdzając reakcję na przyprawy i sosy z karty przygotowanej wsp..." | 13% | 1/2/1 | Contradicts: "spróbować kilku stylów pinot gris i pinot grigio przy jednym stole" |
| 27 | `kieliszki-do-wina` | "W praktyce oznacza to rozdzielone kieliszki do win czerwonych i białych, kontrolę temperatur..." | 0% | 0/1/2 | Contradicts: "Rezerwację stolika lub przestrzeni na wyłączność możesz zgłosić przez formularz re..." |
| 28 | `mezcal-vs-tequila` | "Tequila trafia do klasycznych, orzeźwiających kompozycji, a mezcal do bardziej wieczornych,..." | 9% | 1/2/1 | Contradicts: "od czystych, cytrusowych drinków na bazie tequili blanco po kompozycje z mezcalem..." |
| 29 | `martini-dry-vs-wet` | "Nasz zespół pilnuje świeżości wermutu i dobiera gin pod konkretny styl, który zamawiasz" | 18% | 2/0/2 | Unverifiable: "Nasz zespół pilnuje świeżości wermutu i dobiera gin pod konkretny styl, który zama..." |
| 30 | `tequila-blanco-vs-reposado` | "Współpraca z restauracją The Cork pozwala nam parować oba rodzaje tequili z nocnym menu, od..." | 7% | 0/2/2 | Contradicts: "od tuńczyka tataki do fondanta czekoladowego z tonką wonną" |
| 31 | `aperol-vs-campari` | "Nasz bar prowadzi zarówno klasyczny Aperol Spritz, jak i pełnokrwiste Negroni czy Boulevardier" | 10% | 0/2/2 | Contradicts: "Nasz bar prowadzi zarówno klasyczny Aperol Spritz, jak i pełnokrwiste Negroni czy..." |

### Table 3. Language, hero image and link to SiSi

FOG-PL is the reading-load proxy from section 8. Hero = judged by eye on a contact sheet of all 31. Natural link = the SiSi page that fits the topic; "linked" says whether the post already links it. **[Confirmed]** for links, **[Inference]** for judgements.

| # | Slug | FOG-PL | Polish or quality issue (quote) | Hero | Natural SiSi link |
| --- | --- | --- | --- | --- | --- |
| 1 | `wino-naturalne-vs-klasyczne` | 15.1 | "This article is general information, not a substitute for advice fr...": English boilerplate disclaimer inside a Polish article. | Relevant to the title: barrel, grapes, two glasses | `/pl/menu` (forced or weak, linked) |
| 2 | `wino-kieliszek-czy-butelka` | 12.7 | "Zasady dotyczące kształtu czaszy, porcji i nalewania pomagają w odp...": Filler sentence with no content; the SiSi section says how 'we take care' without one concrete fact. | Relevant: bottle, corkscrew, glass, grapes | `/pl/menu` (natural, linked) |
| 3 | `rezerwacja-stolika-koszt-wroclaw` | 12.7 | "This article is general information, not a substitute for advice fr...": English boilerplate disclaimer inside a Polish article. | Relevant: calendar, cutlery, menu card | `/pl/rezerwacje` (natural, linked) |
| 4 | `nocne-menu-co-to` | 14.3 | "zwykle od kilkunastu wieczorem do wczesnych godzin rannych": Garbled: 'od kilkunastu' has no noun. | Relevant: cloche, wine glass, garlic | `/pl/menu` (natural, linked) |
| 5 | `budzet-na-impreze-klubowa` | 14.0 | "ustal stawkę per capita": English/Latin term where 'na osobę' is used elsewhere in the same post. | Relevant: calculator, bar chart, coupe | `/pl/imprezy-prywatne` (natural, linked) |
| 6 | `afterparty-co-to` | 13.9 | "Afterparty nie jest tylko przedłużeniem imprezy w czasie.": 'Not just X' construction, a machine tell repeated across the corpus. | Relevant, and the only hero with a local motif: Wrocław skyline, vinyl, spotlight, cocktail | `/pl/imprezy-prywatne` (natural, linked) |
| 7 | `dekantacja-wina` | 13.5 | "SiSi to alternatywa dla samodzielnego eksperymentowania z karafką w...": Sales copy attached to a decanting explainer; nobody searches for this. | Relevant: decanter, cork, grapes | `/pl/menu` (forced or weak, linked) |
| 8 | `bourbon-vs-szkocka` | 12.0 | "Perspektywa SiSi: jak doradzamy gościom przy wyborze whisky": Calque of 'SiSi perspective'; the block is templated in 13 posts. | Relevant: corn, wheat, tumbler | `/pl/menu` (natural, not linked) |
| 9 | `old-fashioned-vs-manhattan` | 10.5 | "w wyjątkowej atmosferze": Filler adjective used in 20+ posts. | Relevant: rocks glass, cherries, coupe | `/pl/menu` (natural, linked) |
| 10 | `etykieta-na-parkiecie` | 11.9 | "autorskie koktezy": Typo ('koktajle'). | Relevant: disco ball, heels, vinyl | `/pl/regulamin` (natural, linked) |
| 11 | `koktajle-do-kolacji` | 12.9 | "Konwencjonalna porada mówi „dopasuj koktajl do dania”": Templated 'conventional wisdom' opener, 7 posts. | Relevant: plate, cocktail, wine | `/pl/menu` (natural, linked) |
| 12 | `aperitif-co-to` | 12.3 | "Aperitif co to jest i jak podać go przed kolacją": Title frames 'before dinner', while the venue opens at 22:00. | Relevant: olives, citrus, glass | `/pl/menu` (natural, linked) |
| 13 | `open-bar-vs-cash-bar` | 13.1 | "który model wybrać w 60 sekund": Clickbait heading pattern. | Relevant: cash register, menu, shaker | `/pl/imprezy-prywatne` (natural, linked) |
| 14 | `jazz-na-zywo-wroclaw` | 15.0 | "zamiast biegać między dwoma lokalami": Colloquial calque; also repeated in the SiSi block of several posts. | Relevant to jazz: saxophone, violin, microphone | `/pl/wydarzenia` (natural, not linked) |
| 15 | `urodziny-w-klubie-pomysly` | 13.2 | "Praktyka menedżerów klubowych": Anchor text promises an authority but links to SiSi's reservations page. | Relevant: cake, disco ball, turntable | `/pl/imprezy-prywatne` (natural, linked) |
| 16 | `koncert-klubowy-co-to` | 13.6 | "w mniejszości klubów nie obowiązuje formalny dress code": Logic error: it says the opposite of the FAQ ('w większości'). | Relevant: microphone, spotlights, ticket | `/pl/wydarzenia` (natural, not linked) |
| 17 | `aperitivo-wroclaw` | 12.6 | "Etykieta przy talerzach do dzielenia jest proste": Agreement error ('jest prosta'). | Relevant: spritz glass, vinyl, snacks | `/pl/menu` (forced or weak, not linked) |
| 18 | `tapas-co-to` | 11.5 | "kieliszek koktajlu w drugiej ręce": Unidiomatic ('kieliszek koktajlu'). | Relevant: tapas plates, peppers, wine | `/pl/menu` (natural, not linked) |
| 19 | `wino-wytrawne-vs-polwytrawne` | 13.8 | "Wielu gości po prostu jeszcze nie miało okazji spróbować dobrego pó...": Clumsy, patronising phrasing. | Relevant: grapes, glass, corkscrew | `/pl/menu` (natural, not linked) |
| 20 | `zabawa-bez-alkoholu` | 12.5 | "Wieczór gier planszowych i karcianych": Home party content (Dixit, Sabotażysta) in a night-club blog. | Relevant: coffee, cocktails, disco ball | `/pl/menu` (forced or weak, not linked) |
| 21 | `polskie-wina-musujace` | 14.5 | "Charmat, popularnie nazywany metodą frizzante": Term error: frizzante is a level of fizz, not a name for the Charmat method. | Relevant: champagne bucket, bubbles, grapes | `/pl/menu` (forced or weak, not linked) |
| 22 | `mocktail-co-to` | 13.0 | "Konwencjonalna mądrość mówi, że mocktail to „koktajl minus alkohol“": Templated 'conventional wisdom' opener. | Relevant: shaker, citrus, mint | `/pl/menu` (natural, not linked) |
| 23 | `prosecco-vs-cava` | 12.8 | "co przekłada się na lżejszą, bardziej pienistą musowanie": Gender agreement error. | Relevant: flutes, grapes, cork | `/pl/menu` (forced or weak, not linked) |
| 24 | `tequila-reposado-vs-anejo` | 13.5 | "Statystyka, która wiele wyjaśnia: różnica w czasie leżakowania": Template label 'Statystyka'; machine tone. | Relevant: agave, barrel, snifter | `/pl/menu` (natural, not linked) |
| 25 | `chardonnay-vs-sauvignon-blanc` | 11.2 | "Sauvignon Blanc jest uparty.": Personification pattern of a punchy AI opinion block. | Relevant: grapes, glasses, decanter | `/pl/menu` (natural, not linked) |
| 26 | `pinot-grigio-vs-pinot-gris` | 11.2 | "Pyszniej, że regiony takie jak Alto Adige i Friuli dają znacznie ba...": Garbled first word, the sentence has no meaning. | Relevant: vineyard, grapes, glasses | `/pl/menu` (forced or weak, not linked) |
| 27 | `kieliszki-do-wina` | 13.0 | "Zwężone wylotu skupia aromaty w jednym punkcie": Grammar error ('zwężony wylot skupia'). | Relevant: wine glasses, grapes | none (no natural link) |
| 28 | `mezcal-vs-tequila` | 12.1 | "obejmuje dedykowane menu alkoholowe": Calque of 'dedicated'. | Relevant: pineapple-agave, barrel, cups | `/pl/menu` (forced or weak, not linked) |
| 29 | `martini-dry-vs-wet` | 11.8 | "Moim zdaniem najczęściej popełnianym błędem jest ignorowanie świeżo...": First-person opinion, signed only 'Ignacy' (first name), unlike the other 29 posts. | Relevant: mixing glass, coupe, ice | `/pl/menu` (natural, not linked) |
| 30 | `tequila-blanco-vs-reposado` | 12.6 | "Niektóre blanco przechodzi krótkie „resting” w stali lub drewnie": Agreement error plus an English word in quotes. | Relevant: agave, barrel, drops, citrus | `/pl/menu` (natural, not linked) |
| 31 | `aperol-vs-campari` | 12.9 | "serwowane na dużym kloszu z lodem i plastrem pomarańczy": Wrong term: 'klosz' is a lampshade; a wine glass is meant. | Relevant: orange slices, glasses, spices | `/pl/menu` (forced or weak, not linked) |

### Table 4. Overlap and recommendation [Rec]

Nearest = highest full-text TF-IDF cosine to another post (section 7). Action is a recommendation only; each needs Ignacy's approval. "Interim" is a reversible first step.

| # | Slug | Nearest post (cosine) | Action | Target | Interim | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `wino-naturalne-vs-klasyczne` | `polskie-wina-musujace` (0.27) | **remove** |  |  | Longest post (2,262 words), health-adjacent, English disclaimer, and an unsupported claim about SiSi's wine list. |
| 2 | `wino-kieliszek-czy-butelka` | `kieliszki-do-wina` (0.32) | **rewrite** |  |  | Real guest question with a real SiSi answer (two wines by the glass, bottles 220-420 zł); absorbs the dry/semi-dry and Chardonnay posts. |
| 3 | `rezerwacja-stolika-koszt-wroclaw` | `budzet-na-impreze-klubowa` (0.19) | **rewrite** |  |  | Top guest question. Lead with SiSi's real terms (100 zł per person credited to the bill, Friday free entry, Saturday 40 zł, arrive 22:00-23:00, table released after 30 minutes, ID, smart casual, prepayment confirms) and drop the competitor and the cancellation pointer. |
| 4 | `nocne-menu-co-to` | `aperitivo-wroclaw` (0.24) | **rewrite** |  |  | Real guest question, but the generic half describes a different product. Rewrite around the actual Night Menu by The Cork; absorbs the tapas and cocktail-pairing posts. |
| 5 | `budzet-na-impreze-klubowa` | `open-bar-vs-cash-bar` (0.28) | **merge** | `urodziny-w-klubie-pomysly` |  | Same intent as the birthday and open-bar posts (plan and price a private night); one page with SiSi's real terms beats three generic ones. |
| 6 | `afterparty-co-to` | `koncert-klubowy-co-to` (0.26) | **rewrite** |  |  | SiSi opens at 22:00, which suits afterparties. Cut the etymology, keep accurate SiSi facts, add the private-events route. |
| 7 | `dekantacja-wina` | `wino-kieliszek-czy-butelka` (0.25) | **remove** |  |  | Decanting at home is not a night-venue topic and the SiSi service claims are unsupported. |
| 8 | `bourbon-vs-szkocka` | `tequila-reposado-vs-anejo` (0.31) | **merge** | `old-fashioned-vs-manhattan` |  | Same drinks shelf; SiSi's Old Fashioned and Manhattan are Scotch-based, which is the only angle only SiSi has. |
| 9 | `old-fashioned-vs-manhattan` | `aperol-vs-campari` (0.30) | **rewrite** |  |  | Best drinks hook on the blog: both classics are on the menu with prices. Rewrite as a short piece on SiSi's Scotch-based classics; absorbs bourbon-vs-szkocka and martini-dry-vs-wet. |
| 10 | `etykieta-na-parkiecie` | `koncert-klubowy-co-to` (0.18) | **merge** | `koncert-klubowy-co-to` |  | Same guest question (how to behave and what to expect on a night out); fold into the rewritten 'what to expect' page. |
| 11 | `koktajle-do-kolacji` | `aperol-vs-campari` (0.31) | **merge** | `nocne-menu-co-to` |  | Pairing drinks with the Night Menu is one page; the generic pairing theory adds nothing SiSi can back up. |
| 12 | `aperitif-co-to` | `aperitivo-wroclaw` (0.27) | **rewrite** |  |  | Keep one aperitif page, built on the seven spritzes actually on the menu; absorbs aperitivo-wroclaw. |
| 13 | `open-bar-vs-cash-bar` | `budzet-na-impreze-klubowa` (0.28) | **merge** | `urodziny-w-klubie-pomysly` |  | Bar model is one section of a private-event page; SiSi's real open bar and open tab terms belong there. |
| 14 | `jazz-na-zywo-wroclaw` | `koncert-klubowy-co-to` (0.25) | **remove** |  |  | A city jazz guide that will date quickly and steers guests to a night SiSi does not describe as jazz. |
| 15 | `urodziny-w-klubie-pomysly` | `budzet-na-impreze-klubowa` (0.27) | **rewrite** |  | noindex | Best private-events hook. Rewrite on SiSi, The Cork or all of R32 for hire, open bar or open tab, contract plus deposit, 663 m2; absorbs the budget and open-bar posts. |
| 16 | `koncert-klubowy-co-to` | `afterparty-co-to` (0.26) | **rewrite** |  |  | 'What to expect' is a real guest question. Rewrite with the house rules (smart casual, ID, door selection, arrival window); absorbs the dance-floor etiquette post. |
| 17 | `aperitivo-wroclaw` | `aperitif-co-to` (0.27) | **merge** | `aperitif-co-to` | noindex | Same intent as aperitif-co-to, contradicts opening hours and promotes competitors. |
| 18 | `tapas-co-to` | `aperitivo-wroclaw` (0.20) | **merge** | `nocne-menu-co-to` |  | Sharing plates by The Cork is the Night Menu story; the Spanish explainer serves no SiSi guest. |
| 19 | `wino-wytrawne-vs-polwytrawne` | `chardonnay-vs-sauvignon-blanc` (0.27) | **merge** | `wino-kieliszek-czy-butelka` |  | Dryness is a property of the SiSi wine list; one 'how to read the SiSi wine list' page serves guests better. |
| 20 | `zabawa-bez-alkoholu` | `mocktail-co-to` (0.22) | **remove** |  |  | Off-topic for the venue; the useful part (SiSi's 0% list) belongs in the mocktail rewrite. |
| 21 | `polskie-wina-musujace` | `prosecco-vs-cava` (0.35) | **remove** |  | noindex | Promises a Polish sparkling tasting that the wine list does not support; a shopping guide unrelated to a night out. |
| 22 | `mocktail-co-to` | `old-fashioned-vs-manhattan` (0.27) | **rewrite** |  |  | Real hook: seven 0% cocktails, Beefeater 0%, Prosecco 0%, Corona Cero. Rewrite as SiSi's non-alcoholic list. |
| 23 | `prosecco-vs-cava` | `polskie-wina-musujace` (0.35) | **remove** |  |  | Slug and title disagree, no SiSi product to point to, and it duplicates the sparkling cluster. |
| 24 | `tequila-reposado-vs-anejo` | `tequila-blanco-vs-reposado` (0.41) | **rewrite** |  | noindex | Keep one tequila page grounded in the real list (Olmeca, Altos, Patron Silver, Reposado, Añejo); absorbs blanco-vs-reposado. |
| 25 | `chardonnay-vs-sauvignon-blanc` | `pinot-grigio-vs-pinot-gris` (0.29) | **merge** | `wino-kieliszek-czy-butelka` | noindex | Claims a Sauvignon Blanc tasting the list does not have; keep only the Chardonnay angle inside the wine-list page. |
| 26 | `pinot-grigio-vs-pinot-gris` | `chardonnay-vs-sauvignon-blanc` (0.29) | **remove** |  | noindex | Promises a tasting of wines SiSi does not list and links wine to the careers page. |
| 27 | `kieliszki-do-wina` | `wino-kieliszek-czy-butelka` (0.32) | **remove** |  |  | Advice for venue managers, not guests, with a myth, a wrong booking route and no SiSi content. |
| 28 | `mezcal-vs-tequila` | `tequila-reposado-vs-anejo` (0.32) | **remove** |  | noindex | Promises mezcal cocktails that are not on the menu. |
| 29 | `martini-dry-vs-wet` | `old-fashioned-vs-manhattan` (0.27) | **merge** | `old-fashioned-vs-manhattan` |  | One page on SiSi's stirred classics (Dry Martini, Old Fashioned, Manhattan, Negroni) beats three explainers. |
| 30 | `tequila-blanco-vs-reposado` | `tequila-reposado-vs-anejo` (0.41) | **merge** | `tequila-reposado-vs-anejo` | noindex | Highest similarity pair (0.41): the same buying decision at a different age step. |
| 31 | `aperol-vs-campari` | `koktajle-do-kolacji` (0.31) | **remove** |  | noindex | Advertises drinks SiSi does not sell and a pre-dinner service it does not run. |

No post gets **keep**: each has at least the shared template defects from section 4, and 27 of 31 hold a claim about SiSi that cannot be verified or is contradicted. **[Inference]**

Suggested target end state [Rec]: 10 pages (the 10 rewrites), with the 11 merged posts redirected (301) to their targets and the 10 removed posts either deleted or, if they show real search traffic, kept noindexed while a rewrite is prepared. Merges and removals need per-slug overrides outside `articles.generated.ts`, which the sync overwrites (`docs/BLOG.md`).

## 6. Claims about SiSi that contradict a source [Confirmed]

| Post | Claim (quote) | Source that says otherwise | Class |
| --- | --- | --- | --- |
| `rezerwacja-stolika-koszt-wroclaw` | "Zasady rezerwacji i ewentualnego odwołania znajdziesz w regulaminie klubu." | src/i18n/legal.ts:39-47: section 3 has price, prepayment and pickup rules but no cancellation or refund rule (grep for odwoła, anulow, zwrot finds nothing) | soft |
| `nocne-menu-co-to` | "kosztuje około 100 zł od osoby, a wstęp na weekendowe wydarzenia wynosi około 40 zł od osoby" | src/i18n/ui/pl.ts:326-327: Friday entry is free and 40 zł applies on Saturday only; 'około' hedges fixed prices | soft |
| `urodziny-w-klubie-pomysly` | "co gwarantuje dostępny termin i spójność ustaleń na każdym etapie organizacji" | src/i18n/ui/pl.ts:336-337 and pl.ts:392: a reservation waits for acceptance and prepayment; a private event date is confirmed by contract and deposit | hard |
| `koncert-klubowy-co-to` | "W większości klubów nie obowiązuje formalny dress code, więc wystarczy strój swobodny i wygodne buty." | src/i18n/ui/pl.ts:330; src/i18n/legal.ts:34: SiSi applies selection and a smart casual dress code, and may refuse entry even with a reservation. Generic advice, but the post is a SiSi page. | soft |
| `aperitivo-wroclaw` | "Jeśli szukasz aperitivo w centrum Wrocławia, najlepszą lokalną propozycją jest SiSi" | src/data/site.ts:90; src/i18n/ui/pl.ts:11: SiSi opens Friday and Saturday 22:00-04:00; the same post says aperitivo happens 17:00-19:00 and advises 'Przyjdź przed 19:00' | hard |
| `aperitivo-wroclaw` | "Najlepsza pora to wczesny wieczór, między 17:00 a 19:00" | src/data/site.ts:90; src/i18n/ui/pl.ts:11 (generic advice presented next to a SiSi recommendation) | hard |
| `polskie-wina-musujace` | "możesz spróbować kilku stylów polskich win musujących jednego wieczoru" | src/data/bar-menu.ts:90-104: no Polish sparkling wine. Sparkling on the menu is G. H. Mumm and Perrier-Jouet champagne (bar-menu.ts:125-147), Martini Prosecco in spritzes and Prosecco 0% | hard |
| `polskie-wina-musujace` | "spróbować na degustacji w lokalu, takim jak Sisi Wrocław" | src/data/bar-menu.ts:90-104 (same reason) | hard |
| `tequila-reposado-vs-anejo` | "reposado pojawia się tam, gdzie potrzebujemy balansu między agawą a drewnem, na przykład w wariantach margarity serwowanych prz..." | src/data/bar-menu.ts:149-184: Margarita is Olmeca Silver (:168), Paloma is Altos Plata (:169); reposado is sold neat only (Altos Reposado 32 zł, Patron Reposado 44 zł, src/data/bar-menu.ts:277-287) | hard |
| `tequila-reposado-vs-anejo` | "Añejo trafia raczej do kart digestifów" | src/data/bar-menu.ts:277-287: the only añejo is Patron Añejo, sold neat; there is no digestif card | hard |
| `chardonnay-vs-sauvignon-blanc` | "można w jeden wieczór postawić na stole kieliszek Chardonnay obok kieliszka Sauvignon Blanc" | src/data/bar-menu.ts:90-104: no Sauvignon Blanc; Chardonnay appears in Halka (glass 37 zł) and Chardonnay Barrique (bottle 420 zł) | hard |
| `pinot-grigio-vs-pinot-gris` | "spróbować kilku stylów pinot gris i pinot grigio przy jednym stole" | src/data/bar-menu.ts:90-104: no Pinot Gris or Pinot Grigio; the only Pinot is a Pinot Noir from Winnica Turnau | hard |
| `pinot-grigio-vs-pinot-gris` | "Więcej o pracy z winami i wydarzeniami znajdziesz na stronie kariery SiSi Wrocław." | src/i18n/ui/pl.ts:280-319: the careers page lists three job posts (barman, waiter, barback) and has no content on wine or events | hard |
| `kieliszki-do-wina` | "Rezerwację stolika lub przestrzeni na wyłączność możesz zgłosić przez formularz rezerwacji, a zespół skontaktuje się" | Exclusive hire runs through the private-events inquiry (pl.ts:387,396); table booking is an external system (legal.ts:41) that needs acceptance and prepayment (pl.ts:336-337) | soft |
| `mezcal-vs-tequila` | "od czystych, cytrusowych drinków na bazie tequili blanco po kompozycje z mezcalem espadín" | No mezcal anywhere in src/data/bar-menu.ts (grep for mezcal and espad returns nothing); tequila cocktails are Margarita and Paloma (:168-169) | hard |
| `mezcal-vs-tequila` | "mezcal do bardziej wieczornych, dymnych wariantów z odrobiną słodyczy dla balansu" | Same: SiSi does not list mezcal | hard |
| `tequila-blanco-vs-reposado` | "od tuńczyka tataki do fondanta czekoladowego z tonką wonną" | src/data/food-menu.ts:138 has 'Tuńczyk Blue Fin à la chinoise' and the file has no dessert section, so no chocolate fondant | hard |
| `tequila-blanco-vs-reposado` | "reposado wybieramy tylko wtedy, gdy nuty wanilii oraz dębu nie zginą pod innymi składnikami koktajlu" | src/data/bar-menu.ts:149-184: every tequila cocktail is built on Silver or Plata (:168-169); reposado is only sold neat (src/data/bar-menu.ts:277-287) | hard |
| `aperol-vs-campari` | "Nasz bar prowadzi zarówno klasyczny Aperol Spritz, jak i pełnokrwiste Negroni czy Boulevardier" | src/data/bar-menu.ts:149-184: no Aperol Spritz and no Boulevardier; the seven spritzes use Martini Prosecco with other bases; Negroni is built with Martini Bitter, not Campari (:160) | hard |
| `aperol-vs-campari` | "Wcześniejsze godziny, kiedy sala jeszcze się rozgrzewa i gra spokojniejsza muzyka, to czas na Aperol Spritz, często zamawiany j..." | src/data/site.ts:90; src/i18n/ui/pl.ts:11: SiSi opens at 22:00; dinner belongs to The Cork | hard |

**Unverifiable** (not in `site.ts`, `pl.ts`, `bar-menu.ts`, `food-menu.ts` or `legal.ts`) are 42 claims in 26 posts. The recurring ones: comparative tastings and flights, decanting advice, VIP lodges, "our bartenders advise", a "mocktail zone", per-guest table zoning, walk-in Saturday entry, kitchen hours for the Night Menu, jazz programming. They may be true; nobody has confirmed them. Full list per post in the JSON. **[Confirmed]** for absence, PENDING for truth.

**Matches worth keeping** (all in the JSON): location and format ("łączy muzykę na żywo i DJ-ów", Night Menu with The Cork), Polish wines and Belgian beers, open bar and open tab for events, private hire of SiSi, The Cork or R32, Saturday entry 40 zł and 100 zł per person (with the omissions noted above).

## 7. Topic overlap and cannibalization

**Method [Confirmed]:** TF-IDF cosine (sublinear tf, smoothed idf, tokens cut to 6 letters as a crude Polish stemmer) over 31 documents in numpy, on three views: full text; title, description and content headings; body before the SiSi block. 465 pairs per view.

**Threshold [Confirmed for numbers, Inference for the reason]:** mean + 2.5 standard deviations per view: full text 0.280 (mean 0.158, sd 0.049), headings 0.165, body 0.256. The shared vendor template raises every score, so a fixed cutoff like 0.5 would flag nothing (the maximum is 0.41). The top pair on all three views is the two tequila posts, the known duplicate, so the screen works as a screen. It is lexical, not a search-results comparison, so I judged each flagged pair by intent.

Verbatim reuse is low (in every post under 3% of the words sit in six-word sequences that also appear in 2 or more other posts): the posts are paraphrased from one template, not copied. **[Confirmed]**

### Pairs above threshold

| Pair | Full text | Headings | Body | Intent judgement (Inference) |
| --- | --- | --- | --- | --- |
| `tequila-reposado-vs-anejo` and `tequila-blanco-vs-reposado` | 0.413 | 0.375 | 0.407 | Same intent (which tequila age to buy). Cannibalizes. |
| `polskie-wina-musujace` and `prosecco-vs-cava` | 0.350 | 0.129 | 0.348 | Adjacent intent (sparkling wine to buy); partly lexical. |
| `tequila-reposado-vs-anejo` and `mezcal-vs-tequila` | 0.322 | 0.165 | 0.314 | Related, different question; shared agave and oak words. |
| `wino-kieliszek-czy-butelka` and `kieliszki-do-wina` | 0.318 | 0.206 | 0.288 | Different intent (order vs glassware); shared glass vocabulary. |
| `koktajle-do-kolacji` and `aperol-vs-campari` | 0.310 | 0.068 | 0.234 | Lexical only (cocktail terms). |
| `bourbon-vs-szkocka` and `tequila-reposado-vs-anejo` | 0.306 | 0.064 | 0.311 | Lexical only (oak, barrel, ageing). |
| `old-fashioned-vs-manhattan` and `aperol-vs-campari` | 0.298 | 0.132 | 0.257 | Lexical only (classic cocktails). |
| `chardonnay-vs-sauvignon-blanc` and `pinot-grigio-vs-pinot-gris` | 0.293 | 0.127 | 0.279 | Same family (which white to choose); competing for the same reader. |
| `mezcal-vs-tequila` and `tequila-blanco-vs-reposado` | 0.285 | 0.187 | 0.274 | Related; same cluster. |
| `budzet-na-impreze-klubowa` and `open-bar-vs-cash-bar` | 0.276 | 0.139 | 0.261 | Same intent (price and plan a club party). Cannibalizes. |
| `wino-naturalne-vs-klasyczne` and `polskie-wina-musujace` | 0.274 | 0.178 | 0.285 | Lexical (production methods). |
| `aperitif-co-to` and `aperitivo-wroclaw` | 0.273 | 0.295 | 0.218 | Same intent (aperitif). Cannibalizes. |
| `old-fashioned-vs-manhattan` and `martini-dry-vs-wet` | 0.269 | 0.123 | 0.258 | Same shelf (stirred classics); different questions. |
| `bourbon-vs-szkocka` and `old-fashioned-vs-manhattan` | 0.265 | 0.128 | 0.259 | Overlapping (Old Fashioned base spirit). |
| `wino-wytrawne-vs-polwytrawne` and `chardonnay-vs-sauvignon-blanc` | 0.265 | 0.180 | 0.247 | Related (choosing a white). |
| `afterparty-co-to` and `koncert-klubowy-co-to` | 0.262 | 0.181 | 0.204 | Different intent; shared events vocabulary. |
| `wino-naturalne-vs-klasyczne` and `wino-wytrawne-vs-polwytrawne` | 0.258 | 0.180 | 0.264 | Related (wine styles). |
| `wino-kieliszek-czy-butelka` and `dekantacja-wina` | 0.248 | 0.183 | 0.232 | Different intent; shared serving vocabulary. |
| `zabawa-bez-alkoholu` and `mocktail-co-to` | 0.221 | 0.205 | 0.204 | Different intent (party ideas vs recipes). |
| `jazz-na-zywo-wroclaw` and `aperitivo-wroclaw` | 0.215 | 0.187 | 0.160 | Lexical only (live music, Wrocław). |
| `rezerwacja-stolika-koszt-wroclaw` and `budzet-na-impreze-klubowa` | 0.191 | 0.172 | 0.171 | Related (cost); different intent. |
| `rezerwacja-stolika-koszt-wroclaw` and `aperitivo-wroclaw` | 0.168 | 0.166 | 0.120 | Lexical only (reservation). |

### Clusters by search intent [Inference]

| Cluster | Posts | Count | Overlap verdict |
| --- | --- | --- | --- |
| Still wine knowledge | `wino-naturalne-vs-klasyczne`, `wino-kieliszek-czy-butelka`, `dekantacja-wina`, `wino-wytrawne-vs-polwytrawne`, `chardonnay-vs-sauvignon-blanc`, `pinot-grigio-vs-pinot-gris`, `kieliszki-do-wina` | 7 | Seven posts for a list of nine Polish wines. One page on SiSi's list is enough. |
| Guest logistics (booking) | `rezerwacja-stolika-koszt-wroclaw` | 1 | The single booking post; the most valuable topic. |
| Aperitif, food and pairing | `nocne-menu-co-to`, `koktajle-do-kolacji`, `aperitif-co-to`, `aperitivo-wroclaw`, `tapas-co-to` | 5 | Five posts around the Night Menu and spritzes; aperitif and aperitivo are the same query. |
| Private events and party planning | `budzet-na-impreze-klubowa`, `afterparty-co-to`, `open-bar-vs-cash-bar`, `urodziny-w-klubie-pomysly` | 4 | Four posts for one page (private events at SiSi, The Cork or R32). |
| Whisky and classic cocktails | `bourbon-vs-szkocka`, `old-fashioned-vs-manhattan`, `martini-dry-vs-wet`, `aperol-vs-campari` | 4 | Four separate questions on one shelf; SiSi sells Old Fashioned, Manhattan, Dry Martini and Negroni, not Aperol or Campari. |
| Live music and going out | `etykieta-na-parkiecie`, `jazz-na-zywo-wroclaw`, `koncert-klubowy-co-to` | 3 | Three posts; the useful one is "what to expect". |
| Non-alcoholic | `zabawa-bez-alkoholu`, `mocktail-co-to` | 2 | Different intents; one is off-topic (home games). |
| Sparkling wine | `polskie-wina-musujace`, `prosecco-vs-cava` | 2 | Two shopping guides; SiSi has no Polish sparkling wine and no Cava. |
| Agave spirits | `tequila-reposado-vs-anejo`, `mezcal-vs-tequila`, `tequila-blanco-vs-reposado` | 3 | Three posts, one buying decision. Merge into one tequila page. |

## 8. Reading level and Polish quality

**Reading load [Inference]:** FOG-PL proxy (0.4 x (average words per sentence + percent of words with 4 or more syllables)) has a mean of 12.9, range 10.5 to 15.1; the mean sentence is 18.2 words. That is upper-secondary reading load, slightly heavy for a guest checking a price. The proxy is not a validated Polish grade level. Longest reads: wino-naturalne-vs-klasyczne (15.1), jazz-na-zywo-wroclaw (15.0), polskie-wina-musujace (14.5).

**Patterns [Confirmed]:**

- Machine tells: "nie tylko X" constructions (36 uses in 21 posts), "Największym błędem, jaki widzę" and "Konwencjonalna mądrość mówi" openers, "Porada profesjonalisty", a "Statystyka do zapamiętania" label, "naprawdę" (16 uses in 15 posts).
- English calques and left-over English: "Porada profesjonalisty" (Pro tip), "Perspektywa SiSi" (SiSi perspective), "dedykowane menu" (dedicated), "koła treningowe" (training wheels), "per capita", "oaked", "resting", "muddle", "dinner-friendly", the English disclaimers and vendor footers.
- Wrong terms and facts: "na dużym kloszu" (lampshade, meant a wine glass); "Charmat, popularnie nazywany metodą frizzante" (frizzante is a fizz level); the tongue-map myth in kieliszki-do-wina; "Pyszniej, że regiony..." (garbled).
- Grammar slips: "Zwężone wylotu skupia", "ten sam czerwony wytrawny wino", "Etykieta ... jest proste", "lżejszą, bardziej pienistą musowanie", "Niektóre blanco przechodzi", "autorskie koktezy".
- Logic errors: "w mniejszości klubów nie obowiązuje formalny dress code" (says the opposite of its FAQ).

Examples are per post in Table 3 and in the JSON (`polish_quality.examples`). A native editor should read every kept post before it is published again. **[Rec]**

## 9. Cluster-level answers

### 9.1 Does the blog help or hurt? [Inference]

It hurts more than it helps. Reasons, all from this run:

1. **Thin on the venue, heavy on the topic.** About 88% of the text is generic. A night club open two nights a week is publishing 51,000 words on decanting, Pinot Grigio and Aperol versus Campari. **[Confirmed]** for the numbers, **[Inference]** for the effect on relevance.
2. **Duplicative.** 22 pairs cross the similarity threshold, and at least four are true intent duplicates (tequila x2, aperitif x2, budget and open bar, the white-wine pair). **[Confirmed]** for pairs.
3. **Off-topic for a night venue.** 23 of 31 posts serve a searcher who wants to learn, not to go out. Little of it can convert to a booking. **[Inference]**
4. **Wrong on facts about SiSi** in 13 posts, and those facts sit on the domain and in `llms-full.txt`. A guest who arrives expecting an Aperol Spritz at 18:00 or a mezcal flight will be disappointed. **[Confirmed]**, effect **[Inference]**
5. **Unwanted signals.** Follow links to the content vendor, links to competitors, third-party images, a personal name on words the person may not have written. **[Confirmed]**
6. **It dilutes the site.** A site with 12 page types per language now has 31 more indexable pages, almost none about the venue. Whether this lowers rankings for the core pages is not testable here. **[Assumption]**

### 9.2 Five posts that serve real guest questions [Inference]

No search or enquiry data was available, so these are chosen on how close the topic is to what a guest needs before or after a night at SiSi. Each needs a rewrite before it serves that question.

| Post | Guest question | What is missing or wrong |
| --- | --- | --- |
| `rezerwacja-stolika-koszt-wroclaw` | Ile kosztuje stolik w SiSi? | The post never states SiSi's own terms (100 zł per person credited to the bill, Friday free entry, Saturday +40 zł, arrive 22:00-23:00, table released after 30 minutes). It names a competitor instead, points to a cancellation rule the regulamin does not contain, and carries an English disclaimer. |
| `nocne-menu-co-to` | Co można zjeść w SiSi w nocy? | Describes burgers, pizza and tacos; SiSi's Night Menu by The Cork is oysters, tartare, cheese boards and a seafood basket. The "około 40 zł na weekend" line is wrong for Friday (free). |
| `koncert-klubowy-co-to` | Czego się spodziewać i jak się ubrać? | Says most clubs have no formal dress code; SiSi applies selection and smart casual. Also lacks the arrival window and ID rule. There is no dedicated dress-code post at all. |
| `urodziny-w-klubie-pomysly` | Czy mogę zrobić urodziny w SiSi? | Claims the online form guarantees a date (it does not) and sells a VIP lodge that is not in the sources. Real facts available: SiSi, The Cork or all of R32 for hire, open bar or open tab, contract plus deposit. |
| `afterparty-co-to` | Gdzie zrobić afterparty po weselu, koncercie albo konferencji? | Long etymology; SiSi facts are accurate but thin. A 22:00 opening and the private-events route are the real answer. |

Runners-up: etykieta-na-parkiecie (door rules missing), wino-kieliszek-czy-butelka (glass prices missing), budzet-na-impreze-klubowa. Note: there is no post at all on dress code, opening hours, or how to get in. **[Confirmed]**

### 9.3 A better editorial line [Rec]

**A venue journal, not an encyclopedia.** Each post answers one question a guest asks before or after a night at SiSi and contains at least three facts that only SiSi holds.

- One guest question per post, taken from real enquiries (booking, door, dress code, menu, private events).
- Facts come from a fact sheet that also feeds the site; numbers are injected or linked, never retyped.
- Where a fact is missing, print a marked placeholder in the draft and block publishing until it is filled.
- Two to four posts a month, reviewed by a person who works at SiSi; a real byline or "Zespół SiSi".
- Night recaps only with a confirmed lineup and cleared photos.
- Every post links to the menu, reservations, the events calendar and at least one other post.

**Ten post titles grounded in things only SiSi knows.** Placeholders mark facts nobody has given me; each is a gap to fill before writing.

| # | Working title | Facts from the sources | Gaps |
| --- | --- | --- | --- |
| 1 | Ile kosztuje stolik w SiSi: 100 zł od osoby do wykorzystania przy stoliku, piątek bez wstępu, sobota z wstępem [PRICE? confirm Saturday entry] | `src/i18n/ui/pl.ts:325-327` | [PRICE?] Saturday entry is 40 zł in pl.ts:327 but 30 zł in legal.ts:42 |
| 2 | Dress code w SiSi: co znaczy smart casual i kiedy selekcja przy wejściu może odmówić wstępu [DOOR-EXAMPLES?] | `src/i18n/ui/pl.ts:330; src/i18n/legal.ts:34` | [DOOR-EXAMPLES?] concrete do and do-not examples from the door team |
| 3 | Wieczór w SiSi od 22:00 do 4:00: kiedy przyjść, do której trzymamy stolik i co dzieje się o północy [SET-TIMES?] | `src/data/site.ts:90; src/i18n/ui/pl.ts:156,328` | [SET-TIMES?] typical live-act and DJ start times; [LINEUP?] |
| 4 | Old Fashioned na Chivas XV i Manhattan na Chivas XII: dlaczego robimy je na szkockiej [BARMAN-QUOTE?] | `src/data/bar-menu.ts:161-162,242` | [BARMAN-QUOTE?] the bartender's own reason for Scotch |
| 5 | Polskie wino w SiSi: dziewięć etykiet, dwie na kieliszki (Halka 37 zł, Triada 40 zł) i od czego zacząć [TASTING-NOTES?] | `src/data/bar-menu.ts:90-104` | [TASTING-NOTES?] staff notes per wine |
| 6 | Night Menu by The Cork: ostrygi, tatar, deska serów i co zamówić do pierwszego drinka [CORK-KITCHEN-HOURS?] | `src/data/food-menu.ts:70-230; src/i18n/ui/pl.ts:184` | [CORK-KITCHEN-HOURS?] until when the kitchen serves; [PHOTO?] dish photos with rights |
| 7 | Siedem spritzów w SiSi, od 42 do 46 zł: który wybrać na początek nocy [BARMAN-PICK?] | `src/data/bar-menu.ts:150-156` | [BARMAN-PICK?] house favourite |
| 8 | Bez alkoholu w SiSi: siedem koktajli 0% za 38 zł, Beefeater 0% i Prosecco 0% | `src/data/bar-menu.ts:186-199` | none |
| 9 | Urodziny w SiSi, The Cork albo w całym R32: co można wynająć i jak działa zaliczka [MIN-SPEND?] | `src/i18n/ui/pl.ts:377-396,453-460; src/data/site.ts:120-122` | [MIN-SPEND?] any minimum, if one exists; [CAPACITY-SISI?] SiSi alone: the sources give 663 m2 and up to 500 standing for the venue space, not for SiSi |
| 10 | Piątek czy sobota w SiSi: Friday Session, [LINEUP?] i różnica w cenie wstępu | `src/i18n/ui/pl.ts:159,326-327` | [LINEUP?]; [DJ?] resident names; [GENRE?] what each night plays |

### 9.4 Steering the BabyLoveGrowth pipeline [Rec]

Assumption: the BabyLoveGrowth dashboard has keyword, business-brief, style, author and publish-mode settings. I did not see it, so the names below may differ.

**On the BabyLoveGrowth side (what to write):**

- Replace the keyword and topic list. Drop wine varietals, glassware, decanting, tequila and mezcal ageing, Aperol versus Campari and home party games. Add guest-intent terms: rezerwacja stolika klub Wrocław, dress code klub Wrocław, klub Wrocław piątek sobota, co zjeść w klubie w nocy Wrocław, urodziny w klubie Wrocław, afterparty Wrocław.
- Rewrite the business brief around a fact sheet: open Friday and Saturday 22:00-04:00 only, R32 complex on Rzeźnicza 32-33, reservation terms as on the reservations page, the real menu categories, and an explicit list of things SiSi does not do (no daytime or after-work service, no tastings, no VIP lodges, no mezcal, no Aperol, no Polish sparkling wine, no jazz programme) until someone confirms otherwise.
- Add a "never claim" rule: nothing about SiSi that is not in the fact sheet; use a marked placeholder instead.
- Turn off the author-opinion block and the byline, or set a real author; the current signature is "Ignacy Jurkowski" on all 31 posts, including first-person lines Ignacy did not necessarily write.
- Turn off the automatic English disclaimer, the "Created with BabyLoveGrowth" and "Written with help from BabyLoveGrowth" footers, the injected call-to-action card and table of contents (the site renders its own), and the "overview diagram" images.
- Set a Polish style guide: forbid "Porada profesjonalisty", "Perspektywa SiSi", "Konwencjonalna mądrość mówi", "Krótko mówiąc" blocks; ask for plain guest-facing Polish.
- Stop linking to venues that compete for the same guests and to unrelated sources (geocaching, Poznań rankings); prefer official and legal sources only.
- Cut cadence from one post a day to a few a month, or switch to draft mode so nothing publishes without review.

**On the site side (what to accept and how to show it):**

- Publish gate: make the sync open a pull request or publish as draft instead of committing straight to the repository and firing the build hook, so a person reads each post first (docs/BLOG.md, the sync commits and pushes on its own).
- Extend src/lib/claims.mjs beyond age and timing claims: block vendor footers ("BabyLoveGrowth"), English disclaimers, the injected "Sisi Wrocław" call-to-action card, and SiSi-adjacent terms that are not in the menu or copy (mezcal, Aperol, Boulevardier, degustacj, loż, VIP, jazz) unless allow-listed.
- Keep price and rule numbers out of prose: have the template inject them from src/i18n/ui/pl.ts, or link to /pl/rezerwacje instead of repeating 100 zł and 40 zł. Resolve the 30 versus 40 zł and 23:00 versus 23:30 conflict first.
- Sanitizer: keep heading ids (or slugify them at sync time) or strip the vendor table of contents; strip the vendor call-to-action card; self-host or drop body images; add rel nofollow to outbound links.
- Per-slug decisions (noindex, redirect, merge) need a small overrides file outside articles.generated.ts, because the sync overwrites that file. Merges need 301 redirects in netlify.toml.
- Template: a real author node, real dateModified, related-posts block, a nav or home link to the blog, and a hub with grouping.
- Do not rely on any of this until Ignacy approves; none of it was applied.

## 10. Blog template observations

- The blog is not in the top navigation. NAV_KEYS leaves it out on purpose and the footer is the only link (one link on the home page). (`src/i18n/routes.ts:42,44-46`; `src/components/Footer.astro:18`; `dist/pl/index.html (1 link to /pl/blog/)`) **[Confirmed (local build)]**
- Article pages emit hreflang for pl and x-default only, both pointing at the same URL. Correct for single-language posts; the other four locales have no posts to point to. (`src/layouts/Base.astro:75-78,124-125`; `src/data/articles.ts:108-111`; `dist/pl/blog/rezerwacja-stolika-koszt-wroclaw/index.html`) **[Confirmed (local build)]**
- The locale switcher on an article page lists /en/blog/, /de/blog/, /it/blog/ and /cs/blog/. Those hubs exist and show only an empty-state line ("The first posts are coming soon." on the English hub), with no fallback to the Polish post or the site home. (`src/components/LocaleSwitcher.astro:10`; `src/components/pages/BlogArticlePage.astro:30`; `src/components/pages/BlogPage.astro:40`; `dist/en/blog/index.html`) **[Confirmed (local build)]**
- The empty foreign hubs are marked noindex in code (noindex when the locale has no article). This cannot be seen in the local build because every local page is noindex, nofollow. (`src/components/pages/BlogPage.astro:23`; `scripts/launch.test.mjs:22`) **[Inference]**
- Sitemap lastmod: static and event pages use the build date (all 51 non-article URLs are dated 2026-09-29 in the local build); articles use updatedAt or publishedAt. Only 2 of 31 articles carry updatedAt, so 29 keep their publish date. The 2 that do (rezerwacja-stolika-koszt-wroclaw, wino-kieliszek-czy-butelka) were updated within about a minute of publishing, and the page shows "Aktualizacja" with the same day as the publish date. (`src/pages/sitemap.xml.ts:18,61`; `src/components/pages/BlogArticlePage.astro:15,58-62`; `dist/sitemap.xml`) **[Confirmed (local build)]**
- Structured data on posts: BlogPosting (author is the Organization node, publisher is the NightClub node, no Person author, no wordCount) and BreadcrumbList. No FAQPage is emitted because none of the 31 articles has a faq field; the FAQ exists only as h3 text in the body. No keywords property (no article has keywords). (`src/data/articles.ts:119-146`; `dist/pl/blog/rezerwacja-stolika-koszt-wroclaw/index.html (JSON-LD)`) **[Confirmed (local build)]**
- The sanitizer allows no attributes on h2 to h6, so heading ids are dropped while the vendor table of contents keeps its #fragment links. All 31 posts have a dead table of contents (0 ids in the body, 6 to 14 anchors per post). (`scripts/articles-sync/sanitize.mjs:37,356`; `src/components/pages/BlogArticlePage.astro:81`) **[Confirmed (local build)]**
- The vendor call-to-action card is unwrapped to loose text, so the sentence runs together ("Odkryj polskie wina w SiSiW SiSi znajdziesz..."). It appears in 25 of 31 posts (the other 6 lack the card). (`src/data/articles.generated.ts:12`; `scripts/articles-sync/sanitize.mjs:187`) **[Confirmed (local build)]**
- 115 body images load from two third-party hosts (94 from a supabase.co bucket, 21 from media.babylovegrowth.ai), allowed by img-src https:. 19 alt texts end in the English words "overview diagram". The hero images are self-hosted webp (400 to 1080 px). (`scripts/articles-sync/sanitize.mjs:45`; `scripts/generate-headers.mjs:112`) **[Confirmed (local build)]**
- The hero alt text and og:image:alt both repeat the h1, and the image itself has the title printed in it, so the title appears three times. (`src/components/pages/BlogArticlePage.astro:73`) **[Confirmed (local build)]**
- Title tag is the article title plus the site-name suffix: 29 of 31 exceed 60 characters (mean 73, max 92). Meta descriptions are 123 to 158 characters. (`src/components/pages/BlogArticlePage.astro:14`) **[Confirmed (local build)]**
- The hub lists every article on one page with no pagination or grouping. At one post per day it grows without limit. (`src/components/pages/BlogPage.astro:33-38`) **[Inference]**
- llms-full.txt carries the full text of every article, so the unsupported SiSi claims reach AI answer engines too. (`src/lib/llms-map.ts:178,188`; `dist/llms-full.txt:62`) **[Confirmed (local build)]**
- In-body links to SiSi pages are absolute and have no trailing slash (for example /pl/rezerwacje), while canonicals use a trailing slash. Whether production redirects them was not observed. (`src/i18n/routes.ts:76`; `dist/pl/blog/aperol-vs-campari/index.html`) **[Confirmed (local build)]**
- No post links to another post, to /pl/wydarzenia, or to /pl/kontakt. All 157 internal links go to seven pages: reservations, menu, private events, corporate events, terms, careers (one link) and the home page. (`dist/pl/blog/*/index.html`) **[Confirmed (local build)]**
- Every page of the local build, including all posts, carries robots noindex, nofollow. That is the designed local behaviour; production robots was not checked (host unreachable). (`scripts/launch.test.mjs:22`; `src/layouts/Base.astro:85-90`) **[Confirmed (local build)]**
- Site-level source-of-truth conflict outside the blog: the regulamin says Saturday entry is 30 zł and the reservation may be collected 22:00-23:30; the reservations page copy says 40 zł and 22:00-23:00. The posts follow the page copy. (`src/i18n/legal.ts:42,44`; `src/i18n/ui/pl.ts:327,328`) **[Confirmed]**

## 11. Next steps, gaps and open decisions

**Sequence [Rec]:** (1) Ignacy decides the 30 versus 40 zł and 23:00 versus 23:30 conflict. (2) Approve interim noindex on the 9 hard-contradiction posts. (3) Approve the merge and remove list, ideally after a look at per-URL search data. (4) Rewrite the 10 targets from a fact sheet. (5) Change the BabyLoveGrowth brief and the publish gate before the next sync adds posts. (6) Fix the template defects in section 4 (dead table of contents, run-on card, author node, images).

**PENDING decisions:**

- PENDING: Saturday entry 30 or 40 zł, pickup window 23:00 or 23:30 (legal.ts versus pl.ts).
- PENDING: Is "Ignacy Jurkowski" meant to appear as the author of first-person opinions on all 31 posts?
- PENDING: Does SiSi offer VIP lodges, tastings or flights, decanting, or a private-event tasting? If yes, give the facts; the posts currently assert them.
- PENDING: Per-URL search data, to decide between remove and rewrite for posts that already rank.
- PENDING: Ignacy's approval for every action in the recommendation column.

**Gaps (placeholders used above):** [LINEUP?], [DJ?], [GENRE?], [SET-TIMES?], [PRICE?], [DOOR-EXAMPLES?], [BARMAN-QUOTE?], [BARMAN-PICK?], [TASTING-NOTES?], [CORK-KITCHEN-HOURS?], [PHOTO?], [MIN-SPEND?], [CAPACITY-SISI?], [PARKING?].

## Appendix: how the numbers were made

Commands and scripts run in the session scratchpad, not in the repo:

- `sed`/`node`: strip the type import from `src/data/articles.generated.ts` and `JSON.stringify` the array (31 objects).
- Python `html.parser` scripts for word, heading and link counts; a plain-text renderer; numpy TF-IDF cosine (three views); six-word shingle overlap; FOG-PL proxy.
- `node` script importing `src/lib/claims.mjs` `unverifiedClaims` over html, title, description and excerpt: 0 of 31 flagged.
- `grep -n` over `src/data/bar-menu.ts`, `food-menu.ts`, `src/i18n/ui/pl.ts`, `src/i18n/legal.ts` for every SiSi claim (no match for mezcal, Aperol, Campari, Boulevardier, Sauvignon, Pinot Gris, Polish sparkling, dessert).
- Built pages read from `/home/user/sisi-baseline/dist` (head tags, JSON-LD, sitemap, `_headers`, `llms-full.txt`). A contact sheet of the 31 hero images was viewed by eye.

