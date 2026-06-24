/* German. Mirrors the shape of pl.ts (enforced by `: UI`). Nav/button labels
   kept short to avoid layout overflow. */
import type { UI } from './pl';

const de: UI = {
  meta: {
    home: {
      title: 'SiSi Wrocław - Music Club & Bar',
      description:
        'SiSi ist das Herz des Breslauer Nachtlebens - Live-Musik, Top-DJs, Signature-Cocktails und eine einzigartige Atmosphäre im R32-Komplex.',
      ogDescription: 'Live-Musik, DJs und Signature-Cocktails. Das Herz des Breslauer Nachtlebens.',
    },
    events: {
      title: 'Veranstaltungen - SiSi Wrocław',
      description:
        'Kommende Veranstaltungen im SiSi Wrocław - Konzerte, DJs und Themenabende im R32-Komplex. Auch das Archiv vergangener Nächte.',
      ogDescription: 'Konzerte, DJs und Themenabende. Kommende Veranstaltungen und Archiv im SiSi Wrocław.',
    },
    menu: {
      title: 'Menü - SiSi Wrocław',
      description: 'Die Barkarte des SiSi Wrocław - Signature-Cocktails, polnische Weine, belgische Biere und ein Night Menu by The Cork.',
      ogDescription: 'Signature-Cocktails, polnische Weine und ein Night Menu by The Cork. SiSi Wrocław.',
    },
    careers: {
      title: 'Karriere - SiSi Wrocław',
      description: 'Werde Teil des SiSi-Wrocław-Teams - wir suchen Barkeeper, Servicekräfte und einen Barback.',
      ogDescription: 'Werde Teil des SiSi-Wrocław-Teams. Offene Stellen: Barkeeper, Service, Barback.',
    },
    reservations: {
      title: 'Reservierungen - SiSi Wrocław',
      description: 'Reserviere einen Tisch im SiSi - dem Herz des Breslauer Nachtlebens. Reservierungsbedingungen und Kontakt für Firmenevents.',
      ogDescription: 'Plane einen besonderen Abend und sichere dir deinen Platz im Herzen des Clubs.',
    },
    corporate: {
      title: 'Firmenevents - SiSi & The Cork Wrocław',
      description:
        'Eventlocation im Zentrum von Breslau: Konferenzen, Panels, Präsentationen, Dinner, Launches und Networking. 663 m², bis zu 150 Sitzplätze im The Cork, 2 Bildschirme.',
      ogDescription: 'Konferenzen, Präsentationen, Dinner und abendliche Firmenevents im Zentrum von Breslau. SiSi & The Cork.',
    },
    contact: {
      title: 'Kontakt - SiSi Wrocław',
      description:
        'Kontaktdaten und Unternehmensangaben zum SiSi Wrocław - Adresse, Telefon, E-Mail und Registerdaten (NIP, REGON, KRS).',
      ogDescription: 'Kontakt- und Unternehmensdaten des SiSi Wrocław.',
    },
    terms: {
      title: 'AGB - SiSi Wrocław',
      description: 'Hausordnung des SiSi Wrocław - Einlass, Tischreservierungen, Verhalten im Lokal und Reklamationen.',
      ogDescription: 'Hausordnung des SiSi Wrocław - Einlass, Reservierungen, Regeln und Reklamationen.',
    },
    privacy: {
      title: 'Datenschutz - SiSi Wrocław',
      description: 'Datenschutzerklärung des SiSi Wrocław - Verantwortlicher, Zwecke und Rechtsgrundlagen der Verarbeitung sowie deine DSGVO-Rechte.',
      ogDescription: 'Wie wir personenbezogene Daten im SiSi Wrocław verarbeiten - gemäß DSGVO.',
    },
    cookies: {
      title: 'Cookie-Richtlinie - SiSi Wrocław',
      description: 'Cookie-Richtlinie des SiSi Wrocław - welche Cookies und welcher lokale Speicher genutzt werden und wie du deine Einwilligung verwaltest.',
      ogDescription: 'Welche Cookies das SiSi Wrocław nutzt und wie du sie verwaltest.',
    },
    notFound: {
      title: '404 - Seite nicht gefunden | SiSi Wrocław',
      description: 'Die gesuchte Seite existiert nicht. Zurück zur Startseite des SiSi Wrocław.',
      ogDescription: 'Seite nicht gefunden. Zurück zur Startseite des SiSi Wrocław.',
    },
  },

  common: {
    hoursDays: 'Freitag - Samstag',
  },

  nav: {
    home: 'Start',
    events: 'Veranstaltungen',
    menu: 'Menü',
    careers: 'Karriere',
    corporate: 'Firmenevents',
    reservations: 'Reservieren',
    contact: 'Kontakt',
    terms: 'AGB',
    privacy: 'Datenschutz',
    cookies: 'Cookie-Richtlinie',
    skip: 'Zum Inhalt springen',
    mainNav: 'Hauptnavigation',
    mobileNav: 'Mobiles Menü',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    langLabel: 'Sprache wählen',
    langCurrent: 'Aktuelle Sprache',
    homeAria: 'SiSi Wrocław - Startseite',
  },

  footer: {
    tagline: 'Das Herz des Breslauer Nachtlebens. Musik, Cocktails, Atmosphäre.',
    pagesHeading: 'Seiten',
    contactHeading: 'Kontakt',
    hoursHeading: 'Öffnungszeiten',
    legalHeading: 'Rechtliches',
    rights: '© 2026 SiSi Wrocław. Alle Rechte vorbehalten.',
  },

  cookie: {
    text: 'Wir verwenden Cookies und ähnliche Technologien, die für den Betrieb der Website notwendig sind. Details findest du in unserer {cookies} und {privacy}.',
    cookiesLink: 'Cookie-Richtlinie',
    privacyLink: 'Datenschutzerklärung',
    accept: 'Akzeptieren',
    reject: 'Nur notwendige',
    dialogLabel: 'Cookie-Einwilligung',
  },

  buttons: {
    reserveOnline: 'Online buchen',
    reserve: 'Buchen',
    bookTable: 'Tisch buchen',
    calendar: 'Veranstaltungskalender',
    seeAllEvents: 'Alle Veranstaltungen',
    seeFullMenu: 'Komplettes Menü ansehen',
    discoverR32: 'R32 entdecken',
    enquire: 'Termin anfragen',
    planEvent: 'Event planen',
    learnSpaces: 'Räume entdecken',
    home: 'Start',
  },

  hero: {
    titleLine1: 'Das Herz Breslaus',
    titleLine2: 'schlägt im SiSi',
    discover: 'ENTDECKEN',
  },

  about: {
    eyebrow: 'Über uns',
    title: 'Die musikalische Evolution des Abends',
    intro:
      'SISI ist ein Ort, an dem der Abend seinen eigenen Rhythmus findet. Wir beginnen mit stimmungsvoller Live-Musik - der perfekte Rahmen zum Entspannen und für Gespräche. Dann geht es nahtlos über zu energiegeladenen Sets der besten DJs, die den Floor bis zum Morgengrauen in Bewegung halten. Wir schaffen einen Ort für Gäste, die höchste Qualität und eine unvergessliche, einzigartige Atmosphäre schätzen.',
    cards: [
      'Ein moderner Musikraum',
      'Friday Session',
      'Live Acts: der musikalische Auftakt zu einer außergewöhnlichen Nacht',
    ],
  },

  r32: {
    eyebrow: 'R32',
    title: 'Eine Nacht ohne Kompromisse',
    body: 'Beginne den Abend mit einem Dinner in unserem Restaurant The Cork und gleite nahtlos in die Welt von SISI - das pulsierende Herz des R32-Komplexes und ein Ort, an dem du länger bleiben willst.',
  },

  menuTeaser: {
    eyebrow: 'Barkarte',
    title: 'Menü',
    tabs: [
      {
        title: 'Cocktails',
        body: 'Die Signature-Cocktails des SISI sind die Essenz moderner Mixology: Unsere erfahrenen Barkeeper verbinden mit künstlerischer Präzision beste Zutaten. Jede Kreation ist ein einzigartiges Erlebnis, das mit Geschmackstiefe und einer raffinierten "Wow"-Präsentation begeistert.',
      },
      {
        title: 'Getränkekarte',
        body: 'Wir setzen auf polnische Weingüter - unsere Karte ist eine Auswahl heimischer Weine, von trockenen Weißweinen bis zu kräftigen Rotweinen, glasweise und in der Flasche. Ergänzt wird sie durch sorgfältig ausgewählte Spirituosen und Biere, darunter belgische Klassiker - für jeden Geschmack.',
      },
      {
        title: 'Snacks',
        body: 'Unser Night Menu wird von The Cork zubereitet - gemacht zum Teilen am Tisch: Kaviar, Austern, Käse- und Charcuterie-Platten. Elegante Häppchen, die den Abend bei einem Cocktail oder einem Glas Wein abrunden.',
      },
    ],
  },

  chivas: { title: 'Chivas Regal Zone' },

  homeEvents: {
    eyebrow: 'Veranstaltungen',
    title: 'Kommende Veranstaltungen',
  },

  homeB2B: {
    eyebrow: 'Firmenevents',
    title: 'Veranstalte dein Firmenevent im SiSi',
    body: 'Konferenzen, Präsentationen, Dinner, Launches und abendliche Firmenevents. Verbinde das Restaurant The Cork mit der Energie von SiSi und organisiere alles an einem Ort im Zentrum von Breslau.',
  },

  reservationsHome: {
    eyebrow: 'Reservierungen',
    title: 'Tisch reservieren',
    body: 'Plane einen besonderen Abend und sichere dir einen komfortablen Platz im Herzen unseres Clubs. Die Online-Reservierung dauert nur einen Moment - den Rest überlass uns.',
    reassure: 'Sofortige Bestätigung · die besten Tische sind zuerst weg',
    info: {
      hours: 'Zeiten',
      address: 'Adresse',
      reservations: 'Reservierungen',
      corporate: 'Firmenevents',
    },
  },

  eventsPage: {
    label: 'Was läuft',
    title: 'Veranstaltungen',
    subtitle:
      'Konzerte, DJs und Themenabende. Scrolle, um zu sehen, was an den kommenden Wochenenden läuft - und stöbere im Archiv vergangener Nächte.',
    upcoming: 'Kommende',
    archive: 'Archiv',
    scrollHint: 'scrollen →',
    empty: 'Weitere Veranstaltungen folgen bald - folge uns auf Instagram.',
  },

  eventCard: {
    reserve: 'Buchen',
    finished: 'Veranstaltung beendet',
  },

  menuPage: {
    label: 'Barkarte',
    title: 'Menü',
    subtitle: 'Signature-Cocktails, polnische Weine, belgische Biere und ein Night Menu by The Cork. Preise in PLN.',
    sections: {
      cocktails: 'Cocktails',
      drinks: 'Alkoholfreie Getränke',
      draught: 'Bier vom Fass',
      bottled: 'Flaschenbier',
      wines: 'Weinkarte',
      nightMenu: 'Night Menu by The Cork',
    },
    bottledNote: 'Alle Flaschen 330 ml.',
    wineLead: 'Wir setzen auf polnische Weingüter - eine Auswahl heimischer Weine, von trockenen Weißweinen bis zu kräftigen Rotweinen, glasweise und in der Flasche.',
    nightLead: 'Elegante Häppchen zum Teilen, zubereitet von The Cork: Kaviar, Austern, Käse- und Charcuterie-Platten.',
    foodwineNote: 'Die vollständige Weinkarte und das Night Menu sind im Club erhältlich - frag unser Team nach der aktuellen Auswahl und den Preisen.',
    ctaText: 'Möchtest du einen Tisch reservieren und vorbestellen? Melde dich bei uns.',
  },

  careersPage: {
    label: 'Werde Teil von uns',
    title: 'Karriere',
    subtitle: 'Wir suchen Menschen mit Leidenschaft für gute Drinks und Musik. Der Club läuft freitags und samstags - Barkeeper auch unter der Woche, zu den Zeiten von The Cork.',
    positionLabel: 'Position',
    apply: 'Bewerben',
    howToApply: 'So bewirbst du dich',
    howLead: 'Sende deinen Lebenslauf an {email}',
    howNote: 'Trage im Betreff die Position und deinen vollständigen Namen ein, z. B. {example}.',
    howExample: 'Barkeeper - Jan Kowalski',
    jobs: [
      {
        title: 'Barkeeper',
        bullets: [
          'Cocktails zubereiten und die Bar betreuen',
          'Bar-Erfahrung willkommen',
          'Freitags und samstags, mögliche Schichten unter der Woche (Zeiten von The Cork)',
          'Englischkenntnisse',
        ],
      },
      {
        title: 'Kellner / Kellnerin',
        bullets: [
          'Gäste am Tisch bedienen',
          'Gut organisiert und stressresistent',
          'Wochenendarbeit (Freitag-Samstag)',
          'Englischkenntnisse',
        ],
      },
      {
        title: 'Barback',
        bullets: [
          'Unterstützung des Barkeepers und Nachschub für die Bar',
          'Ideale Einstiegsposition in der Branche',
          'Wochenendarbeit (Freitag-Samstag)',
          'Verfügbarkeit und Engagement',
        ],
      },
    ],
  },

  reservationsPage: {
    conditionsTitle: 'Reservierungsbedingungen',
    conditions: [
      'Die Reservierungsgebühr beträgt 50 PLN pro Person - der gesamte Betrag kann am Tisch beim Service eingelöst werden.',
      'Freitags ist der Eintritt für Gäste mit Reservierung kostenlos.',
      'Samstags wird ein Eintritt von 30 PLN pro Person zur Reservierung hinzugerechnet.',
      'Bei der Reservierung kannst du Menüpunkte vorauswählen, die bei Ankunft für deine Gäste bereitstehen.',
      'Außerdem sind spezielle Pakete zu Aktionspreisen verfügbar.',
      'Bitte warte nach der Reservierung auf die Bestätigung und die Zusendung der detaillierten Bedingungen.',
      'Die Reservierung wird durch eine Vorauszahlung innerhalb von 120 Minuten nach Erhalt der Angaben bestätigt. Ohne Zahlung in dieser Zeit wird die Reservierung automatisch storniert.',
      'Reservierungen sind zwischen 22:00 und 23:30 Uhr einzulösen. Bei mehr als 30 Minuten Verspätung kann der Tisch an andere Gäste vergeben werden.',
      'Einlass nur für Gäste über 21 Jahre mit gültigem Ausweis.',
      'Es gelten eine Türauswahl und ein Smart-Casual-Dresscode. Das Team behält sich vor, den Einlass ohne Angabe von Gründen zu verweigern, auch bei Gästen mit Reservierung (der gezahlte Betrag wird dann erstattet).',
    ],
    note: 'Bei Sonderveranstaltungen können sich die Preise ändern. Die genauen Bedingungen werden bei jeder Reservierung bestätigt.',
  },

  contactPage: {
    label: 'Informationen',
    subtitle: 'Reservierungen, Firmenevents und Registerdaten des Unternehmens, das den SiSi-Club betreibt.',
    contactHeading: 'Kontakt',
    reservationsLabel: 'Tischreservierungen',
    corporateLabel: 'Firmenevents',
    addressLabel: 'Adresse',
    hoursLabel: 'Öffnungszeiten',
    registryHeading: 'Unternehmensdaten',
    registryIntro: 'Der SiSi-Club wird betrieben, und personenbezogene Daten werden verantwortet, von:',
    legalForm: 'Rechtsform: Gesellschaft mit beschränkter Haftung (sp. z o.o.). Registergericht: Amtsgericht für Wrocław-Fabryczna in Breslau.',
  },

  legal: {
    updatedLabel: 'Zuletzt aktualisiert:',
    convenienceNote:
      'Diese Übersetzung dient nur der Bequemlichkeit. Bei Abweichungen ist die polnische Fassung maßgeblich.',
  },

  notFound: {
    label: 'Fehler 404',
    title: 'Diese Seite ist weg',
    body: 'Sieht aus, als wäre die gesuchte Seite verschwunden wie der letzte Gast im Morgengrauen. Zurück zur Startseite oder schau, was bei uns läuft.',
  },

  b2b: {
    hero: {
      eyebrow: 'Firmenevents im Zentrum von Breslau',
      title: 'Ein Raum für Events, die in Erinnerung bleiben',
      body: 'Von Konferenzen, Panels und Präsentationen bis zu Dinnern, Launches, Networking und abendlichen Firmenevents. Verbinde das Restaurant The Cork mit der Energie von SiSi und veranstalte das ganze Event an einem Ort.',
      ctaPrimary: 'Termin anfragen',
      ctaSecondary: 'Räume entdecken',
    },
    facts: {
      heading: 'Der Raum in Zahlen',
      items: [
        { value: '663 m²', label: 'Eventfläche' },
        { value: 'bis zu 150', label: 'Sitzplätze im The Cork' },
        { value: '2 Bildschirme', label: 'für Präsentationen' },
        { value: 'Zentrum', label: 'von Breslau' },
      ],
    },
    formats: {
      heading: 'Event-Formate',
      intro: 'Ein Ort für den offiziellen Teil und den Abend.',
      items: [
        { title: 'Konferenzen', body: 'Sessions mit Präsentationen und Programm, mit zwei Bildschirmen.' },
        { title: 'Panel-Diskussionen', body: 'Gespräche und Debatten mit Speakern und Publikum.' },
        { title: 'Präsentationen', body: 'Produktshows, Firmen-Updates und Vorträge.' },
        { title: 'Produkt-Launches', body: 'Launch eines neuen Produkts oder einer Marke in eindrucksvollem Rahmen.' },
        { title: 'Firmen-Dinner', body: 'Sitzdinner im Restaurant The Cork.' },
        { title: 'Networking', body: 'Branchentreffen und entspannte Abende.' },
        { title: 'Firmenfeiern', body: 'Team-Feiern mit der Energie von SiSi.' },
        { title: 'Private Markenevents', body: 'Geschlossene Events, auf die Marke zugeschnitten.' },
      ],
    },
    spaces: {
      heading: 'Räume',
      theCork: {
        title: 'The Cork',
        body: 'Ein Restaurant im Herzen von R32 - eine natürliche Kulisse für den offiziellen Teil und den Abend.',
        points: [
          'Sitzdinner, Präsentationen und Meetings am Tag',
          'Bis zu 150 Sitzplätze',
          '2 Präsentationsbildschirme',
        ],
      },
      sisi: {
        title: 'SiSi',
        body: 'Ein Music Club mit der Energie, den Abend ausklingen zu lassen.',
        points: [
          'Abendprogramme, Networking und Feiern',
          'Live-Musik und DJs',
        ],
      },
      combined: {
        title: 'Der gesamte R32-Komplex',
        body: 'Gehe nahtlos vom offiziellen Teil oder Dinner ins Abendprogramm über - alles an einem Ort, auf insgesamt 663 m² Fläche.',
      },
    },
    why: {
      heading: 'Warum diese Location',
      items: [
        { title: 'Offizieller Teil und Abend an einem Ort', body: 'Konferenz oder Dinner gehen direkt ins Abendprogramm über.' },
        { title: 'Zentrum von Breslau', body: 'Günstige Lage im Herzen der Stadt.' },
        { title: 'Restaurant und Club', body: 'The Cork und SiSi in einem R32-Komplex.' },
        { title: 'Flexibles Format', body: 'Wir gestalten das Eventkonzept nach deinen Wünschen.' },
        { title: 'Zwei Bildschirme', body: 'Bereite Unterstützung für Präsentationen und Panels.' },
        { title: 'Direkter Kontakt zum Team', body: 'Du sprichst direkt mit den Menschen, die das Event leiten.' },
      ],
    },
    process: {
      heading: 'So läuft es',
      steps: [
        { title: 'Anfrage senden', body: 'Nenne uns den Termin, das Format und die Gästezahl.' },
        { title: 'Details besprechen', body: 'Wir stimmen Format und Anforderungen ab.' },
        { title: 'Angebot erhalten', body: 'Wir erstellen ein passendes Angebot.' },
        { title: 'Termin bestätigen', body: 'Wir legen Datum und alle Details fest.' },
        { title: 'Event umsetzen', body: 'Wir kümmern uns um den Ablauf des Events.' },
      ],
    },
    projects: {
      heading: 'Ausgewählte Veranstaltungen',
      emptyTitle: 'Wir haben Erfahrung mit der Umsetzung großer Events.',
      emptyBody: 'Ausgewählte Projekte folgen in Kürze.',
    },
    faq: {
      heading: 'Häufige Fragen',
      items: [
        { q: 'Welche Firmenevents könnt ihr ausrichten?', a: 'Konferenzen, Panels, Präsentationen, Produkt-Launches, Firmen-Dinner, Networking, Firmenfeiern und private Markenevents.' },
        { q: 'Wie viele Sitzplätze bietet The Cork?', a: 'Das Restaurant The Cork bietet bis zu 150 Sitzplätze.' },
        { q: 'Können eine Präsentation oder ein Panel stattfinden?', a: 'Ja. Der Raum eignet sich für Präsentationen und Panels, und es stehen 2 Bildschirme zur Verfügung.' },
        { q: 'Sind Bildschirme vorhanden?', a: 'Ja, es stehen 2 Präsentationsbildschirme zur Verfügung.' },
        { q: 'Lassen sich The Cork und SiSi in einem Event verbinden?', a: 'Ja. Der offizielle Teil oder das Dinner im The Cork kann ins Abendprogramm im SiSi übergehen.' },
        { q: 'Lässt sich das Eventformat anpassen?', a: 'Ja, wir gestalten das Konzept nach dem Event. Beschreibe deine Wünsche in der Anfrage, und das Team bestätigt die verfügbaren Optionen.' },
        { q: 'Wie frage ich die Verfügbarkeit an?', a: 'Sende eine Anfrage über das Formular auf dieser Seite oder ruf an bzw. schreib uns.' },
        { q: 'Was sollte die Anfrage enthalten?', a: 'Deinen Wunschtermin, die Gästezahl und das Eventformat. Bitte vermerke Catering-, Technik- oder Barrierefreiheitswünsche in der Anfrage, damit das Team die verfügbaren Optionen bestätigen kann.' },
      ],
    },
    finalCta: {
      heading: 'Sprechen wir über dein Event',
      body: 'Nenne uns deinen Wunschtermin, die Gästezahl und das Eventformat. Unser Team erstellt ein auf dich zugeschnittenes Angebot.',
      cta: 'Termin anfragen',
    },
    form: {
      legend: 'Event-Anfrage',
      requiredHint: 'Mit * markierte Felder sind Pflichtfelder.',
      optional: '(optional)',
      companyName: 'Firmenname',
      contactPerson: 'Ansprechperson',
      email: 'E-Mail',
      phone: 'Telefon',
      eventType: 'Art der Veranstaltung',
      eventTypePlaceholder: 'Art wählen',
      eventTypeOptions: {
        conference: 'Konferenz',
        panel: 'Panel-Diskussion',
        presentation: 'Präsentation',
        launch: 'Produkt-Launch',
        dinner: 'Firmen-Dinner',
        networking: 'Networking',
        party: 'Firmenfeier',
        private: 'Privates Markenevent',
        other: 'Sonstiges',
      },
      guests: 'Geschätzte Gästezahl',
      date: 'Wunschtermin',
      dateFlexible: 'Der Termin ist flexibel',
      space: 'Bevorzugter Raum',
      spaceOptions: {
        cork: 'The Cork',
        sisi: 'SiSi',
        both: 'Beide Räume',
        unsure: 'Noch unklar',
      },
      duration: 'Dauer der Veranstaltung',
      presentation: 'Anforderungen an Präsentation oder Panel',
      catering: 'Catering-Anforderungen',
      technical: 'Zusätzliche technische Anforderungen',
      message: 'Nachricht',
      messagePlaceholder: 'Beschreibe dein Event kurz.',
      consent: 'Ich willige ein, zu meiner Anfrage kontaktiert zu werden, und bestätige, die {privacy} gelesen zu haben.',
      consentPrivacyLink: 'Datenschutzerklärung',
      submit: 'Anfrage senden',
      sending: 'Senden…',
      errorSummary: 'Bitte korrigiere die markierten Felder, um das Formular zu senden.',
      errors: {
        required: 'Dieses Feld ist erforderlich.',
        email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
        consent: 'Die Einwilligung ist erforderlich, um die Anfrage zu senden.',
      },
      success: {
        title: 'Danke für deine Anfrage.',
        body: 'Wir melden uns mit einem Angebot. Bei dringenden Anliegen ruf an oder schreib uns.',
      },
      error: {
        title: 'Das Formular konnte nicht gesendet werden.',
        body: 'Bitte versuche es gleich noch einmal oder kontaktiere uns direkt:',
      },
    },
  },
};

export default de;
