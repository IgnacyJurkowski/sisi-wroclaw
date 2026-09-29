/* Venue truth: site copy that is rendered from the dictionaries today.

   Each entry is the text a locale shows, with the file:line it comes from. It is
   here so the inventory probe and 3b can compare the data with the pages and so
   the sentence a rule came from stays next to the rule.

   Written by the Phase 3a migration from src/i18n/ui/{pl,en,de,it,cs}.ts at
   repo commit f8ccc58. Edit by hand from now on. */

import { l10n } from './facts';
import type { L10n } from './types';

/** Hero slogan (title line 1 + line 2), spelled as each dictionary spells it. */
export const TAGLINE: L10n = l10n({
  pl: ['SERCE WROCŁAWIA BIJE W SiSi', 'src/i18n/ui/pl.ts:146-147', ['SERCE WROCŁAWIA', 'BIJE W SiSi']],
  en: ['THE HEART OF WROCŁAW BEATS AT SiSi', 'src/i18n/ui/en.ts:140-141', ['THE HEART OF WROCŁAW', 'BEATS AT SiSi']],
  de: ['DAS HERZ BRESLAUS SCHLÄGT IM SiSi', 'src/i18n/ui/de.ts:140-141', ['DAS HERZ BRESLAUS', 'SCHLÄGT IM SiSi']],
  it: ['IL CUORE DI BRESLAVIA BATTE AL SiSi', 'src/i18n/ui/it.ts:139-140', ['IL CUORE DI BRESLAVIA', 'BATTE AL SiSi']],
  cs: ['SRDCE VRATISLAVI BIJE V SiSi', 'src/i18n/ui/cs.ts:140-141', ['SRDCE VRATISLAVI', 'BIJE V SiSi']],
});

/** <meta name="description"> of the home page and the NightClub JSON-LD description. */
export const DESCRIPTION: L10n = l10n({
  pl: ['SiSi - klub muzyczny i bar w kompleksie R32 przy Rzeźniczej we Wrocławiu. Muzyka na żywo, DJ-e i autorskie koktajle w piątki i soboty, 22:00-04:00.', 'src/i18n/ui/pl.ts:10-11'],
  en: ['SiSi - music club and bar in the R32 complex on Rzeźnicza, Wrocław. Live music, DJs and signature cocktails, Fridays and Saturdays, 22:00-04:00.', 'src/i18n/ui/en.ts:8-9'],
  de: ['SiSi - Music Club und Bar im R32-Komplex an der Rzeźnicza in Breslau. Live-Musik, DJs und Signature-Cocktails, freitags und samstags von 22 bis 4 Uhr.', 'src/i18n/ui/de.ts:9-10'],
  it: ['SiSi - music club e bar nel complesso R32 in via Rzeźnicza, a Breslavia. Musica dal vivo, DJ e cocktail d\'autore, venerdì e sabato dalle 22:00 alle 04:00.', 'src/i18n/ui/it.ts:8-9'],
  cs: ['SiSi - hudební klub a bar v komplexu R32 na ulici Rzeźnicza ve Vratislavi. Živá hudba, DJ a autorské koktejly, pátky a soboty 22:00-04:00.', 'src/i18n/ui/cs.ts:8-9'],
});

/** One-line descriptor under the hero title. */
export const DESCRIPTOR: L10n = l10n({
  pl: ['Klub muzyczny, live acts, DJ-e i koktajle w centrum Wrocławia.', 'src/i18n/ui/pl.ts:148'],
  en: ['Music club, live acts, DJs and cocktails in central Wrocław.', 'src/i18n/ui/en.ts:142'],
  de: ['Musikclub, Live-Acts, DJs und Cocktails im Zentrum von Breslau.', 'src/i18n/ui/de.ts:142'],
  it: ['Music club, live act, DJ e cocktail nel centro di Breslavia.', 'src/i18n/ui/it.ts:141'],
  cs: ['Hudební klub, živá vystoupení, DJové a koktejly v centru Vratislavi.', 'src/i18n/ui/cs.ts:142'],
});

