/* Long-form legal content, kept out of the strict UI dictionary so it can carry
   a fallback. Company data is interpolated from {tokens} (single source, avoids
   whitespace-glue bugs). Non-default legal pages show a banner: en gets the
   "convenience translation" note (ui.legal.convenienceNote); de/it/cs get the
   "shown in English on purpose" note (ui.legal.englishFallbackNote).

   Translation status: pl, en complete. de/it/cs fall back to the ENGLISH text
   (more widely read than Polish) and are flagged for professional legal
   translation + review (see docs/I18N.md). The Polish version stays binding. */

// TODO(ignacy): commission professional DE/IT/CS legal translations; until then
//   keep the English fallback and the "Polish version is authoritative" banner.
import { type Locale } from './config';

export type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] };
export type LegalDoc = { sections: LegalSection[] };
export type LegalKey = 'terms' | 'privacy' | 'cookies';

const pl_terms: LegalDoc = {
  sections: [
    {
      heading: '1. Postanowienia ogólne',
      paragraphs: [
        '1.1. Niniejszy Regulamin określa zasady wstępu i przebywania na terenie klubu SiSi (dalej: „Klub") oraz zasady dokonywania rezerwacji stolików.',
        '1.2. Podmiotem prowadzącym Klub jest {legalName}, {street}, {postalCity}, NIP: {nip}, REGON: {regon} (dalej: „Organizator").',
        '1.3. Wejście na teren Klubu oznacza akceptację postanowień niniejszego Regulaminu oraz zobowiązanie do jego przestrzegania.',
      ],
    },
    {
      heading: '2. Zasady wstępu',
      items: [
        'Obsługa ma prawo zażądać okazania dokumentu tożsamości.',
        'Organizator zastrzega sobie prawo odmowy wstępu bez podania przyczyny, w szczególności osobom nietrzeźwym, pod wpływem środków odurzających lub zachowującym się agresywnie.',
        'W lokalu obowiązuje selekcja oraz dress code w stylu smart casual.',
        'Na terenie Klubu obowiązuje zakaz wnoszenia własnego alkoholu, napojów, środków odurzających, broni oraz przedmiotów niebezpiecznych.',
      ],
    },
    {
      heading: '3. Rezerwacje stolików',
      items: [
        'Rezerwacji stolika można dokonać online za pośrednictwem systemu rezerwacji dostępnego na stronie, telefonicznie pod numerem {phone} lub mailowo: {email}.',
        'Koszt rezerwacji wynosi 50 zł od osoby i jest do wykorzystania przy stoliku u obsługi. W piątki wstęp dla osób z rezerwacją jest bezpłatny, w soboty doliczany jest wstęp w wysokości 30 zł od osoby.',
        'Warunkiem potwierdzenia rezerwacji jest przedpłata.',
        'Rezerwację należy odebrać w godzinach 22:00-23:30. Spóźnienie powyżej 30 minut może skutkować przekazaniem stolika innym gościom.',
        'Rezerwacje na eventy firmowe i grupowe prowadzone są odrębnie: {eventsPhone}, {eventsEmail}.',
      ],
    },
    {
      heading: '4. Zasady przebywania na terenie Klubu',
      items: [
        'Gość zobowiązany jest stosować się do poleceń obsługi oraz służb porządkowych (ochrony).',
        'Teren Klubu jest objęty monitoringiem wizyjnym (CCTV) prowadzonym w celu zapewnienia bezpieczeństwa osób i mienia. Zasady przetwarzania nagrań opisane są w Polityce prywatności.',
        'Zabronione jest zachowanie zagrażające bezpieczeństwu, porządkowi lub naruszające dobra innych Gości.',
        'Za szkody wyrządzone umyślnie na mieniu Klubu Gość ponosi odpowiedzialność na zasadach ogólnych Kodeksu cywilnego.',
      ],
    },
    {
      heading: '5. Odpowiedzialność',
      paragraphs: [
        '5.1. Organizator nie ponosi odpowiedzialności za rzeczy pozostawione bez nadzoru na terenie Klubu, o ile nie zostały oddane na przechowanie do szatni.',
        '5.2. Organizator odpowiada za niewykonanie lub nienależyte wykonanie usług na zasadach określonych w powszechnie obowiązujących przepisach prawa.',
      ],
    },
    {
      heading: '6. Reklamacje',
      paragraphs: [
        '6.1. Reklamacje dotyczące usług można składać mailowo na adres {email} lub pisemnie na adres Organizatora.',
        '6.2. Reklamacja powinna zawierać dane kontaktowe oraz opis zastrzeżeń. Organizator rozpatruje reklamacje w terminie 14 dni od dnia ich otrzymania.',
      ],
    },
    {
      heading: '7. Dane osobowe',
      paragraphs: [
        'Zasady przetwarzania danych osobowych Gości, w tym w związku z rezerwacjami, opisane są w Polityce prywatności.',
      ],
    },
    {
      heading: '8. Postanowienia końcowe',
      items: [
        'W sprawach nieuregulowanych Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego.',
        'Organizator zastrzega sobie prawo do zmiany Regulaminu. Zmiany wchodzą w życie z chwilą publikacji na stronie.',
        'Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń. Informacje o dostępnych procedurach dostępne są m.in. na stronie Urzędu Ochrony Konkurencji i Konsumentów (uokik.gov.pl).',
      ],
    },
  ],
};

