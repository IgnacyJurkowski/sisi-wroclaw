/* Italian. Mirrors the shape of pl.ts (enforced by `: UI`). */
import type { UI } from './pl';

const it: UI = {
  meta: {
    home: {
      title: 'Music club e cocktail bar a Breslavia | SiSi',
      description:
        'SiSi - music club e bar nel complesso R32 in via Rzeźnicza, a Breslavia. Musica dal vivo, DJ e cocktail d\'autore, venerdì e sabato dalle 22:00 alle 04:00.',
      ogDescription: 'Musica dal vivo, DJ e cocktail d\'autore. Un music club nel centro di Breslavia.',
    },
    events: {
      title: 'Eventi - SiSi Wrocław',
      description:
        'Prossimi eventi al SiSi Wrocław - concerti, DJ e serate a tema nel complesso R32. Sfoglia anche l\'archivio delle serate passate.',
      ogDescription: 'Concerti, DJ e serate a tema. Prossimi eventi e archivio del SiSi Wrocław.',
    },
    menu: {
      title: 'Menu bar e cocktail | SiSi Wrocław',
      description: 'Il menu bar del SiSi Wrocław - cocktail d\'autore, vini polacchi, birre belghe e un Night Menu by The Cork.',
      ogDescription: 'Cocktail d\'autore, vini polacchi e un Night Menu by The Cork. SiSi Wrocław.',
    },
    careers: {
      title: 'Lavora con noi - SiSi Wrocław',
      description: 'Unisciti al team del SiSi Wrocław - cerchiamo barman, personale di sala e un barback.',
      ogDescription: 'Unisciti al team del SiSi Wrocław. Posizioni aperte: barman, cameriere, barback.',
    },
    reservations: {
      title: 'Prenotazioni - SiSi Wrocław',
      description: 'Prenota un tavolo al SiSi Wrocław. Condizioni di prenotazione e contatto per eventi aziendali.',
      ogDescription: 'Un tavolo al SiSi: l\'intero importo della prenotazione è accreditato al tavolo. Venerdì e sabato dalle 22:00.',
    },
    corporate: {
      title: 'Eventi aziendali - SiSi & The Cork Wrocław',
      description:
        'Una location per eventi aziendali nel centro di Breslavia: conferenze, panel, presentazioni, cene, lanci e networking. 663 m², fino a 150 posti a sedere al The Cork, 2 schermi.',
      ogDescription: 'Conferenze, presentazioni, cene ed eventi aziendali serali nel centro di Breslavia. SiSi & The Cork.',
    },
    privateEvents: {
      title: 'Eventi privati e compleanni a Breslavia | SiSi',
      description:
        'Organizza un compleanno, un anniversario o una festa privata al SiSi, al The Cork o nell\'intero R32. Uso esclusivo, bar, catering, musica e proposta personalizzata.',
      ogDescription:
        'Organizza un compleanno, un anniversario o una festa privata al SiSi, al The Cork o nell\'intero R32. Uso esclusivo, bar, catering, musica e proposta personalizzata.',
    },
    contact: {
      title: 'Contatti e dati societari | SiSi Wrocław',
      description:
        'Contatti e informazioni societarie del SiSi Wrocław - indirizzo, telefono, e-mail e dati di registro (NIP, REGON, KRS).',
      ogDescription: 'Contatti e dati societari del SiSi Wrocław.',
    },
    terms: {
      title: 'Regolamento - SiSi Wrocław',
      description: 'Regolamento del SiSi Wrocław - ingresso, prenotazione dei tavoli, comportamento nel locale e reclami.',
      ogDescription: 'Regolamento del SiSi Wrocław - ingresso, prenotazioni, regole e reclami.',
    },
    privacy: {
      title: 'Privacy - SiSi Wrocław',
      description: 'Informativa sulla privacy del SiSi Wrocław - titolare del trattamento, finalità e basi giuridiche e i tuoi diritti GDPR.',
      ogDescription: 'Come trattiamo i dati personali al SiSi Wrocław - in conformità al GDPR.',
    },
    cookies: {
      title: 'Cookie - SiSi Wrocław',
      description: 'Informativa sui cookie di SiSi Wrocław - archiviazione essenziale usata per la chiusura dell\'avviso e lo stato dei moduli e della navigazione.',
      ogDescription: 'Come SiSi Wrocław usa l\'archiviazione essenziale per l\'avviso, i moduli e la navigazione.',
    },
    notFound: {
      title: '404 - Pagina non trovata | SiSi Wrocław',
      description: 'La pagina che cerchi non esiste. Torna alla home del SiSi Wrocław.',
      ogDescription: 'Pagina non trovata. Torna alla home del SiSi Wrocław.',
    },
  },

  common: {
    hoursDays: 'Venerdì - Sabato',
  },

  nav: {
    home: 'Home',
    events: 'Eventi',
    menu: 'Menu',
    careers: 'Lavora con noi',
    corporate: 'Aziende',
    privateEvents: 'Eventi privati',
    reservations: 'Prenotazioni',
    contact: 'Contatti',
    terms: 'Regolamento',
    privacy: 'Privacy',
    cookies: 'Cookie',
    skip: 'Vai al contenuto',
    mainNav: 'Navigazione principale',
    mobileNav: 'Menu mobile',
    openMenu: 'Apri il menu',
    closeMenu: 'Chiudi il menu',
    langLabel: 'Scegli la lingua',
    langCurrent: 'Lingua attuale',
    homeAria: 'SiSi Wrocław - home',
  },

  footer: {
    tagline: 'Musica dal vivo, DJ e cocktail nel centro di Breslavia.',
    pagesHeading: 'Pagine',
    contactHeading: 'Contatti',
    hoursHeading: 'Orari di apertura',
    legalHeading: 'Note legali',
    rights: '© 2026 SiSi Wrocław. Tutti i diritti riservati.',
  },

  cookie: {
    text: 'Questo sito memorizza esclusivamente la chiusura di questo avviso e lo stato essenziale dei moduli e della navigazione. I dettagli sono disponibili nella nostra {cookies} e nella nostra {privacy}.',
    cookiesLink: 'informativa sui cookie',
    privacyLink: 'informativa sulla privacy',
    dismiss: 'Ho capito',
    dialogLabel: 'Avviso sull\'archiviazione essenziale',
  },

  buttons: {
    reserveOnline: 'Prenota online',
    reserve: 'Prenota',
    bookTable: 'Prenota un tavolo',
    calendar: 'Calendario eventi',
    seeAllEvents: 'Vedi tutti gli eventi',
    seeFullMenu: 'Vedi la carta del bar',
    discoverR32: 'Di più su R32',
    enquire: 'Richiedi una data',
    planEvent: 'Pianifica il tuo evento',
    learnSpaces: 'Scopri gli spazi',
    home: 'Home',
  },

  hero: {
    titleLine1: 'IL CUORE DI BRESLAVIA',
    titleLine2: 'BATTE AL SiSi',
    descriptor: 'Music club, live act, DJ e cocktail nel centro di Breslavia.',
    discover: 'VEDI DI PIÙ',
  },

  about: {
    eyebrow: 'Chi siamo',
    title: 'L\'evoluzione musicale della serata',
    intro:
      'Al SISI la serata comincia con la musica dal vivo - al bancone, davanti a un drink e una chiacchierata. Poi la consolle passa ai DJ e la pista va avanti fino alle 4. Venerdì e sabato, nel complesso R32 in via Rzeźnicza.',
    cards: [
      'Bar e pista da ballo in un unico spazio',
      'Friday Session',
      'Live Act: musica dal vivo per aprire la serata',
    ],
  },

  r32: {
    eyebrow: 'R32',
    title: 'Cena e club allo stesso indirizzo',
    body: 'Inizia la serata con una cena da The Cork e passa direttamente al SISI - il ristorante e il club condividono lo stesso complesso R32, in via Rzeźnicza 32-33.',
  },

  menuTeaser: {
    eyebrow: 'Menu bar',
    title: 'Menu',
    tabs: [
      {
        title: 'Cocktail',
        body: 'I nostri cocktail d\'autore nascono al bancone, da ricette nostre - dai classici rivisitati alle proposte stagionali. La lista completa con i prezzi è nel menu del bar.',
      },
      {
        title: 'Carta degli alcolici',
        body: 'Puntiamo sulle cantine polacche - la nostra carta è una selezione di vini locali, dai bianchi secchi ai rossi strutturati, serviti al calice e in bottiglia. La completa una scelta accurata di distillati e birre, tra cui i classici belgi.',
      },
      {
        title: 'Stuzzichini',
        body: 'Il nostro Night Menu è preparato da The Cork - pensato per la condivisione al tavolo: caviale, ostriche, taglieri di formaggi e salumi (charcuterie). Stuzzichini da accompagnare a un cocktail o a un calice di vino.',
      },
    ],
  },

  chivas: { title: 'Chivas Regal Zone' },

  homeEvents: {
    eyebrow: 'Eventi',
    title: 'Prossimi eventi',
  },

  homeB2B: {
    eyebrow: 'Eventi aziendali',
    title: 'ORGANIZZA IL TUO EVENTO AZIENDALE AL SiSi',
    body: 'Conferenze, presentazioni, cene, lanci ed eventi aziendali serali. Unisci il ristorante The Cork all\'energia di SiSi e organizza tutto in un unico luogo nel centro di Breslavia.',
  },

  reservationsHome: {
    eyebrow: 'Prenotazioni',
    title: 'Prenota un tavolo',
    body: 'Prenotare online richiede un attimo e l\'intero importo della prenotazione è accreditato al tavolo. Il venerdì, con la prenotazione, l\'ingresso è gratuito.',
    reassure: 'Confermiamo la prenotazione e inviamo i dettagli dopo l\'accettazione',
    terms: 'La prenotazione di un tavolo è di 50 zł a persona, utilizzabili al tavolo; il sabato si applica un ingresso aggiuntivo di 30 zł a persona.',
    info: {
      hours: 'Orari',
      address: 'Indirizzo',
      reservations: 'Prenotazioni',
      corporate: 'Eventi aziendali',
    },
  },

  eventsPage: {
    label: 'Cosa succede',
    title: 'Eventi',
    subtitle:
      'Concerti, DJ e serate a tema. Scorri per vedere cosa suoniamo nei prossimi weekend - e dai un\'occhiata all\'archivio delle serate passate.',
    upcoming: 'In arrivo',
    archive: 'Archivio',
    scrollHint: 'scorri →',
    back: 'Tutti gli eventi',
    empty: 'Presto annunceremo nuovi eventi - seguici su Instagram.',
  },

  eventCard: {
    reserve: 'Prenota',
    finished: 'Evento concluso',
    freeEntry: 'Ingresso libero',
    entry: 'Ingresso',
  },

  menuPage: {
    label: 'Menu bar',
    title: 'Menu',
    subtitle: 'Cocktail d\'autore, vini polacchi, birre belghe e un Night Menu by The Cork. Prezzi in PLN.',
    sections: {
      cocktails: 'Cocktail',
      nonAlcoholic: 'Analcolici',
      vodka: 'Vodka',
      gin: 'Gin',
      whisky: 'Whisky',
      rum: 'Rum',
      tequila: 'Tequila',
      cognac: 'Cognac',
      liqueurs: 'Liquori',
      vermouth: 'Vermouth e aperitivi',
      champagne: 'Champagne e spumanti',
      bottleService: 'Bottle service',
      drinks: 'Bibite',
      beer: 'Birra',
      draught: 'Alla spina',
      bottled: 'In bottiglia',
      wines: 'Carta dei vini',
    },
    whiskyGroups: { irish: 'Irlandese', scotch: 'Scozzese', japanese: 'Giapponese', bourbon: 'Bourbon' },
    nonAlcSub: { cocktails: 'Mocktail', spirits: 'Distillati analcolici' },
    pourNote: 'Porzione 4 cl',
    bottledNote: 'Tutte le bottiglie 330 ml.',
    wineLead: 'Puntiamo sulle cantine polacche — una selezione di vini autoctoni, dai bianchi aromatici, passando per arancione e rosé di carattere, fino agli eleganti rossi. Serviamo tutti i vini al calice e in bottiglia.',
    champagneNote: 'Il calice (125 ml) è disponibile solo per G. H. Mumm Grand Cordon e Perrier-Jouët Grand Brut. Tutti gli altri champagne sono serviti solo in bottiglia.',
    ctaText: 'Vuoi prenotare un tavolo e ordinare in anticipo? Contattaci.',
  },

  careersPage: {
    label: 'Unisciti a noi',
    title: 'Lavora con noi',
    subtitle: 'Cerchiamo persone con la passione per i buoni drink e la musica. Il club è aperto venerdì e sabato - i barman lavorano anche in settimana, negli orari di The Cork.',
    positionLabel: 'Posizione',
    apply: 'Candidati',
    howToApply: 'Come candidarsi',
    howLead: 'Invia il tuo CV a {email}',
    howNote: 'Nell\'oggetto indica la posizione e il tuo nome e cognome, ad es. {example}.',
    howExample: 'Barman - Jan Kowalski',
    jobs: [
      {
        title: 'Barman',
        bullets: [
          'Preparazione dei cocktail e gestione del bar',
          'Esperienza al bancone gradita',
          'Venerdì e sabato, con possibili turni infrasettimanali (orari di The Cork)',
          'Conoscenza dell\'inglese',
        ],
      },
      {
        title: 'Cameriere / Cameriera',
        bullets: [
          'Servizio ai tavoli',
          'Buona organizzazione e resistenza allo stress',
          'Lavoro nel weekend (venerdì-sabato)',
          'Conoscenza dell\'inglese',
        ],
      },
      {
        title: 'Barback',
        bullets: [
          'Supporto al barman e rifornimento del bar',
          'Posizione ideale per iniziare nel settore',
          'Lavoro nel weekend (venerdì-sabato)',
          'Disponibilità e impegno',
        ],
      },
    ],
  },

  reservationsPage: {
    practicalTitle: 'Informazioni pratiche',
    practicalConditions: [
      'Il costo della prenotazione è di 50 PLN a persona - l\'intero importo è utilizzabile al tavolo con il personale.',
      'Il venerdì l\'ingresso è gratuito per gli ospiti con prenotazione.',
      'Il sabato alla prenotazione si aggiunge un ingresso di 30 PLN a persona.',
      'La prenotazione va ritirata tra le 22:00 e le 23:30. In caso di ritardo superiore a 30 minuti, il tavolo può essere assegnato ad altri ospiti.',
      'L\'ingresso è riservato agli ospiti con documento valido.',
      'Si applicano una selezione all\'ingresso e un dress code smart casual. Il personale si riserva di rifiutare l\'ingresso senza fornire motivazioni, anche agli ospiti con prenotazione (in tal caso l\'importo versato viene rimborsato).',
    ],
    conditionsTitle: 'Condizioni di prenotazione',
    conditions: [
      'Al momento della prenotazione puoi pre-selezionare piatti del menu che attenderanno gli ospiti all\'arrivo.',
      'Sono disponibili anche pacchetti speciali a prezzi promozionali.',
      'Dopo la prenotazione, attendi la conferma e l\'invio delle condizioni dettagliate.',
      'La prenotazione si conferma con un pagamento anticipato.',
    ],
    note: 'I prezzi possono variare durante gli eventi speciali. Le condizioni dettagliate vengono confermate a ogni prenotazione.',
  },

  contactPage: {
    label: 'Informazioni',
    subtitle: 'Prenotazioni, eventi aziendali e dati di registro della società che gestisce il club SiSi.',
    contactHeading: 'Contatti',
    reservationsLabel: 'Prenotazioni tavoli',
    corporateLabel: 'Eventi aziendali',
    addressLabel: 'Indirizzo',
    hoursLabel: 'Orari di apertura',
    registryHeading: 'Dati societari',
    registryIntro: 'Il club SiSi è gestito, e i dati personali sono trattati, da:',
    legalForm: 'Forma giuridica: società a responsabilità limitata (sp. z o.o.). Tribunale del registro: Tribunale distrettuale di Wrocław-Fabryczna a Breslavia.',
  },

  legal: {
    updatedLabel: 'Ultimo aggiornamento:',
    convenienceNote:
      'Questa traduzione è fornita solo per comodità. In caso di discrepanze prevale la versione polacca.',
    englishFallbackNote:
      'I testi legali qui sotto sono mostrati intenzionalmente in inglese, poiché al momento non è disponibile una traduzione italiana. Fa fede esclusivamente la versione polacca.',
  },

  notFound: {
    label: 'Errore 404',
    title: 'Questa pagina non c\'è',
    body: 'Sembra che la pagina che cerchi sia svanita come l\'ultimo ospite all\'alba. Torna alla home o scopri cosa suoniamo.',
  },

  privateEvents: {
    hero: {
      eyebrow: 'Eventi privati nel centro di Breslavia',
      title: 'Eventi privati nel cuore di Breslavia',
      body: 'Compleanni, anniversari e feste private al SiSi, al The Cork o nell\'intero R32. Scegli lo spazio in uso esclusivo e concorda con il nostro team bar, catering, musica e allestimento dell\'evento.',
      ctaPrimary: 'Richiedi una data',
      ctaSecondary: 'Scopri gli spazi',
      contactLead: 'Preferisci parlarne?',
    },
    occasions: {
      heading: 'Occasioni private al R32',
      items: [
        { title: 'Compleanni', body: 'Cena, bar e musica in un formato concordato con il nostro team.' },
        { title: 'Anniversari', body: 'Una cena privata o una festa serale nello spazio scelto.' },
        { title: 'Feste private', body: 'Eventi per ospiti invitati con catering, bar e musica.' },
        { title: 'Uso esclusivo', body: 'SiSi, The Cork o l\'intero R32 possono essere riservati in esclusiva.' },
      ],
    },
    pricing: {
      heading: 'Preventivo personalizzato',
      body: 'Definiamo il costo individualmente dopo aver discusso i dettagli dell\'evento. La data viene confermata con un contratto e un acconto; il saldo è dovuto prima dell\'evento.',
    },
    faq: {
      heading: 'Domande frequenti',
      items: [
        { q: 'Quali eventi privati potete organizzare?', a: 'Organizziamo compleanni, anniversari e altre feste private.' },
        { q: 'Posso riservare uno spazio in esclusiva?', a: 'Sì. SiSi, The Cork o l\'intero R32 possono essere riservati in esclusiva.' },
        { q: 'Quanti ospiti possono accogliere gli spazi?', a: 'The Cork accoglie fino a 150 ospiti seduti, mentre SiSi fino a 500 ospiti in piedi con formula buffet.' },
        { q: 'Cosa potete fornire per una festa privata?', a: 'Possiamo fornire bar, open bar o open tab, catering, DJ o musica dal vivo, guardaroba, zone separate, pulizia continua e supporto organizzativo.' },
        { q: 'Posso portare una torta, decorazioni o un fotografo?', a: 'Torta e decorazioni sono possibili previo accordo. Un fotografo scelto dall\'organizzatore può realizzare fotografie durante l\'evento.' },
        { q: 'Quanto costa un evento privato?', a: 'Definiamo il costo individualmente dopo aver discusso data, numero di ospiti, spazio e servizi.' },
        { q: 'Come confermo la data?', a: 'La data viene confermata con un contratto e un acconto; il saldo è dovuto prima dell\'evento.' },
      ],
    },
    form: {
      heading: 'Parlaci della tua occasione',
      intro: 'Indicaci la data prevista, il numero di ospiti, l\'occasione e lo spazio scelto. Il nostro team preparerà una proposta personalizzata.',
      name: 'Nome e cognome',
      occasion: 'Occasione',
      occasionPlaceholder: 'Scegli un\'occasione',
      occasionOptions: {
        birthday: 'Compleanno',
        anniversary: 'Anniversario',
        celebration: 'Festa privata',
        exclusive: 'Uso esclusivo',
        other: 'Altra occasione',
      },
      messagePlaceholder: 'Descrivi brevemente la tua occasione.',
      success: 'Grazie per la richiesta. Ti contatteremo con una proposta personalizzata.',
      subject: 'Richiesta per un evento privato - SiSi Wrocław',
    },
  },

  b2b: {
    hero: {
      eyebrow: 'Eventi aziendali nel centro di Breslavia',
      title: 'Conferenza di giorno, club di sera',
      body: 'Da conferenze, panel e presentazioni a cene, lanci, networking ed eventi aziendali serali. Unisci il ristorante The Cork all\'energia di SiSi e organizza l\'intero evento in un solo luogo.',
      ctaPrimary: 'Richiedi una data',
      ctaSecondary: 'Scopri gli spazi',
      contactLead: 'Preferisci parlarne?',
    },
    facts: {
      heading: 'Lo spazio in numeri',
      items: [
        { icon: 'area', value: '663 m²', label: 'di spazio eventi' },
        { icon: 'seated', value: 'fino a 150', label: 'posti a sedere al The Cork' },
        { icon: 'standing', value: 'fino a 500', label: 'ospiti in piedi (buffet)' },
        { icon: 'screens', value: '2 schermi', label: 'per presentazioni' },
        { icon: 'location', value: 'centro', label: 'di Breslavia' },
      ],
    },
    formats: {
      heading: 'Formati di evento',
      intro: 'Un solo luogo per la parte ufficiale e la serata.',
      items: [
        { title: 'Conferenze', body: 'Sessioni con presentazioni e programma, con due schermi.' },
        { title: 'Panel di discussione', body: 'Talk e dibattiti con relatori e pubblico.' },
        { title: 'Presentazioni', body: 'Demo di prodotto, aggiornamenti aziendali e interventi.' },
        { title: 'Lanci di prodotto', body: 'Lancia un prodotto o un brand - bar, catering e musica sul posto.' },
        { title: 'Cene aziendali', body: 'Cene a sedere nel ristorante The Cork.' },
        { title: 'Networking', body: 'Incontri di settore e serate informali.' },
        { title: 'Feste aziendali', body: 'Feste di team con l\'energia di SiSi.' },
        { title: 'Eventi di brand a porte chiuse', body: 'Eventi su invito su misura per il brand.' },
      ],
    },
    included: {
      heading: 'Cosa offriamo',
      intro: 'Ci occupiamo noi dell\'evento - dal bar al catering fino alla musica.',
      items: [
        { title: 'Bar, open bar e open tab', body: 'Bar completo con barman professionisti. A scelta: un open bar offerto da noi - cocktail, distillati e analcolici inclusi per i tuoi ospiti - oppure un open tab con un tetto di spesa a tua scelta: le consumazioni vengono servite fino al raggiungimento del limite e il conto è trasparente. Carta dei drink e formato su misura per il tuo evento.' },
        { title: 'Catering', body: 'Menù e catering su misura per il tuo evento.' },
        { title: 'Musica', body: 'DJ e musica dal vivo - modalità da concordare.' },
        { title: 'Guardaroba', body: 'Servizio di guardaroba per i tuoi ospiti.' },
        { title: 'Separazione delle zone', body: 'Possiamo delimitare zone dedicate nello spazio, così le diverse parti del tuo evento hanno ciascuna la propria area.' },
        { title: 'Decorazioni e torta', body: 'Elementi decorativi o una torta per l\'occasione - da concordare in anticipo.' },
        { title: 'Servizio di pulizia', body: 'Pulizia continua per tutta la durata dell\'evento.' },
        { title: 'Coordinamento', body: 'Supporto tecnico e organizzativo in ogni fase.' },
      ],
    },
    spaces: {
      heading: 'Spazi',
      theCork: {
        title: 'The Cork',
        body: 'Un ristorante all\'interno del complesso R32 - una cornice naturale per la parte ufficiale e la serata.',
        points: [
          'Cene a sedere, presentazioni e riunioni diurne',
          'Fino a 150 posti a sedere',
        ],
      },
      sisi: {
        title: 'SiSi',
        body: 'Un music club con l\'energia giusta per chiudere la serata.',
        points: [
          'Programmi serali, networking e feste',
          'Musica dal vivo e DJ',
          'Fino a 500 ospiti in piedi (buffet)',
          '2 schermi per presentazioni',
        ],
      },
      combined: {
        title: 'L\'intero complesso R32',
        body: 'Passa senza interruzioni dalla parte formale o dalla cena al programma serale - tutto in un solo luogo, su 663 m² di spazio.',
      },
    },
    why: {
      heading: 'Perché questa location',
      items: [
        { title: 'Parte ufficiale e serata in un solo luogo', body: 'Una conferenza o una cena scorre direttamente nel programma serale.' },
        { title: 'Centro di Breslavia', body: 'Posizione comoda in pieno centro città.' },
        { title: 'Ristorante e club', body: 'The Cork e SiSi nello stesso complesso R32.' },
        { title: 'Formato flessibile', body: 'Costruiamo il concept dell\'evento sulle tue esigenze.' },
        { title: 'Due schermi', body: 'Supporto pronto per presentazioni e panel.' },
        { title: 'Contatto diretto con il team', body: 'Parli direttamente con chi gestisce l\'evento.' },
      ],
    },
    process: {
      heading: 'Come funziona',
      steps: [
        { title: 'Invia una richiesta', body: 'Indicaci data, formato e numero di ospiti.' },
        { title: 'Definiamo i dettagli', body: 'Concordiamo formato ed esigenze.' },
        { title: 'Ricevi una proposta', body: 'Prepariamo un\'offerta su misura.' },
        { title: 'Confermi la data', body: 'Fissiamo data e tutti i dettagli.' },
        { title: 'Realizziamo l\'evento', body: 'Ci occupiamo dello svolgimento dell\'evento.' },
      ],
    },
    projects: {
      heading: 'Eventi selezionati',
      emptyTitle: 'Stiamo preparando le schede dei primi progetti.',
      emptyBody: 'Ti servono referenze? Scrivici - ti raccontiamo gli eventi già realizzati.',
    },
    faq: {
      heading: 'Domande frequenti',
      items: [
        { q: 'Che tipi di eventi aziendali si possono organizzare?', a: 'Conferenze, panel, presentazioni, lanci di prodotto, cene aziendali, networking, feste aziendali ed eventi di brand a porte chiuse.' },
        { q: 'Quanti posti a sedere ha The Cork?', a: 'Il ristorante The Cork offre fino a 150 posti a sedere.' },
        { q: 'Si può organizzare una presentazione o un panel?', a: 'Sì. Lo spazio è adatto a presentazioni e panel, e sono disponibili 2 schermi.' },
        { q: 'Sono disponibili degli schermi?', a: 'Sì, sono disponibili 2 schermi per presentazioni.' },
        { q: 'Si possono usare The Cork e SiSi in un unico evento?', a: 'Sì. La parte ufficiale o la cena al The Cork può proseguire nel programma serale al SiSi.' },
        { q: 'Si può personalizzare il formato dell\'evento?', a: 'Sì, costruiamo il concept sull\'evento. Descrivi le tue esigenze nella richiesta e il team confermerà le opzioni disponibili.' },
        { q: 'Come verifico la disponibilità?', a: 'Invia una richiesta tramite il modulo in questa pagina, oppure chiamaci o scrivici.' },
        { q: 'Cosa includere nella richiesta?', a: 'La data preferita, il numero di ospiti e il formato dell\'evento. Segnala nella richiesta eventuali esigenze di catering, tecniche o di accessibilità, così il team potrà confermare le opzioni disponibili.' },
        { q: 'Fornite catering e bar?', a: 'Sì. Catering e servizio bar sono forniti in loco. Elementi tradizionali come una torta possono essere portati previo accordo.' },
        { q: 'Possiamo portare un nostro fotografo?', a: 'Sì. La documentazione fotografica può essere affidata a un fotografo scelto dall\'organizzatore.' },
        { q: 'Come si blocca una data?', a: 'La data si conferma con contratto e acconto, con il saldo dovuto prima dell\'evento. I dettagli si concordano caso per caso.' },
      ],
    },
    finalCta: {
      heading: 'Parliamo del tuo evento',
      body: 'Indicaci la data preferita, il numero di ospiti e il formato dell\'evento. Il nostro team preparerà una proposta su misura.',
      cta: 'Richiedi una data',
    },
    form: {
      legend: 'Richiesta evento',
      requiredHint: 'I campi contrassegnati con * sono obbligatori.',
      optional: '(facoltativo)',
      companyName: 'Nome dell\'azienda',
      contactPerson: 'Referente',
      email: 'E-mail',
      phone: 'Telefono',
      eventType: 'Tipo di evento',
      eventTypePlaceholder: 'Scegli il tipo',
      eventTypeOptions: {
        conference: 'Conferenza',
        panel: 'Panel di discussione',
        presentation: 'Presentazione',
        launch: 'Lancio di prodotto',
        dinner: 'Cena aziendale',
        networking: 'Networking',
        party: 'Festa aziendale',
        private: 'Evento di brand a porte chiuse',
        other: 'Altro',
      },
      guests: 'Numero stimato di ospiti',
      date: 'Data preferita',
      dateFlexible: 'La data è flessibile',
      datePlaceholder: 'Scegli una data',
      dateModeSingle: 'Data specifica',
      dateModeRange: 'Intervallo di date',
      datePrevMonth: 'Mese precedente',
      dateNextMonth: 'Mese successivo',
      dateClear: 'Cancella',
      guestsDecrease: 'Riduci il numero di ospiti',
      guestsIncrease: 'Aumenta il numero di ospiti',
      space: 'Spazio preferito',
      spacePlaceholder: 'Scegli lo spazio',
      spaceOptions: {
        cork: 'The Cork',
        sisi: 'SiSi',
        both: 'Entrambi gli spazi',
        unsure: 'Non ancora deciso',
      },
      duration: 'Durata dell\'evento',
      durationPlaceholder: 'es. 6 ore',
      message: 'Messaggio',
      messagePlaceholder: 'Descrivi brevemente il tuo evento.',
      consent: 'Acconsento a essere contattato in merito alla mia richiesta e confermo di aver letto la {privacy}.',
      consentPrivacyLink: 'Informativa sulla privacy',
      submit: 'Invia richiesta',
      sending: 'Invio…',
      errorSummary: 'Correggi i campi evidenziati per inviare il modulo.',
      errors: {
        required: 'Questo campo è obbligatorio.',
        email: 'Inserisci un indirizzo e-mail valido.',
        consent: 'Il consenso è necessario per inviare la richiesta.',
      },
      success: {
        title: 'Grazie per la tua richiesta.',
        body: 'Ti ricontatteremo con una proposta. Per urgenze, chiamaci o scrivici.',
      },
      error: {
        title: 'Impossibile inviare il modulo.',
        body: 'Riprova tra poco oppure contattaci direttamente:',
      },
    },
  },
};

export default it;