export const FOOTER_TAGLINE: L10n = l10n({
  pl: ['Muzyka na żywo, DJ-e i koktajle w centrum Wrocławia.', 'src/i18n/ui/pl.ts:112'],
  en: ['Live music, DJs and cocktails in central Wrocław.', 'src/i18n/ui/en.ts:107'],
  de: ['Live-Musik, DJs und Cocktails im Zentrum von Breslau.', 'src/i18n/ui/de.ts:107'],
  it: ['Musica dal vivo, DJ e cocktail nel centro di Breslavia.', 'src/i18n/ui/it.ts:106'],
  cs: ['Živá hudba, DJ a koktejly v centru Vratislavi.', 'src/i18n/ui/cs.ts:107'],
});

/** Day span printed next to the hours, e.g. "Piątek - Sobota". */
export const HOURS_DAYS: L10n = l10n({
  pl: ['Piątek - Sobota', 'src/i18n/ui/pl.ts:85'],
  en: ['Friday - Saturday', 'src/i18n/ui/en.ts:80'],
  de: ['Freitag - Samstag', 'src/i18n/ui/de.ts:80'],
  it: ['Venerdì - Sabato', 'src/i18n/ui/it.ts:79'],
  cs: ['Pátek - Sobota', 'src/i18n/ui/cs.ts:80'],
});

export const SPONSOR_ZONE_NAME: L10n = l10n({
  pl: ['Strefa Chivas Regal', 'src/i18n/ui/pl.ts:189'],
  en: ['Chivas Regal Zone', 'src/i18n/ui/en.ts:183'],
  de: ['Chivas Regal Zone', 'src/i18n/ui/de.ts:183'],
  it: ['Chivas Regal Zone', 'src/i18n/ui/it.ts:182'],
  cs: ['Chivas Regal Zone', 'src/i18n/ui/cs.ts:183'],
});

/** reservationsPage.practicalConditions, in page order:
    0 deposit per person, 1 Friday entry, 2 Saturday entry, 3 arrival window and lateness,
    4 valid ID, 5 selection, dress code, denial and refund. */