const pl_privacy: LegalDoc = {
  sections: [
    {
      heading: '1. Administrator danych',
      paragraphs: [
        'Administratorem danych osobowych jest {legalName}, {street}, {postalCity}, NIP: {nip}, REGON: {regon} (dalej: „Administrator").',
        'Kontakt w sprawach danych osobowych: {email}, tel. {phone}.',
      ],
    },
    {
      heading: '2. Zakres i cele przetwarzania oraz podstawy prawne',
      items: [
        'Rezerwacje stolików (imię, nazwisko, telefon, e-mail, dane rezerwacji) - w celu przyjęcia i obsługi rezerwacji. Podstawa: art. 6 ust. 1 lit. b RODO.',
        'Kontakt (dane podane w wiadomości lub rozmowie) - w celu odpowiedzi na zapytanie. Podstawa: art. 6 ust. 1 lit. f RODO.',
        'Eventy firmowe (dane osoby kontaktowej i firmy) - w celu obsługi zapytania i przygotowania oferty. Podstawa: art. 6 ust. 1 lit. b oraz lit. f RODO.',
        'Rekrutacja (dane z CV) - w celu przeprowadzenia procesu rekrutacji. Podstawa: art. 6 ust. 1 lit. a oraz lit. b RODO.',
        'Rozliczenia i obowiązki podatkowe - w zakresie wymaganym przepisami. Podstawa: art. 6 ust. 1 lit. c RODO.',
        'Dochodzenie lub obrona roszczeń. Podstawa: art. 6 ust. 1 lit. f RODO.',
        'Monitoring wizyjny (CCTV) na terenie lokalu - w celu zapewnienia bezpieczeństwa osób i mienia. Podstawa: art. 6 ust. 1 lit. f RODO.',
        'Pamięć przeglądarki i analityka - zob. Polityka cookies. Strona przechowuje decyzje dotyczące komunikatów i zgody, niezbędny stan formularzy i nawigacji, a po wyrażeniu zgody identyfikatory analityczne PostHog (statystyki odwiedzin i nagrania sesji; podstawa prawna: zgoda - art. 6 ust. 1 lit. a RODO; anonimowe statystyki bez zapisu w przeglądarce: prawnie uzasadniony interes - art. 6 ust. 1 lit. f RODO).',
      ],
    },
    {
      heading: '3. Odbiorcy danych',
      paragraphs: ['Dane mogą być powierzane lub udostępniane:'],
      items: [
        'dostawcy systemu rezerwacji online (operator zewnętrznego systemu rezerwacji);',
        'dostawcy usług hostingu i utrzymania strony oraz dostawcy formularzy;',
        'dostawcom usług IT, księgowych i prawnych;',
        'podmiotom uprawnionym na podstawie przepisów prawa.',
      ],
    },
    {
      heading: '4. Okres przechowywania',
      items: [
        'dane rezerwacji oraz zapytań o eventy - przez czas niezbędny do obsługi oraz do upływu terminów przedawnienia roszczeń;',
        'dane rozliczeniowe - przez okres wymagany przepisami podatkowymi (co do zasady 5 lat);',
        'korespondencja - do czasu zakończenia sprawy i upływu terminów przedawnienia;',
        'dane rekrutacyjne - do zakończenia rekrutacji, a w razie zgody - do jej wycofania;',
        'nagrania z monitoringu - przez okres nie dłuższy niż 3 miesiące, chyba że nagranie stanowi dowód w postępowaniu.',
      ],
    },
    {
      heading: '5. Prawa osób, których dane dotyczą',
      paragraphs: ['Przysługuje Państwu prawo do:'],
      items: [
        'dostępu do danych oraz otrzymania ich kopii;',
        'sprostowania (poprawienia) danych;',
        'usunięcia danych;',
        'ograniczenia przetwarzania;',
        'przenoszenia danych;',
        'wniesienia sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie;',
        'cofnięcia zgody w dowolnym momencie (bez wpływu na zgodność z prawem przetwarzania sprzed cofnięcia).',
      ],
    },
    {
      heading: '6. Prawo do skargi',
      paragraphs: [
        'Mają Państwo prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa), jeżeli uznają Państwo, że przetwarzanie danych narusza przepisy RODO.',
      ],
    },
    {
      heading: '7. Dobrowolność podania danych',
      paragraphs: [
        'Podanie danych jest dobrowolne, lecz niezbędne do dokonania rezerwacji, obsługi zapytania o event, uzyskania odpowiedzi lub udziału w rekrutacji. Niepodanie danych uniemożliwia realizację tych celów.',
      ],
    },
    {
      heading: '8. Profilowanie i przekazywanie poza EOG',
      paragraphs: [
        'Dane nie są wykorzystywane do zautomatyzowanego podejmowania decyzji ani profilowania wywołującego skutki prawne. Ewentualne przekazanie danych poza Europejski Obszar Gospodarczy nastąpi wyłącznie z zastosowaniem odpowiednich zabezpieczeń wymaganych przez RODO.',
      ],
    },
    {
      heading: '9. Zmiany polityki',
      paragraphs: ['Administrator może aktualizować niniejszą Politykę. Aktualna wersja jest każdorazowo dostępna na stronie.'],
    },
  ],
};

