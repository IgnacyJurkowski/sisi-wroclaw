/* German. Mirrors the shape of pl.ts (enforced by `: UI`). Nav/button labels
   kept short to avoid layout overflow. */
import type { UI } from './pl';

const de: UI = {
  meta: {
    home: {
      title: 'Musikclub & Cocktailbar in Breslau | SiSi',
      description:
        'SiSi - Music Club und Bar im R32-Komplex an der Rzeźnicza in Breslau. Live-Musik, DJs und Signature-Cocktails, freitags und samstags von 22 bis 4 Uhr.',
      ogDescription: 'Live-Musik, DJs und Signature-Cocktails. Ein Music Club im Zentrum von Breslau.',
    },
    events: {
      title: 'Veranstaltungen - SiSi Wrocław',
      description:
        'Kommende Veranstaltungen im SiSi Wrocław - Konzerte, DJs und Themenabende im R32-Komplex. Auch das Archiv vergangener Nächte.',
      ogDescription: 'Konzerte, DJs und Themenabende. Kommende Veranstaltungen und Archiv im SiSi Wrocław.',
    },
    menu: {
      title: 'Barkarte & Cocktails | SiSi Wrocław',
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
      description: 'Reserviere einen Tisch im SiSi Wrocław. Reservierungsbedingungen und Kontakt für Firmenevents.',
      ogDescription: 'Ein Tisch im SiSi: Der volle Reservierungsbetrag wird am Tisch angerechnet. Freitags und samstags ab 22 Uhr.',
    },
    corporate: {
      title: 'Firmenevents - SiSi & The Cork Wrocław',
      description:
        'Eventlocation im Zentrum von Breslau: Konferenzen, Panels, Präsentationen, Dinner, Launches und Networking. 663 m², bis zu 150 Sitzplätze im The Cork, 2 Bildschirme.',
      ogDescription: 'Konferenzen, Präsentationen, Dinner und abendliche Firmenevents im Zentrum von Breslau. SiSi & The Cork.',
    },
    privateEvents: {
      title: 'Private Feiern & Geburtstage in Breslau | SiSi',
      description:
        'Feiere Geburtstag, Jubiläum oder einen privaten Anlass im SiSi, im The Cork oder im gesamten R32. Exklusive Anmietung, Bar, Catering, Musik und individuelles Angebot.',
      ogDescription:
        'Feiere Geburtstag, Jubiläum oder einen privaten Anlass im SiSi, im The Cork oder im gesamten R32. Exklusive Anmietung, Bar, Catering, Musik und individuelles Angebot.',
    },
    contact: {
      title: 'Kontakt & Unternehmensdaten | SiSi Wrocław',
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
      description: 'Cookie-Richtlinie von SiSi Wrocław - notwendige Speicherung für das Schließen des Hinweises sowie für Formular- und Navigationszustände.',
      ogDescription: 'Wie SiSi Wrocław notwendige Speicherung für den Hinweis, Formulare und die Navigation verwendet.',
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
    privateEvents: 'Private Feiern',
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
    tagline: 'Live-Musik, DJs und Cocktails im Zentrum von Breslau.',
    pagesHeading: 'Seiten',
    contactHeading: 'Kontakt',
    hoursHeading: 'Öffnungszeiten',
    legalHeading: 'Rechtliches',
    rights: '© 2026 SiSi Wrocław. Alle Rechte vorbehalten.',
  },

  cookie: {
    text: 'Diese Website speichert ausschließlich, dass dieser Hinweis geschlossen wurde, sowie notwendige Formular- und Navigationszustände. Einzelheiten findest du in unserer {cookies} und unserer {privacy}.',
    cookiesLink: 'Cookie-Richtlinie',
    privacyLink: 'Datenschutzerklärung',
    dismiss: 'Verstanden',
    dialogLabel: 'Hinweis zur notwendigen Speicherung',
  },

  buttons: {
    reserveOnline: 'Online buchen',
    reserve: 'Buchen',
    bookTable: 'Tisch buchen',
    calendar: 'Veranstaltungskalender',
    seeAllEvents: 'Alle Veranstaltungen',
    seeFullMenu: 'Barkarte ansehen',
    discoverR32: 'Mehr über R32',
    enquire: 'Termin anfragen',
    planEvent: 'Event planen',
    learnSpaces: 'Räume entdecken',
    home: 'Start',
  },

  hero: {
    titleLine1: 'DAS HERZ BRESLAUS',
    titleLine2: 'SCHLÄGT IM SiSi',
    descriptor: 'Musikclub, Live-Acts, DJs und Cocktails im Zentrum von Breslau.',
    discover: 'MEHR SEHEN',
  },

  about: {
    eyebrow: 'Über uns',
    title: 'Die musikalische Evolution des Abends',
    intro:
      'Im SISI beginnt die Nacht mit Live-Musik - an der Bar, bei einem Drink und einem Gespräch. Dann übernehmen die DJs, und der Floor läuft bis 4 Uhr. Freitags und samstags, im R32-Komplex an der Rzeźnicza.',
    cards: [
      'Bar und Tanzfläche in einem Raum',
      'Friday Session',
      'Live Acts: Live-Musik zum Auftakt der Nacht',
    ],
  },

  r32: {
    eyebrow: 'R32',
    title: 'Dinner und Club an einer Adresse',
    body: 'Beginne den Abend mit einem Dinner im The Cork und geh direkt weiter ins SISI - Restaurant und Club teilen sich denselben R32-Komplex an der Rzeźnicza 32-33.',
  },

  menuTeaser: {
    eyebrow: 'Barkarte',
    title: 'Menü',
    tabs: [
      {
        title: 'Cocktails',
        body: 'Unsere Signature-Cocktails mixen wir selbst, nach eigenen Rezepten - von neu interpretierten Klassikern bis zu saisonalen Specials. Die vollständige Liste mit Preisen steht in der Barkarte.',
      },
      {
        title: 'Getränkekarte',
        body: 'Wir setzen auf polnische Weingüter - unsere Karte ist eine Auswahl heimischer Weine, von trockenen Weißweinen bis zu kräftigen Rotweinen, glasweise und in der Flasche. Ergänzt wird sie durch sorgfältig ausgewählte Spirituosen und Biere, darunter belgische Klassiker.',
      },
      {
        title: 'Snacks',
        body: 'Unser Night Menu wird von The Cork zubereitet - gemacht zum Teilen am Tisch: Kaviar, Austern, Käse- und Charcuterie-Platten. Häppchen, die zu einem Cocktail oder einem Glas Wein passen.',
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
    title: 'VERANSTALTE DEIN FIRMENEVENT IM SiSi',
    body: 'Konferenzen, Präsentationen, Dinner, Launches und abendliche Firmenevents. Verbinde das Restaurant The Cork mit der Energie von SiSi und organisiere alles an einem Ort im Zentrum von Breslau.',
  },

  reservationsHome: {
    eyebrow: 'Reservierungen',
    title: 'Tisch reservieren',
    body: 'Die Online-Buchung dauert nur einen Moment, und der volle Reservierungsbetrag wird am Tisch angerechnet. Freitags ist der Eintritt mit Reservierung frei.',
    reassure: 'Wir bestätigen deine Reservierung und senden dir die Details, sobald sie angenommen ist',
    terms: 'Eine Tischreservierung kostet 50 zł pro Person, am Tisch anrechenbar; samstags gilt ein zusätzlicher Eintritt von 30 zł pro Person.',
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
    back: 'Alle Veranstaltungen',
    empty: 'Weitere Veranstaltungen folgen bald - folge uns auf Instagram.',
  },

  eventCard: {
    reserve: 'Buchen',
    finished: 'Veranstaltung beendet',
    freeEntry: 'Eintritt frei',
    entry: 'Eintritt',
  },

  menuPage: {
    label: 'Barkarte',
    title: 'Menü',
    subtitle: 'Signature-Cocktails, polnische Weine, belgische Biere und ein Night Menu by The Cork. Preise in PLN.',
    sections: {
      cocktails: 'Cocktails',
      nonAlcoholic: 'Alkoholfrei',
      vodka: 'Wodka',
      gin: 'Gin',
      whisky: 'Whisky',
      rum: 'Rum',
      tequila: 'Tequila',
      cognac: 'Cognac',
      liqueurs: 'Liköre',
      vermouth: 'Wermut & Aperitifs',
      champagne: 'Champagner & Schaumwein',
      bottleService: 'Bottle-Service',
      drinks: 'Alkoholfreie Getränke',
      beer: 'Bier',
      draught: 'Vom Fass',
      bottled: 'Flasche',
      wines: 'Weinkarte',
    },
    whiskyGroups: { irish: 'Irisch', scotch: 'Schottisch', japanese: 'Japanisch', bourbon: 'Bourbon' },
    nonAlcSub: { cocktails: 'Alkoholfreie Cocktails', spirits: 'Alkoholfreie Spirituosen' },
    pourNote: 'Portion 4 cl',
    bottledNote: 'Alle Flaschen 330 ml.',
    wineLead: 'Wir setzen auf polnische Weingüter — eine Auswahl heimischer Weine von aromatischen Weißweinen über charaktervollen Orange- und Roséwein bis zu eleganten Rotweinen. Alle Weine servieren wir glasweise und in der Flasche.',
    champagneNote: 'Ein Glas (125 ml) gibt es nur für G. H. Mumm Grand Cordon und Perrier-Jouët Grand Brut. Alle anderen Champagner servieren wir ausschließlich in der Flasche.',
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
    practicalTitle: 'Praktische Informationen',
    practicalConditions: [
      'Die Reservierungsgebühr beträgt 50 PLN pro Person - der gesamte Betrag kann am Tisch beim Service eingelöst werden.',
      'Freitags ist der Eintritt für Gäste mit Reservierung kostenlos.',
      'Samstags wird ein Eintritt von 30 PLN pro Person zur Reservierung hinzugerechnet.',
      'Reservierungen sind zwischen 22:00 und 23:30 Uhr einzulösen. Bei mehr als 30 Minuten Verspätung kann der Tisch an andere Gäste vergeben werden.',
      'Einlass nur für Gäste mit gültigem Ausweis.',
      'Es gelten eine Türauswahl und ein Smart-Casual-Dresscode. Das Team behält sich vor, den Einlass ohne Angabe von Gründen zu verweigern, auch bei Gästen mit Reservierung (der gezahlte Betrag wird dann erstattet).',
    ],
    conditionsTitle: 'Reservierungsbedingungen',
    conditions: [
      'Bei der Reservierung kannst du Menüpunkte vorauswählen, die bei Ankunft für deine Gäste bereitstehen.',
      'Außerdem sind spezielle Pakete zu Aktionspreisen verfügbar.',
      'Bitte warte nach der Reservierung auf die Bestätigung und die Zusendung der detaillierten Bedingungen.',
      'Die Reservierung wird durch eine Vorauszahlung bestätigt.',
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
    englishFallbackNote:
      'Die folgenden rechtlichen Texte werden bewusst auf Englisch angezeigt, da derzeit keine deutsche Übersetzung vorliegt. Verbindlich ist ausschließlich die polnische Fassung.',
  },

  notFound: {
    label: 'Fehler 404',
    title: 'Diese Seite ist weg',
    body: 'Sieht aus, als wäre die gesuchte Seite verschwunden wie der letzte Gast im Morgengrauen. Zurück zur Startseite oder schau, was bei uns läuft.',
  },

  privateEvents: {
    hero: {
      eyebrow: 'Private Feiern im Zentrum von Breslau',
      title: 'Private Feiern im Herzen von Breslau',
      body: 'Geburtstage, Jubiläen und private Feiern im SiSi, im The Cork oder im gesamten R32. Miete deinen Wunschbereich exklusiv und stimme Bar, Catering, Musik und Gestaltung mit unserem Team ab.',
      ctaPrimary: 'Termin anfragen',
      ctaSecondary: 'Räume entdecken',
      contactLead: 'Möchtest du lieber persönlich sprechen?',
    },
    occasions: {
      heading: 'Private Anlässe im R32',
      items: [
        { title: 'Geburtstage', body: 'Dinner, Bar und Musik in einem mit unserem Team abgestimmten Format.' },
        { title: 'Jubiläen', body: 'Ein privates Dinner oder eine abendliche Feier im gewählten Bereich.' },
        { title: 'Private Feiern', body: 'Veranstaltungen für geladene Gäste mit Catering, Bar und Musik.' },
        { title: 'Exklusive Anmietung', body: 'SiSi, The Cork oder das gesamte R32 können exklusiv gemietet werden.' },
      ],
    },
    pricing: {
      heading: 'Individuelles Angebot',
      body: 'Wir kalkulieren jede Veranstaltung individuell nach Besprechung der Details. Der Termin wird mit Vertrag und Anzahlung bestätigt; der Restbetrag ist vor der Veranstaltung fällig.',
    },
    faq: {
      heading: 'Häufig gestellte Fragen',
      items: [
        { q: 'Welche privaten Veranstaltungen könnt ihr ausrichten?', a: 'Wir richten Geburtstage, Jubiläen und andere private Feiern aus.' },
        { q: 'Kann ich einen Bereich exklusiv mieten?', a: 'Ja. SiSi, The Cork oder das gesamte R32 können exklusiv gemietet werden.' },
        { q: 'Wie viele Gäste finden in den Räumen Platz?', a: 'Im The Cork sind bis zu 150 Sitzplätze möglich; im SiSi bis zu 500 stehende Gäste im Buffetformat.' },
        { q: 'Was könnt ihr für eine private Feier bereitstellen?', a: 'Wir können Bar, Open Bar oder Open Tab, Catering, DJ oder Live-Musik, Garderobe, getrennte Bereiche, laufende Reinigung und organisatorische Unterstützung bereitstellen.' },
        { q: 'Kann ich eine Torte, Dekoration oder einen eigenen Fotografen mitbringen?', a: 'Torte und Dekoration sind nach vorheriger Absprache möglich. Ein vom Veranstalter gewählter Fotograf darf während der Veranstaltung fotografieren.' },
        { q: 'Was kostet eine private Feier?', a: 'Wir kalkulieren jede Veranstaltung individuell nach Besprechung von Termin, Gästezahl, Bereich und Umfang.' },
        { q: 'Wie bestätige ich einen Termin?', a: 'Der Termin wird mit Vertrag und Anzahlung bestätigt; der Restbetrag ist vor der Veranstaltung fällig.' },
      ],
    },
    form: {
      heading: 'Erzähl uns von deinem Anlass',
      intro: 'Nenne uns deinen Wunschtermin, die Gästezahl, den Anlass und den gewünschten Bereich. Unser Team erstellt ein individuelles Angebot.',
      name: 'Vor- und Nachname',
      occasion: 'Anlass',
      occasionPlaceholder: 'Anlass auswählen',
      occasionOptions: {
        birthday: 'Geburtstag',
        anniversary: 'Jubiläum',
        celebration: 'Private Feier',
        exclusive: 'Exklusive Anmietung',
        other: 'Anderer Anlass',
      },
      messagePlaceholder: 'Beschreibe deinen Anlass kurz.',
      success: 'Vielen Dank für deine Anfrage. Wir melden uns mit einem individuellen Angebot.',
      subject: 'Anfrage für eine private Feier - SiSi Wrocław',
    },
  },

  b2b: {
    hero: {
      eyebrow: 'Firmenevents im Zentrum von Breslau',
      title: 'Tagsüber Konferenz, nachts Club',
      body: 'Von Konferenzen, Panels und Präsentationen bis zu Dinnern, Launches, Networking und abendlichen Firmenevents. Verbinde das Restaurant The Cork mit der Energie von SiSi und veranstalte das ganze Event an einem Ort.',
      ctaPrimary: 'Termin anfragen',
      ctaSecondary: 'Räume entdecken',
      contactLead: 'Lieber persönlich besprechen?',
    },
    facts: {
      heading: 'Der Raum in Zahlen',
      items: [
        { icon: 'area', value: '663 m²', label: 'Eventfläche' },
        { icon: 'seated', value: 'bis zu 150', label: 'Sitzplätze im The Cork' },
        { icon: 'standing', value: 'bis zu 500', label: 'Gäste im Stehen (Buffet)' },
        { icon: 'screens', value: '2 Bildschirme', label: 'für Präsentationen' },
        { icon: 'location', value: 'Zentrum', label: 'von Breslau' },
      ],
    },
    formats: {
      heading: 'Event-Formate',
      intro: 'Ein Ort für den offiziellen Teil und den Abend.',
      items: [
        { title: 'Konferenzen', body: 'Sessions mit Präsentationen und Programm, mit zwei Bildschirmen.' },
        { title: 'Panel-Diskussionen', body: 'Gespräche und Debatten mit Speakern und Publikum.' },
        { title: 'Präsentationen', body: 'Produktshows, Firmen-Updates und Vorträge.' },
        { title: 'Produkt-Launches', body: 'Launche ein Produkt oder eine Marke - Bar, Catering und Musik übernehmen wir vor Ort.' },
        { title: 'Firmen-Dinner', body: 'Sitzdinner im Restaurant The Cork.' },
        { title: 'Networking', body: 'Branchentreffen und entspannte Abende.' },
        { title: 'Firmenfeiern', body: 'Team-Feiern mit der Energie von SiSi.' },
        { title: 'Geschlossene Markenevents', body: 'Events nur für geladene Gäste, auf die Marke zugeschnitten.' },
      ],
    },
    included: {
      heading: 'Was wir bereitstellen',
      intro: 'Die Eventbetreuung übernehmen wir - von Bar und Catering bis zur musikalischen Begleitung.',
      items: [
        { title: 'Bar, Open Bar & Open Tab', body: 'Vollständige Bar mit professionellem Barpersonal. Zur Wahl: eine Open Bar auf unsere Kosten - Cocktails, Spirituosen und alkoholfreie Getränke für deine Gäste inklusive - oder ein Open Tab bis zu einem von dir festgelegten Betrag: Getränke werden bis zum Limit serviert und anschließend transparent abgerechnet. Getränkekarte und Format stimmen wir auf dein Event ab.' },
        { title: 'Catering', body: 'Menü und Catering, abgestimmt auf dein Event.' },
        { title: 'Musik', body: 'DJ und Live-Musik - Umfang nach Absprache.' },
        { title: 'Garderobe', body: 'Garderobenservice für deine Gäste.' },
        { title: 'Zonenaufteilung', body: 'Wir können eigene Zonen im Raum abtrennen, sodass verschiedene Teile deines Events jeweils ihren eigenen Bereich haben.' },
        { title: 'Deko & Torte', body: 'Dekorative Elemente oder eine Anlasstorte - nach vorheriger Absprache.' },
        { title: 'Reinigungsservice', body: 'Laufende Reinigung während des gesamten Events.' },
        { title: 'Koordination', body: 'Technische und organisatorische Unterstützung in jeder Phase.' },
      ],
    },
    spaces: {
      heading: 'Räume',
      theCork: {
        title: 'The Cork',
        body: 'Ein Restaurant im R32-Komplex - eine natürliche Kulisse für den offiziellen Teil und den Abend.',
        points: [
          'Sitzdinner, Präsentationen und Meetings am Tag',
          'Bis zu 150 Sitzplätze',
        ],
      },
      sisi: {
        title: 'SiSi',
        body: 'Ein Music Club mit der Energie, den Abend ausklingen zu lassen.',
        points: [
          'Abendprogramme, Networking und Feiern',
          'Live-Musik und DJs',
          'Bis zu 500 Gäste im Stehen (Buffet)',
          '2 Präsentationsbildschirme',
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
        { title: 'Zentrum von Breslau', body: 'Günstige Lage im Stadtzentrum.' },
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
      emptyTitle: 'Die Beschreibungen unserer ersten Projekte sind in Arbeit.',
      emptyBody: 'Du brauchst Referenzen? Melde dich bei uns - wir erzählen dir von unseren bisherigen Events.',
    },
    faq: {
      heading: 'Häufige Fragen',
      items: [
        { q: 'Welche Firmenevents könnt ihr ausrichten?', a: 'Konferenzen, Panels, Präsentationen, Produkt-Launches, Firmen-Dinner, Networking, Firmenfeiern und geschlossene Markenevents.' },
        { q: 'Wie viele Sitzplätze bietet The Cork?', a: 'Das Restaurant The Cork bietet bis zu 150 Sitzplätze.' },
        { q: 'Können eine Präsentation oder ein Panel stattfinden?', a: 'Ja. Der Raum eignet sich für Präsentationen und Panels, und es stehen 2 Bildschirme zur Verfügung.' },
        { q: 'Sind Bildschirme vorhanden?', a: 'Ja, es stehen 2 Präsentationsbildschirme zur Verfügung.' },
        { q: 'Lassen sich The Cork und SiSi in einem Event verbinden?', a: 'Ja. Der offizielle Teil oder das Dinner im The Cork kann ins Abendprogramm im SiSi übergehen.' },
        { q: 'Lässt sich das Eventformat anpassen?', a: 'Ja, wir gestalten das Konzept nach dem Event. Beschreibe deine Wünsche in der Anfrage, und das Team bestätigt die verfügbaren Optionen.' },
        { q: 'Wie frage ich die Verfügbarkeit an?', a: 'Sende eine Anfrage über das Formular auf dieser Seite oder ruf an bzw. schreib uns.' },
        { q: 'Was sollte die Anfrage enthalten?', a: 'Deinen Wunschtermin, die Gästezahl und das Eventformat. Bitte vermerke Catering-, Technik- oder Barrierefreiheitswünsche in der Anfrage, damit das Team die verfügbaren Optionen bestätigen kann.' },
        { q: 'Stellt ihr Catering und Bar?', a: 'Ja. Catering und Barservice stellen wir vor Ort. Traditionelle Elemente wie eine Torte können nach vorheriger Absprache mitgebracht werden.' },
        { q: 'Können wir einen eigenen Fotografen mitbringen?', a: 'Ja. Die fotografische Dokumentation kann ein vom Organisator gewählter Fotograf übernehmen.' },
        { q: 'Wie sichere ich mir einen Termin?', a: 'Der Termin wird mit Vertrag und Anzahlung bestätigt, der Restbetrag ist vor dem Event fällig. Die Details stimmen wir individuell ab.' },
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
        private: 'Geschlossenes Markenevent',
        other: 'Sonstiges',
      },
      guests: 'Geschätzte Gästezahl',
      date: 'Wunschtermin',
      dateFlexible: 'Der Termin ist flexibel',
      datePlaceholder: 'Datum wählen',
      dateModeSingle: 'Konkretes Datum',
      dateModeRange: 'Zeitraum',
      datePrevMonth: 'Voriger Monat',
      dateNextMonth: 'Nächster Monat',
      dateClear: 'Löschen',
      guestsDecrease: 'Gästezahl verringern',
      guestsIncrease: 'Gästezahl erhöhen',
      space: 'Bevorzugter Raum',
      spacePlaceholder: 'Bereich wählen',
      spaceOptions: {
        cork: 'The Cork',
        sisi: 'SiSi',
        both: 'Beide Räume',
        unsure: 'Noch unklar',
      },
      duration: 'Dauer der Veranstaltung',
      durationPlaceholder: 'z. B. 6 Stunden',
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