export const RESERVATION_PRACTICAL: readonly L10n[] = [
  l10n({
    pl: ['Koszt rezerwacji wynosi 100 zł od osoby - cała kwota jest do wykorzystania przy stoliku u obsługi.', 'src/i18n/ui/pl.ts:325'],
    en: ['The reservation fee is PLN 100 per person - the full amount can be spent at your table with our staff.', 'src/i18n/ui/en.ts:318'],
    de: ['Die Reservierungsgebühr beträgt 100 PLN pro Person - der gesamte Betrag kann am Tisch beim Service eingelöst werden.', 'src/i18n/ui/de.ts:318'],
    it: ['Il costo della prenotazione è di 100 PLN a persona - l\'intero importo è utilizzabile al tavolo con il personale.', 'src/i18n/ui/it.ts:317'],
    cs: ['Cena rezervace je 100 PLN na osobu - celou částku lze utratit u stolu u obsluhy.', 'src/i18n/ui/cs.ts:318'],
  }),
  l10n({
    pl: ['W piątki wstęp do klubu dla osób z rezerwacją jest bezpłatny.', 'src/i18n/ui/pl.ts:326'],
    en: ['On Fridays, entry is free for guests with a reservation.', 'src/i18n/ui/en.ts:319'],
    de: ['Freitags ist der Eintritt für Gäste mit Reservierung kostenlos.', 'src/i18n/ui/de.ts:319'],
    it: ['Il venerdì l\'ingresso è gratuito per gli ospiti con prenotazione.', 'src/i18n/ui/it.ts:318'],
    cs: ['V pátek je vstup pro hosty s rezervací zdarma.', 'src/i18n/ui/cs.ts:319'],
  }),
  l10n({
    pl: ['W soboty do rezerwacji doliczany jest wstęp w wysokości 40 zł od osoby.', 'src/i18n/ui/pl.ts:327'],
    en: ['On Saturdays, an entry fee of PLN 40 per person is added to the reservation.', 'src/i18n/ui/en.ts:320'],
    de: ['Samstags wird ein Eintritt von 40 PLN pro Person zur Reservierung hinzugerechnet.', 'src/i18n/ui/de.ts:320'],
    it: ['Il sabato alla prenotazione si aggiunge un ingresso di 40 PLN a persona.', 'src/i18n/ui/it.ts:319'],
    cs: ['V sobotu se k rezervaci připočítává vstup 40 PLN na osobu.', 'src/i18n/ui/cs.ts:320'],
  }),
  l10n({
    pl: ['Rezerwację należy odebrać w godzinach 22:00-23:00. W przypadku spóźnienia powyżej 30 minut stolik może zostać przekazany innym gościom.', 'src/i18n/ui/pl.ts:328'],
    en: ['Reservations must be claimed between 22:00 and 23:00. If you are more than 30 minutes late, the table may be released to other guests.', 'src/i18n/ui/en.ts:321'],
    de: ['Reservierungen sind zwischen 22:00 und 23:00 Uhr einzulösen. Bei mehr als 30 Minuten Verspätung kann der Tisch an andere Gäste vergeben werden.', 'src/i18n/ui/de.ts:321'],
    it: ['La prenotazione va ritirata tra le 22:00 e le 23:00. In caso di ritardo superiore a 30 minuti, il tavolo può essere assegnato ad altri ospiti.', 'src/i18n/ui/it.ts:320'],
    cs: ['Rezervaci je třeba vyzvednout mezi 22:00 a 23:00. Při zpoždění delším než 30 minut může být stůl přenechán jiným hostům.', 'src/i18n/ui/cs.ts:321'],
  }),
  l10n({
    pl: ['Wstęp do lokalu mają osoby posiadające ważny dokument tożsamości.', 'src/i18n/ui/pl.ts:329'],
    en: ['Entry is restricted to guests with valid ID.', 'src/i18n/ui/en.ts:322'],
    de: ['Einlass nur für Gäste mit gültigem Ausweis.', 'src/i18n/ui/de.ts:322'],
    it: ['L\'ingresso è riservato agli ospiti con documento valido.', 'src/i18n/ui/it.ts:321'],
    cs: ['Vstup je vyhrazen hostům s platným dokladem totožnosti.', 'src/i18n/ui/cs.ts:322'],
  }),
  l10n({
    pl: ['W lokalu obowiązuje selekcja oraz dress code w stylu smart casual. Obsługa zastrzega sobie prawo odmowy wstępu bez podania przyczyny, również osobom z rezerwacją (wpłacona kwota zostaje wówczas zwrócona).', 'src/i18n/ui/pl.ts:330'],
    en: ['A door selection policy and a smart-casual dress code apply. Staff reserve the right to refuse entry without giving a reason, including to guests with a reservation (the amount paid is then refunded).', 'src/i18n/ui/en.ts:323'],
    de: ['Es gelten eine Türauswahl und ein Smart-Casual-Dresscode. Das Team behält sich vor, den Einlass ohne Angabe von Gründen zu verweigern, auch bei Gästen mit Reservierung (der gezahlte Betrag wird dann erstattet).', 'src/i18n/ui/de.ts:323'],
    it: ['Si applicano una selezione all\'ingresso e un dress code smart casual. Il personale si riserva di rifiutare l\'ingresso senza fornire motivazioni, anche agli ospiti con prenotazione (in tal caso l\'importo versato viene rimborsato).', 'src/i18n/ui/it.ts:322'],
    cs: ['Platí výběr u vstupu a dress code smart casual. Obsluha si vyhrazuje právo odepřít vstup bez udání důvodu, i hostům s rezervací (zaplacená částka se v takovém případě vrací).', 'src/i18n/ui/cs.ts:323'],
  }),
];

/** reservationsPage.conditions, in page order:
    0 pre-select menu items, 1 packages, 2 wait for acceptance, 3 prepayment confirms. */