const pl_cookies: LegalDoc = {
  sections: [
    {
      heading: '1. Pamięć przeglądarki',
      paragraphs: [
        'Strona korzysta z pamięci przeglądarki w dwóch celach: aby zapamiętać Twoje decyzje dotyczące komunikatów i zgody na analitykę oraz - wyłącznie po wyrażeniu zgody - do działania analityki PostHog opisanej poniżej. Stan niezbędny do obsługi formularzy i nawigacji jest używany podczas interakcji z tymi elementami.',
      ],
    },
    {
      heading: '2. Analityka PostHog',
      paragraphs: [
        'Za Twoją zgodą korzystamy z narzędzia analitycznego PostHog (PostHog Inc.; dane przetwarzane na serwerach w Unii Europejskiej), które mierzy odwiedziny i konwersje (np. kliknięcia rezerwacji) oraz nagrywa sesje - ruch kursora i interakcje ze stroną; pola formularzy są maskowane.',
        'Bez zgody analityka działa wyłącznie w trybie anonimowym: zdarzenia nie są łączone z żadnym identyfikatorem zapisanym w Twojej przeglądarce i nic nie jest zapisywane w jej pamięci. Nagrywanie sesji jest wtedy wyłączone.',
        'Zgodę można wycofać w każdej chwili przyciskiem na tej stronie; wycofanie zatrzymuje nagrywanie i usuwa identyfikatory analityczne z przeglądarki.',
      ],
    },
    {
      heading: '3. Jakie dane przechowujemy',
      paragraphs: ['Pamięć niezbędna do działania strony:'],
      items: [
        'sisi-analytics-consent (localStorage) - przechowuje wartość "granted" albo "denied", czyli Twoją decyzję dotyczącą analityki.',
        'Niezbędny stan formularzy i nawigacji - przechowywany tylko na potrzeby bieżącej interakcji ze stroną.',
      ],
    },
    {
      heading: '4. Pamięć zapisywana po wyrażeniu zgody',
      paragraphs: ['Po kliknięciu "Zgadzam się" narzędzie PostHog zapisuje:'],
      items: [
        'ph_..._posthog (localStorage oraz cookie, do 365 dni) - identyfikator przeglądarki i sesji oraz ustawienia analityki.',
        'Wpisy sesyjne PostHog (sessionStorage) - identyfikatory bieżącej sesji i okna, usuwane po zamknięciu karty.',
      ],
    },
    {
      heading: '5. Zarządzanie pamięcią',
      items: [
        'Komunikat o zgodzie wyświetla się do czasu podjęcia decyzji; wybór zapisuje wartość "granted" albo "denied".',
        'Zgodę można wycofać przyciskiem "Wycofaj zgodę na analitykę" na tej stronie.',
        'Pamięcią strony można zarządzać w ustawieniach przeglądarki. Ograniczenie pamięci niezbędnej może wpłynąć na działanie strony.',
      ],
    },
    {
      heading: '6. Więcej informacji',
      paragraphs: [
        'Zasady przetwarzania danych osobowych opisane są w Polityce prywatności. Informacje o prywatności PostHog: https://posthog.com/privacy.',
      ],
    },
  ],
};

