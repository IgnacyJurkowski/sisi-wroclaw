/* Polish — the source dictionary. Its shape (`typeof pl`) is the contract every
   other locale must satisfy, so a missing key is a compile error, not a silent
   gap in production. Keep brand-invariant data (prices, names, phones) in
   src/data/site.ts; only translatable prose belongs here. */

const pl = {
  meta: {
    home: {
      title: 'SiSi Wrocław - Music Club & Bar',
      description:
        'SiSi to serce nocnego Wrocławia - muzyka na żywo, najlepsi DJ-e, autorskie koktajle i wyjątkowa atmosfera w sercu kompleksu R32.',
      ogDescription: 'Muzyka na żywo, DJ-e, autorskie koktajle. Serce nocnego Wrocławia.',
    },
    events: {
      title: 'Wydarzenia - SiSi Wrocław',
      description:
        'Nadchodzące wydarzenia w SiSi Wrocław - koncerty, DJ-e i imprezy tematyczne w sercu kompleksu R32. Zobacz też archiwum minionych nocy.',
      ogDescription: 'Koncerty, DJ-e i imprezy tematyczne. Nadchodzące wydarzenia i archiwum SiSi Wrocław.',
    },
    menu: {
      title: 'Menu - SiSi Wrocław',
      description: 'Karta baru SiSi Wrocław - autorskie koktajle, polskie wina, piwa belgijskie i Night Menu by The Cork.',
      ogDescription: 'Autorskie koktajle, polskie wina i Night Menu by The Cork. Karta SiSi Wrocław.',
    },
    careers: {
      title: 'Kariera - SiSi Wrocław',
      description: 'Dołącz do zespołu SiSi Wrocław - szukamy barmana, kelnerki i barbacka.',
      ogDescription: 'Dołącz do zespołu SiSi Wrocław. Otwarte rekrutacje: barman, kelnerka, barback.',
    },
    reservations: {
      title: 'Rezerwacje - SiSi Wrocław',
      description: 'Zarezerwuj stolik w SiSi - serce nocnego Wrocławia. Warunki rezerwacji i kontakt do eventów firmowych.',
      ogDescription: 'Zaplanuj wyjątkowy wieczór i zarezerwuj miejsce w sercu naszego klubu.',
    },
    corporate: {
      title: 'Eventy firmowe - SiSi & The Cork Wrocław',
      description:
        'Przestrzeń na eventy firmowe w centrum Wrocławia: konferencje, panele, prezentacje, kolacje, premiery i networking. 663 m², do 150 miejsc siedzących w The Cork, 2 ekrany.',
      ogDescription: 'Konferencje, prezentacje, kolacje i wieczorne eventy firmowe w sercu Wrocławia. SiSi & The Cork.',
    },
    contact: {
      title: 'Kontakt - SiSi Wrocław',
      description:
        'Dane kontaktowe i informacje o podmiocie prowadzącym klub SiSi Wrocław - adres, telefon, e-mail oraz dane rejestrowe (NIP, REGON, KRS).',
      ogDescription: 'Dane kontaktowe i rejestrowe klubu SiSi Wrocław.',
    },
    terms: {
      title: 'Regulamin - SiSi Wrocław',
      description: 'Regulamin klubu SiSi Wrocław - zasady wstępu, rezerwacji stolików, przebywania na terenie lokalu i reklamacji.',
      ogDescription: 'Regulamin klubu SiSi Wrocław - wstęp, rezerwacje, zasady i reklamacje.',
    },
    privacy: {
      title: 'Polityka prywatności - SiSi Wrocław',
      description: 'Polityka prywatności klubu SiSi Wrocław - administrator danych, cele i podstawy prawne przetwarzania oraz prawa wynikające z RODO.',
      ogDescription: 'Jak przetwarzamy dane osobowe w SiSi Wrocław - zgodnie z RODO.',
    },
    cookies: {
      title: 'Polityka cookies - SiSi Wrocław',
      description: 'Polityka cookies klubu SiSi Wrocław - jakie pliki cookies i pamięć lokalną wykorzystujemy oraz jak zarządzać zgodą.',
      ogDescription: 'Jakie cookies stosuje SiSi Wrocław i jak nimi zarządzać.',
    },
    notFound: {
      title: '404 - Nie znaleziono strony | SiSi Wrocław',
      description: 'Strona, której szukasz, nie istnieje. Wróć na stronę główną SiSi Wrocław.',
      ogDescription: 'Strona nie istnieje. Wróć na stronę główną SiSi Wrocław.',
    },
  },

  common: {
    hoursDays: 'Piątek - Sobota',
  },

  nav: {
    home: 'Strona główna',
    events: 'Wydarzenia',
    menu: 'Menu',
    careers: 'Kariera',
    corporate: 'Dla firm',
    reservations: 'Rezerwacje',
    contact: 'Kontakt',
    terms: 'Regulamin',
    privacy: 'Polityka prywatności',
    cookies: 'Polityka cookies',
    skip: 'Przejdź do treści',
    mainNav: 'Główna nawigacja',
    mobileNav: 'Menu mobilne',
    openMenu: 'Otwórz menu',
    closeMenu: 'Zamknij menu',
    langLabel: 'Wybór języka',
    langCurrent: 'Aktualny język',
    homeAria: 'SiSi Wrocław - strona główna',
  },

  footer: {
    tagline: 'Serce nocnego Wrocławia. Muzyka, koktajle, atmosfera.',
    pagesHeading: 'Strony',
    contactHeading: 'Kontakt',
    hoursHeading: 'Godziny otwarcia',
    legalHeading: 'Informacje prawne',
    rights: '© 2026 SiSi Wrocław. Wszelkie prawa zastrzeżone.',
  },

  cookie: {
    // {cookies} and {privacy} are replaced with links to the policy pages.
    text: 'Używamy plików cookies i podobnych technologii niezbędnych do działania strony. Szczegóły znajdziesz w {cookies} oraz {privacy}.',
    cookiesLink: 'Polityce cookies',
    privacyLink: 'Polityce prywatności',
    accept: 'Akceptuję',
    reject: 'Tylko niezbędne',
    dialogLabel: 'Zgoda na pliki cookies',
  },

  buttons: {
    reserveOnline: 'Zarezerwuj online',
    reserve: 'Zarezerwuj',
    bookTable: 'Zarezerwuj stolik',
    calendar: 'Kalendarz imprez',
    seeAllEvents: 'Zobacz wszystkie wydarzenia',
    seeFullMenu: 'Zobacz kartę baru',
    discoverR32: 'Odkryj R32',
    enquire: 'Zapytaj o termin',
    planEvent: 'Zaplanuj wydarzenie',
    learnSpaces: 'Poznaj przestrzenie',
    home: 'Strona główna',
  },

  hero: {
    titleLine1: 'SERCE WROCŁAWIA',
    titleLine2: 'BIJE W SiSi',
    discover: 'ODKRYJ',
  },

  about: {
    eyebrow: 'O nas',
    title: 'Muzyczna ewolucja wieczoru',
    intro:
      'SISI to przestrzeń, w której wieczór ma swój wyjątkowy rytm. Rozpoczynamy od klimatycznej muzyki na żywo, która tworzy idealne tło dla relaksu i rozmów. Następnie płynnie przechodzimy do dynamicznych setów najlepszych DJ-ów, gwarantujących energię i taniec do samego rana. Tworzymy miejsce dla gości ceniących najwyższą jakość i niezapomnianą, wyjątkową atmosferę.',
    cards: [
      'Nowoczesna przestrzeń muzyczna',
      'Friday Session',
      'Live Acty: muzyczny wstęp do wyjątkowej nocy',
    ],
  },

  r32: {
    eyebrow: 'R32',
    title: 'Noc bez kompromisów',
    body: 'Zacznij wieczór od kolacji w naszej restauracji The Cork, by płynnie przenieść się do świata SISI - pulsującego serca kompleksu R32 i miejsca, w którym zechcesz zostać na dłużej.',
  },

  menuTeaser: {
    eyebrow: 'Karta baru',
    title: 'Menu',
    tabs: [
      {
        title: 'Koktajle',
        body: 'Autorskie koktajle SISI to esencja nowoczesnej miksologii, w której nasi doświadczeni barmani z artystyczną precyzją łączą najwyższej jakości składniki. Każda kompozycja stanowi unikalne doznanie, zachwycające zarówno głębią smaku, jak i wyszukaną formą prezentacji z efektem "wow".',
      },
      {
        title: 'Karta alkoholi',
        body: 'Stawiamy na polskie winnice - nasza karta to selekcja rodzimych win, od wytrawnych bieli po pełne czerwienie, podawanych kieliszkiem i butelką. Uzupełnia ją starannie wybrany wachlarz alkoholi oraz piw, w tym belgijskich klasyków - tak, by każdy znalazł coś dla siebie.',
      },
      {
        title: 'Przekąski',
        body: 'Nasze Night Menu przygotowuje The Cork - to propozycja stworzona do dzielenia się przy stoliku: kawior, ostrygi, deski serów i wędlin (charcuterie). Eleganckie przekąski, które idealnie dopełniają wieczór przy koktajlu lub kieliszku wina.',
      },
    ],
  },

  chivas: { title: 'Strefa Chivas Regal' },

  homeEvents: {
    eyebrow: 'Wydarzenia',
    title: 'Nadchodzące wydarzenia',
  },

  homeB2B: {
    eyebrow: 'Eventy firmowe',
    title: 'ZORGANIZUJ WYDARZENIE FIRMOWE W SiSi',
    body: 'Konferencje, prezentacje, kolacje, premiery i wieczorne eventy firmowe. Połącz restaurację The Cork z energią SiSi i przygotuj wszystko w jednym miejscu w centrum Wrocławia.',
  },

  reservationsHome: {
    eyebrow: 'Rezerwacje',
    title: 'Zarezerwuj stolik',
    body: 'Zaplanuj wyjątkowy wieczór i zapewnij sobie komfortowe miejsce w sercu naszego klubu. Rezerwacja online zajmuje chwilę - resztę zostaw nam.',
    reassure: 'Potwierdzenie od ręki · najlepsze stoliki znikają pierwsze',
    terms: 'Klub 21+. Rezerwacja stolika to 50 zł od osoby do wykorzystania przy stoliku; w soboty obowiązuje dodatkowy wstęp 30 zł od osoby.',
    info: {
      hours: 'Godziny',
      address: 'Adres',
      reservations: 'Rezerwacje',
      corporate: 'Eventy firmowe',
    },
  },

  eventsPage: {
    label: 'Co się dzieje',
    title: 'Wydarzenia',
    subtitle:
      'Koncerty, DJ-e i imprezy tematyczne. Przewiń, by zobaczyć, co gramy w najbliższe weekendy - i zajrzyj do archiwum minionych nocy.',
    upcoming: 'Nadchodzące',
    archive: 'Archiwum',
    scrollHint: 'przewiń →',
    back: 'Wszystkie wydarzenia',
    empty: 'Wkrótce ogłosimy kolejne wydarzenia - śledź nas na Instagramie.',
  },

  eventCard: {
    reserve: 'Zarezerwuj',
    finished: 'Wydarzenie zakończone',
    freeEntry: 'Wstęp wolny',
    entry: 'Wstęp',
  },

  menuPage: {
    label: 'Karta baru',
    title: 'Menu',
    subtitle: 'Autorskie koktajle, polskie wina, piwa belgijskie i Night Menu by The Cork. Ceny w złotych.',
    sections: {
      cocktails: 'Koktajle',
      drinks: 'Napoje',
      beer: 'Piwo',
      draught: 'Lane',
      bottled: 'Butelkowe',
      wines: 'Karta win',
      nightMenu: 'Night Menu by The Cork',
    },
    bottledNote: 'Wszystkie butelki 330 ml.',
    wineLead: 'Stawiamy na polskie winnice - selekcja rodzimych win, od wytrawnych bieli po pełne czerwienie, podawanych kieliszkiem i butelką.',
    nightLead: 'Eleganckie przekąski do dzielenia, przygotowane przez The Cork: kawior, ostrygi, deski serów i wędlin (charcuterie).',
    foodwineNote: 'Pełna karta win oraz Night Menu dostępne w klubie - zapytaj obsługę o aktualną ofertę i ceny.',
    ctaText: 'Chcesz zarezerwować stolik i zamówić z wyprzedzeniem? Skontaktuj się z nami.',
  },

  careersPage: {
    label: 'Dołącz do nas',
    title: 'Kariera',
    subtitle: 'Szukamy ludzi z pasją do dobrego drinka i muzyki. Klub pracuje w piątki i soboty - barmani również w ciągu tygodnia, w godzinach The Cork.',
    positionLabel: 'Stanowisko',
    apply: 'Aplikuj',
    howToApply: 'Jak aplikować',
    howLead: 'Wyślij CV na {email}',
    howNote: 'W tytule wiadomości wpisz stanowisko i swoje imię i nazwisko, np. {example}.',
    howExample: 'Barman - Jan Kowalski',
    jobs: [
      {
        title: 'Barman',
        bullets: [
          'Przygotowywanie koktajli i obsługa baru',
          'Doświadczenie za barem mile widziane',
          'Praca w piątki i soboty, możliwe zmiany w tygodniu (godziny The Cork)',
          'Znajomość języka angielskiego',
        ],
      },
      {
        title: 'Kelnerka / Kelner',
        bullets: [
          'Obsługa gości przy stolikach',
          'Dobra organizacja i odporność na stres',
          'Praca w weekendy (piątek-sobota)',
          'Znajomość języka angielskiego',
        ],
      },
      {
        title: 'Barback',
        bullets: [
          'Wsparcie barmana i zaopatrzenie baru',
          'Idealne stanowisko na start w branży',
          'Praca w weekendy (piątek-sobota)',
          'Dyspozycyjność i zaangażowanie',
        ],
      },
    ],
  },

  reservationsPage: {
    conditionsTitle: 'Warunki rezerwacji',
    conditions: [
      'Koszt rezerwacji wynosi 50 zł od osoby - cała kwota jest do wykorzystania przy stoliku u obsługi.',
      'W piątki wstęp do klubu dla osób z rezerwacją jest bezpłatny.',
      'W soboty do rezerwacji doliczany jest wstęp w wysokości 30 zł od osoby.',
      'Podczas rezerwacji można wybrać pozycje z menu, które będą czekały na gości na start.',
      'Dostępne są również specjalne pakiety w promocyjnych cenach.',
      'Po dokonaniu rezerwacji prosimy o oczekiwanie na jej akceptację i przesłanie szczegółowych warunków.',
      'Warunkiem potwierdzenia rezerwacji jest przedpłata w ciągu 120 minut od otrzymania informacji. Brak płatności w tym czasie oznacza automatyczne anulowanie rezerwacji.',
      'Rezerwację należy odebrać w godzinach 22:00-23:30. W przypadku spóźnienia powyżej 30 minut stolik może zostać przekazany innym gościom.',
      'Wstęp do lokalu mają wyłącznie osoby powyżej 21. roku życia, posiadające ważny dokument tożsamości.',
      'W lokalu obowiązuje selekcja oraz dress code w stylu smart casual. Obsługa zastrzega sobie prawo odmowy wstępu bez podania przyczyny, również osobom z rezerwacją (wpłacona kwota zostaje wówczas zwrócona).',
    ],
    note: 'Ceny mogą ulec zmianie podczas imprez specjalnych. Szczegółowe warunki są każdorazowo potwierdzane podczas rezerwacji.',
  },

  contactPage: {
    label: 'Informacje',
    subtitle: 'Rezerwacje, eventy firmowe oraz dane rejestrowe podmiotu prowadzącego klub SiSi.',
    contactHeading: 'Kontakt',
    reservationsLabel: 'Rezerwacje stolików',
    corporateLabel: 'Eventy firmowe',
    addressLabel: 'Adres',
    hoursLabel: 'Godziny otwarcia',
    registryHeading: 'Dane rejestrowe',
    registryIntro: 'Podmiotem prowadzącym klub SiSi oraz administratorem danych osobowych jest:',
    legalForm: 'Forma prawna: spółka z ograniczoną odpowiedzialnością. Sąd rejestrowy: Sąd Rejonowy dla Wrocławia-Fabrycznej we Wrocławiu.',
  },

  legal: {
    updatedLabel: 'Ostatnia aktualizacja:',
    // Shown on the English legal pages (en text is a convenience translation).
    convenienceNote:
      'Tłumaczenie udostępniono wyłącznie dla wygody. W razie rozbieżności wiążąca jest polska wersja językowa.',
    // Shown on DE/IT/CS legal pages, which display the English text on purpose.
    englishFallbackNote:
      'Treść prawna jest tu prezentowana w języku angielskim. Wiążąca pozostaje polska wersja językowa.',
  },

  notFound: {
    label: 'Błąd 404',
    title: 'Tej strony nie ma',
    body: 'Wygląda na to, że strona, której szukasz, zniknęła jak ostatni gość o świcie. Wróć na stronę główną albo sprawdź, co u nas gramy.',
  },

  // B2B service claims in this section (open bar, bringing a cake, external
  // photographer, deposit / payment terms, continuous cleaning) confirmed
  // accurate by the owner on 2026-06-24.
  b2b: {
    hero: {
      eyebrow: 'Eventy firmowe w centrum Wrocławia',
      title: 'Przestrzeń na wydarzenia, które zostają w pamięci',
      body: 'Od konferencji, paneli i prezentacji po kolacje, premiery, networking i wieczorne wydarzenia firmowe. Połącz restaurację The Cork z energią SiSi i zorganizuj cały event w jednym miejscu.',
      ctaPrimary: 'Zapytaj o termin',
      ctaSecondary: 'Poznaj przestrzenie',
    },
    facts: {
      heading: 'Przestrzeń w liczbach',
      items: [
        { value: '663 m²', label: 'przestrzeni eventowej' },
        { value: 'do 150', label: 'miejsc siedzących w The Cork' },
        { value: '2 ekrany', label: 'do prezentacji' },
        { value: 'centrum', label: 'Wrocławia' },
      ],
    },
    formats: {
      heading: 'Formaty wydarzeń',
      intro: 'Jedno miejsce, w którym poprowadzisz część oficjalną i wieczorną.',
      items: [
        { title: 'Konferencje', body: 'Spotkania z prezentacjami i częścią merytoryczną, z wykorzystaniem dwóch ekranów.' },
        { title: 'Panele dyskusyjne', body: 'Rozmowy i debaty z udziałem prelegentów oraz publiczności.' },
        { title: 'Prezentacje', body: 'Pokazy produktów, podsumowania i wystąpienia firmowe.' },
        { title: 'Premiery produktów', body: 'Premiera nowego produktu lub marki w efektownej oprawie.' },
        { title: 'Kolacje firmowe', body: 'Zasiadane kolacje w restauracji The Cork.' },
        { title: 'Networking', body: 'Spotkania branżowe i wieczory w swobodnej atmosferze.' },
        { title: 'Imprezy firmowe', body: 'Wieczory integracyjne i świętowanie z energią klubu SiSi.' },
        { title: 'Prywatne eventy marek', body: 'Zamknięte wydarzenia dopasowane do charakteru marki.' },
      ],
    },
    included: {
      heading: 'Co zapewniamy',
      intro: 'Obsługę wydarzenia bierzemy na siebie - od baru i cateringu po oprawę muzyczną.',
      items: [
        { title: 'Bar i barmani', body: 'Profesjonalny bar z obsługą barmańską oraz opcją open baru z koktajlami.' },
        { title: 'Catering', body: 'Menu i catering dopasowane do charakteru wydarzenia.' },
        { title: 'Oprawa muzyczna', body: 'DJ oraz muzyka na żywo - zakres do uzgodnienia.' },
        { title: 'Szatnia', body: 'Obsługa szatni dla Twoich gości.' },
        { title: 'Serwis sprzątający', body: 'Bieżący serwis czystości przez cały czas trwania wydarzenia.' },
        { title: 'Koordynacja', body: 'Wsparcie techniczne i organizacyjne na każdym etapie.' },
      ],
    },
    spaces: {
      heading: 'Przestrzenie',
      theCork: {
        title: 'The Cork',
        body: 'Restauracja w sercu R32 - naturalna sceneria na część oficjalną i wieczór.',
        points: [
          'Zasiadane kolacje, prezentacje i spotkania w ciągu dnia',
          'Do 150 miejsc siedzących',
          '2 ekrany do prezentacji',
        ],
      },
      sisi: {
        title: 'SiSi',
        body: 'Klub muzyczny z energią, która domyka wieczór.',
        points: [
          'Wieczorne programy, networking i świętowanie',
          'Muzyka na żywo i DJ-e',
        ],
      },
      combined: {
        title: 'Cały kompleks R32',
        body: 'Przejdź płynnie od części formalnej lub kolacji do wieczornego programu - w jednym miejscu, na łącznie 663 m² przestrzeni.',
      },
    },
    why: {
      heading: 'Dlaczego to miejsce',
      items: [
        { title: 'Część oficjalna i wieczór w jednym miejscu', body: 'Konferencja lub kolacja płynnie przechodzą w wieczorny program.' },
        { title: 'Centrum Wrocławia', body: 'Dogodna lokalizacja w sercu miasta.' },
        { title: 'Restauracja i klub', body: 'The Cork i SiSi w ramach jednego kompleksu R32.' },
        { title: 'Elastyczny format', body: 'Koncepcję wydarzenia dopasowujemy do Twoich potrzeb.' },
        { title: 'Dwa ekrany', body: 'Gotowe zaplecze do prezentacji i paneli.' },
        { title: 'Bezpośredni kontakt z zespołem', body: 'Rozmawiasz wprost z osobami, które prowadzą wydarzenie.' },
      ],
    },
    process: {
      heading: 'Jak to działa',
      steps: [
        { title: 'Wyślij zapytanie', body: 'Napisz, jaki termin, format i liczbę gości rozważasz.' },
        { title: 'Omawiamy szczegóły', body: 'Ustalamy format wydarzenia i Twoje wymagania.' },
        { title: 'Otrzymujesz propozycję', body: 'Przygotowujemy ofertę dopasowaną do potrzeb.' },
        { title: 'Potwierdzasz termin', body: 'Ustalamy datę i wszystkie szczegóły.' },
        { title: 'Realizujemy event', body: 'Zajmujemy się przebiegiem wydarzenia.' },
      ],
    },
    projects: {
      heading: 'Wybrane realizacje',
      emptyTitle: 'Mamy doświadczenie w realizacji dużych wydarzeń.',
      emptyBody: 'Wkrótce pokażemy wybrane projekty.',
    },
    faq: {
      heading: 'Najczęstsze pytania',
      items: [
        { q: 'Jakie wydarzenia firmowe można u was zorganizować?', a: 'Konferencje, panele, prezentacje, premiery produktów, kolacje firmowe, networking, imprezy firmowe i prywatne eventy marek.' },
        { q: 'Ile osób pomieści The Cork na miejscach siedzących?', a: 'Restauracja The Cork pomieści do 150 gości na miejscach siedzących.' },
        { q: 'Czy można zorganizować prezentację lub panel dyskusyjny?', a: 'Tak. Przestrzeń nadaje się do prezentacji i paneli, a do dyspozycji są 2 ekrany.' },
        { q: 'Czy dostępne są ekrany?', a: 'Tak, dostępne są 2 ekrany do prezentacji.' },
        { q: 'Czy można połączyć The Cork i SiSi w ramach jednego wydarzenia?', a: 'Tak. Część oficjalną lub kolację w The Cork można płynnie połączyć z wieczornym programem w SiSi.' },
        { q: 'Czy format wydarzenia można dopasować?', a: 'Tak, koncepcję dopasowujemy do charakteru wydarzenia. Opisz swoje potrzeby w zapytaniu, a zespół potwierdzi dostępne opcje.' },
        { q: 'Jak zapytać o dostępność terminu?', a: 'Wyślij zapytanie przez formularz na tej stronie albo zadzwoń lub napisz do nas.' },
        { q: 'Jakie informacje warto podać w zapytaniu?', a: 'Planowany termin, liczbę gości i format wydarzenia. Wymagania dotyczące cateringu, techniki czy dostępności prosimy zaznaczyć w zapytaniu, aby zespół potwierdził dostępne opcje.' },
        { q: 'Czy zapewniacie catering i bar?', a: 'Tak. Catering i obsługę barmańską zapewniamy na miejscu. Elementy tradycyjne, jak tort, można przynieść po wcześniejszym uzgodnieniu.' },
        { q: 'Czy możemy przyjść z własnym fotografem?', a: 'Tak. Dokumentację fotograficzną może realizować fotograf wybrany przez Organizatora.' },
        { q: 'Jak zarezerwować termin?', a: 'Termin potwierdzamy umową i zaliczką, a pozostała część jest płatna przed wydarzeniem. Szczegóły ustalamy indywidualnie.' },
      ],
    },
    finalCta: {
      heading: 'Porozmawiajmy o Twoim wydarzeniu',
      body: 'Opowiedz nam o planowanym terminie, liczbie gości i formacie wydarzenia. Nasz zespół przygotuje propozycję dopasowaną do Twoich potrzeb.',
      cta: 'Zapytaj o termin',
    },
    form: {
      legend: 'Zapytanie o wydarzenie',
      requiredHint: 'Pola oznaczone * są wymagane.',
      optional: '(opcjonalnie)',
      companyName: 'Nazwa firmy',
      contactPerson: 'Osoba kontaktowa',
      email: 'E-mail',
      phone: 'Telefon',
      eventType: 'Rodzaj wydarzenia',
      eventTypePlaceholder: 'Wybierz rodzaj',
      eventTypeOptions: {
        conference: 'Konferencja',
        panel: 'Panel dyskusyjny',
        presentation: 'Prezentacja',
        launch: 'Premiera produktu',
        dinner: 'Kolacja firmowa',
        networking: 'Networking',
        party: 'Impreza firmowa',
        private: 'Prywatny event marki',
        other: 'Inne',
      },
      guests: 'Szacowana liczba gości',
      date: 'Preferowany termin',
      dateFlexible: 'Termin jest elastyczny',
      datePlaceholder: 'Wybierz datę',
      dateModeSingle: 'Konkretna data',
      dateModeRange: 'Zakres dat',
      datePrevMonth: 'Poprzedni miesiąc',
      dateNextMonth: 'Następny miesiąc',
      dateClear: 'Wyczyść',
      guestsDecrease: 'Zmniejsz liczbę gości',
      guestsIncrease: 'Zwiększ liczbę gości',
      space: 'Preferowana przestrzeń',
      spacePlaceholder: 'Wybierz przestrzeń',
      spaceOptions: {
        cork: 'The Cork',
        sisi: 'SiSi',
        both: 'Obie przestrzenie',
        unsure: 'Nie wiem jeszcze',
      },
      duration: 'Czas trwania wydarzenia',
      presentation: 'Wymagania dot. prezentacji lub panelu',
      catering: 'Wymagania cateringowe',
      technical: 'Dodatkowe wymagania techniczne',
      message: 'Wiadomość',
      messagePlaceholder: 'Opisz krótko swoje wydarzenie.',
      consent: 'Wyrażam zgodę na kontakt w sprawie mojego zapytania i potwierdzam zapoznanie się z {privacy}.',
      consentPrivacyLink: 'Polityką prywatności',
      submit: 'Wyślij zapytanie',
      sending: 'Wysyłanie…',
      errorSummary: 'Popraw zaznaczone pola, aby wysłać formularz.',
      errors: {
        required: 'To pole jest wymagane.',
        email: 'Podaj poprawny adres e-mail.',
        consent: 'Zgoda jest niezbędna, aby wysłać zapytanie.',
      },
      success: {
        title: 'Dziękujemy za zapytanie.',
        body: 'Odezwiemy się z propozycją. W pilnej sprawie zadzwoń lub napisz.',
      },
      error: {
        title: 'Nie udało się wysłać formularza.',
        body: 'Spróbuj ponownie za chwilę lub skontaktuj się z nami bezpośrednio:',
      },
    },
  },
};

export default pl;
export type UI = typeof pl;