export const RESERVATION_CONDITIONS: readonly L10n[] = [
  l10n({
    pl: ['Podczas rezerwacji można wybrać pozycje z menu, które będą czekały na gości na start.', 'src/i18n/ui/pl.ts:334'],
    en: ['When booking, you can pre-select menu items to be ready for your guests on arrival.', 'src/i18n/ui/en.ts:327'],
    de: ['Bei der Reservierung kannst du Menüpunkte vorauswählen, die bei Ankunft für deine Gäste bereitstehen.', 'src/i18n/ui/de.ts:327'],
    it: ['Al momento della prenotazione puoi pre-selezionare piatti del menu che attenderanno gli ospiti all\'arrivo.', 'src/i18n/ui/it.ts:326'],
    cs: ['Při rezervaci si můžete předvybrat položky z menu, které budou na hosty čekat po příchodu.', 'src/i18n/ui/cs.ts:327'],
  }),
  l10n({
    pl: ['Dostępne są również specjalne pakiety w promocyjnych cenach.', 'src/i18n/ui/pl.ts:335'],
    en: ['Special packages at promotional prices are also available.', 'src/i18n/ui/en.ts:328'],
    de: ['Außerdem sind spezielle Pakete zu Aktionspreisen verfügbar.', 'src/i18n/ui/de.ts:328'],
    it: ['Sono disponibili anche pacchetti speciali a prezzi promozionali.', 'src/i18n/ui/it.ts:327'],
    cs: ['K dispozici jsou také speciální balíčky za zvýhodněné ceny.', 'src/i18n/ui/cs.ts:328'],
  }),
  l10n({
    pl: ['Po dokonaniu rezerwacji prosimy o oczekiwanie na jej akceptację i przesłanie szczegółowych warunków.', 'src/i18n/ui/pl.ts:336'],
    en: ['After booking, please wait for confirmation and the detailed terms to be sent to you.', 'src/i18n/ui/en.ts:329'],
    de: ['Bitte warte nach der Reservierung auf die Bestätigung und die Zusendung der detaillierten Bedingungen.', 'src/i18n/ui/de.ts:329'],
    it: ['Dopo la prenotazione, attendi la conferma e l\'invio delle condizioni dettagliate.', 'src/i18n/ui/it.ts:328'],
    cs: ['Po rezervaci prosím vyčkejte na potvrzení a zaslání podrobných podmínek.', 'src/i18n/ui/cs.ts:329'],
  }),
  l10n({
    pl: ['Warunkiem potwierdzenia rezerwacji jest przedpłata.', 'src/i18n/ui/pl.ts:337'],
    en: ['A reservation is confirmed by prepayment.', 'src/i18n/ui/en.ts:330'],
    de: ['Die Reservierung wird durch eine Vorauszahlung bestätigt.', 'src/i18n/ui/de.ts:330'],
    it: ['La prenotazione si conferma con un pagamento anticipato.', 'src/i18n/ui/it.ts:329'],
    cs: ['Rezervace se potvrzuje platbou předem.', 'src/i18n/ui/cs.ts:330'],
  }),
];

export const RESERVATION_NOTE: L10n = l10n({
  pl: ['Ceny mogą ulec zmianie podczas imprez specjalnych. Szczegółowe warunki są każdorazowo potwierdzane podczas rezerwacji.', 'src/i18n/ui/pl.ts:339'],
  en: ['Prices may change during special events. The detailed terms are confirmed each time you book.', 'src/i18n/ui/en.ts:332'],
  de: ['Bei Sonderveranstaltungen können sich die Preise ändern. Die genauen Bedingungen werden bei jeder Reservierung bestätigt.', 'src/i18n/ui/de.ts:332'],
  it: ['I prezzi possono variare durante gli eventi speciali. Le condizioni dettagliate vengono confermate a ogni prenotazione.', 'src/i18n/ui/it.ts:331'],
  cs: ['Ceny se mohou během speciálních akcí měnit. Podrobné podmínky jsou potvrzovány při každé rezervaci.', 'src/i18n/ui/cs.ts:332'],
});

/** reservationsHome.terms: the one-line summary on the home and reservations pages. */
export const RESERVATION_SUMMARY: L10n = l10n({
  pl: ['Rezerwacja stolika to 100 zł od osoby do wykorzystania przy stoliku; w soboty obowiązuje dodatkowy wstęp 40 zł od osoby.', 'src/i18n/ui/pl.ts:206'],
  en: ['A table reservation is 100 zł per person, credited at your table; on Saturdays a 40 zł per-person entry applies.', 'src/i18n/ui/en.ts:200'],
  de: ['Eine Tischreservierung kostet 100 zł pro Person, am Tisch anrechenbar; samstags gilt ein zusätzlicher Eintritt von 40 zł pro Person.', 'src/i18n/ui/de.ts:200'],
  it: ['La prenotazione di un tavolo è di 100 zł a persona, utilizzabili al tavolo; il sabato si applica un ingresso aggiuntivo di 40 zł a persona.', 'src/i18n/ui/it.ts:199'],
  cs: ['Rezervace stolu je 100 zł za osobu k útratě u stolu; v sobotu se účtuje vstupné navíc 40 zł za osobu.', 'src/i18n/ui/cs.ts:200'],
});