const en_terms: LegalDoc = {
  sections: [
    {
      heading: '1. General provisions',
      paragraphs: [
        '1.1. These House Rules set out the rules for entering and being on the premises of the SiSi club (the "Club") and for making table reservations.',
        '1.2. The Club is operated by {legalName}, {street}, {postalCity}, NIP: {nip}, REGON: {regon} (the "Operator").',
        '1.3. Entering the Club constitutes acceptance of these House Rules and a commitment to comply with them.',
      ],
    },
    {
      heading: '2. Entry rules',
      items: [
        'Staff may request ID.',
        'The Operator reserves the right to refuse entry without giving a reason, in particular to people who are intoxicated, under the influence of drugs or behaving aggressively.',
        'A door selection policy and a smart-casual dress code apply.',
        'Bringing your own alcohol, drinks, drugs, weapons or dangerous objects onto the premises is prohibited.',
      ],
    },
    {
      heading: '3. Table reservations',
      items: [
        'A table can be reserved online via the booking system on this site, by phone at {phone} or by email at {email}.',
        'The reservation fee is PLN 50 per person and can be spent at your table with staff. On Fridays entry is free for guests with a reservation; on Saturdays an entry fee of PLN 30 per person is added.',
        'A reservation is confirmed by prepayment.',
        'Reservations must be claimed between 22:00 and 23:30. Being more than 30 minutes late may result in the table being released to other guests.',
        'Corporate and group event bookings are handled separately: {eventsPhone}, {eventsEmail}.',
      ],
    },
    {
      heading: '4. Conduct on the premises',
      items: [
        'Guests must follow the instructions of staff and security.',
        'The Club premises are covered by video monitoring (CCTV) operated to ensure the safety of people and property. How recordings are processed is described in the Privacy Policy.',
        'Behaviour that threatens safety or order, or harms other guests, is prohibited.',
        'Guests are liable for intentional damage to Club property under the general rules of the Civil Code.',
      ],
    },
    {
      heading: '5. Liability',
      paragraphs: [
        '5.1. The Operator is not liable for items left unattended on the premises unless handed in to the cloakroom.',
        '5.2. The Operator is liable for non-performance or improper performance of services under generally applicable law.',
      ],
    },
    {
      heading: '6. Complaints',
      paragraphs: [
        '6.1. Complaints about services may be submitted by email to {email} or in writing to the Operator\'s address.',
        '6.2. A complaint should include contact details and a description of the issue. The Operator handles complaints within 14 days of receipt.',
      ],
    },
    {
      heading: '7. Personal data',
      paragraphs: ['How guests\' personal data is processed, including for reservations, is described in the Privacy Policy.'],
    },
    {
      heading: '8. Final provisions',
      items: [
        'Matters not covered by these House Rules are governed by Polish law, in particular the Civil Code.',
        'The Operator reserves the right to amend these House Rules. Changes take effect upon publication on the site.',
        'Consumers may use out-of-court methods of handling complaints and pursuing claims. Information on the available procedures is available, among others, from the Office of Competition and Consumer Protection (uokik.gov.pl).',
      ],
    },
  ],
};

const en_privacy: LegalDoc = {
  sections: [
    {
      heading: '1. Data controller',
      paragraphs: [
        'The controller of personal data is {legalName}, {street}, {postalCity}, NIP: {nip}, REGON: {regon} (the "Controller").',
        'Contact for data matters: {email}, tel. {phone}.',
      ],
    },
    {
      heading: '2. Scope, purposes and legal bases of processing',
      items: [
        'Table reservations (name, phone, email, reservation details) - to take and handle the reservation. Basis: Art. 6(1)(b) GDPR.',
        'Contact (data provided in a message or call) - to respond to an enquiry. Basis: Art. 6(1)(f) GDPR.',
        'Corporate events (contact person and company data) - to handle the enquiry and prepare an offer. Basis: Art. 6(1)(b) and (f) GDPR.',
        'Recruitment (CV data) - to run the recruitment process. Basis: Art. 6(1)(a) and (b) GDPR.',
        'Accounting and tax obligations - to the extent required by law. Basis: Art. 6(1)(c) GDPR.',
        'Establishing or defending claims. Basis: Art. 6(1)(f) GDPR.',
        'Video monitoring (CCTV) on the premises - to ensure the safety of people and property. Basis: Art. 6(1)(f) GDPR.',
        'Browser storage and analytics - see the Cookie Policy. The site stores notice and consent decisions, essential form and navigation state and, after consent, PostHog analytics identifiers (visit statistics and session recordings; legal basis: consent - Art. 6(1)(a) GDPR; anonymous statistics with no browser storage: legitimate interest - Art. 6(1)(f) GDPR).',
      ],
    },
    {
      heading: '3. Data recipients',
      paragraphs: ['Data may be entrusted to or shared with:'],
      items: [
        'the online reservation system provider;',
        'hosting and site-maintenance providers and form providers;',
        'IT, accounting and legal service providers;',
        'entities authorised under the law.',
      ],
    },
    {
      heading: '4. Retention period',
      items: [
        'reservation and event-enquiry data - for as long as needed to handle them and until claims become time-barred;',
        'accounting data - for the period required by tax law (as a rule 5 years);',
        'correspondence - until the matter is closed and claims become time-barred;',
        'recruitment data - until the end of recruitment, or until consent is withdrawn;',
        'CCTV recordings - for no longer than 3 months, unless a recording is evidence in proceedings.',
      ],
    },
    {
      heading: '5. Rights of data subjects',
      paragraphs: ['You have the right to:'],
      items: [
        'access your data and obtain a copy;',
        'rectify (correct) your data;',
        'erase your data;',
        'restrict processing;',
        'data portability;',
        'object to processing based on legitimate interest;',
        'withdraw consent at any time (without affecting the lawfulness of processing before withdrawal).',
      ],
    },
    {
      heading: '6. Right to lodge a complaint',
      paragraphs: [
        'You have the right to lodge a complaint with the President of the Personal Data Protection Office (ul. Stawki 2, 00-193 Warsaw) if you believe the processing infringes the GDPR.',
      ],
    },
    {
      heading: '7. Voluntary provision of data',
      paragraphs: [
        'Providing data is voluntary but necessary to make a reservation, handle an event enquiry, obtain a response or take part in recruitment. Not providing it makes those purposes impossible.',
      ],
    },
    {
      heading: '8. Profiling and transfers outside the EEA',
      paragraphs: [
        'Data is not used for automated decision-making or profiling with legal effects. Any transfer outside the European Economic Area will take place only with the appropriate safeguards required by the GDPR.',
      ],
    },
    {
      heading: '9. Changes to the policy',
      paragraphs: ['The Controller may update this Policy. The current version is always available on the site.'],
    },
  ],
};

const en_cookies: LegalDoc = {
  sections: [
    {
      heading: '1. Browser storage',
      paragraphs: [
        'The site uses browser storage for two purposes: to remember your decisions about notices and analytics consent, and - only after you consent - for the PostHog analytics described below. State essential to forms and navigation is used while you interact with those controls.',
      ],
    },
    {
      heading: '2. PostHog analytics',
      paragraphs: [
        'With your consent we use the PostHog analytics tool (PostHog Inc.; data processed on servers in the European Union) to measure visits and conversions (e.g. reservation clicks) and to record sessions - cursor movement and interactions with the page; form fields are masked.',
        'Without consent, analytics runs in anonymous mode only: events are not linked to any identifier stored in your browser and nothing is written to browser storage. Session recording stays off.',
        'You can withdraw consent at any time with the button on this page; withdrawal stops recording and removes analytics identifiers from your browser.',
      ],
    },
    {
      heading: '3. What we store',
      paragraphs: ['Storage essential to the site:'],
      items: [
        'sisi-analytics-consent (localStorage) - stores the value "granted" or "denied", i.e. your analytics decision.',
        'Essential form and navigation state - stored only for the current interaction with the site.',
      ],
    },
    {
      heading: '4. Storage written after consent',
      paragraphs: ['After you click "Accept", PostHog stores:'],
      items: [
        'ph_..._posthog (localStorage and a cookie, up to 365 days) - browser and session identifier plus analytics settings.',
        'PostHog session entries (sessionStorage) - identifiers for the current session and window, removed when the tab closes.',
      ],
    },
    {
      heading: '5. Managing storage',
      items: [
        'The consent notice appears until you make a decision; your choice stores the value "granted" or "denied".',
        'You can withdraw consent with the "Withdraw analytics consent" button on this page.',
        'You can manage site storage in your browser settings. Restricting essential storage may affect how the site works.',
      ],
    },
    {
      heading: '6. More information',
      paragraphs: [
        'How personal data is processed is described in the Privacy Policy. PostHog privacy information: https://posthog.com/privacy.',
      ],
    },
  ],
};

const LEGAL: Record<LegalKey, Partial<Record<Locale, LegalDoc>>> = {
  terms: { pl: pl_terms, en: en_terms },
  privacy: { pl: pl_privacy, en: en_privacy },
  cookies: { pl: pl_cookies, en: en_cookies },
};

/** Returns the document for a locale. pl/en have real translations; de/it/cs
    fall back to the English text (far more widely read than Polish) with a
    banner explaining the fallback. `translated` is false when the fallback was
    used, which the page uses to pick the right banner. */
export function getLegal(key: LegalKey, locale: Locale): { doc: LegalDoc; translated: boolean } {
  const doc = LEGAL[key][locale];
  if (doc) return { doc, translated: true };
  return { doc: LEGAL[key].en as LegalDoc, translated: false };
}
