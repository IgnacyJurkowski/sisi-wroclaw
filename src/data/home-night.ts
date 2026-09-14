import type { Locale } from '../i18n/config';

interface NightCopy {
  intro: string;
  imageAlt: string;
  caption: string;
  phases: [
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
  ];
}

/** The evening sequence already described in the venue's About copy.
 * These are phases of a night, not scheduled performance times. */
export const homeNight: Record<Locale, NightCopy> = {
  pl: {
    intro: 'Piątki i soboty w SiSi, w kompleksie R32 przy Rzeźniczej.',
    imageAlt: 'Muzycy grający na żywo obok baru i gości w SiSi.',
    caption: 'Muzyka na żywo, tuż przy barze.',
    phases: [
      { title: 'Pierwszy koktajl', body: 'Spotkajmy się przy barze. Jest czas na rozmowę i pierwszy toast.' },
      { title: 'Muzyka na żywo', body: 'Live acty nadają początkowi wieczoru rytm. Muzycy są tuż obok.' },
      { title: 'Parkiet do 4:00', body: 'Później za konsoletę wchodzą DJ-e, a wieczór przenosi się na parkiet.' },
    ],
  },
  en: {
    intro: 'Fridays and Saturdays at SiSi, in the R32 complex on Rzeźnicza.',
    imageAlt: 'Musicians playing live beside the bar and guests at SiSi.',
    caption: 'Live music, right beside the bar.',
    phases: [
      { title: 'The first cocktail', body: 'Meet us at the bar. There is time for a conversation and a first toast.' },
      { title: 'Live music', body: 'Live acts set the rhythm for the start of the evening, with the musicians right beside you.' },
      { title: 'Dancing until 04:00', body: 'Later, the DJs take over and the evening moves onto the dance floor.' },
    ],
  },
  de: {
    intro: 'Freitags und samstags im SiSi, im R32-Komplex an der Rzeźnicza.',
    imageAlt: 'Musiker spielen live neben der Bar und den Gästen im SiSi.',
    caption: 'Livemusik, direkt an der Bar.',
    phases: [
      { title: 'Der erste Cocktail', body: 'Wir treffen uns an der Bar. Zeit für ein Gespräch und zum ersten Anstoßen.' },
      { title: 'Musik live erleben', body: 'Live-Acts geben dem Abend seinen ersten Rhythmus. Die Musiker sind ganz nah.' },
      { title: 'Tanzen bis 04:00', body: 'Später übernehmen die DJs und der Abend verlagert sich auf die Tanzfläche.' },
    ],
  },
  it: {
    intro: 'Il venerdì e il sabato da SiSi, nel complesso R32 in via Rzeźnicza.',
    imageAlt: 'Musicisti che suonano dal vivo accanto al bar e agli ospiti di SiSi.',
    caption: 'Musica dal vivo, proprio accanto al bar.',
    phases: [
      { title: 'Il primo cocktail', body: 'Ci vediamo al bar. C’è tempo per una chiacchierata e un primo brindisi.' },
      { title: 'Musica dal vivo', body: 'I live act danno il ritmo all’inizio della serata, con i musicisti a pochi passi.' },
      { title: 'In pista fino alle 04:00', body: 'Poi arrivano i DJ alla console e la serata si sposta sulla pista da ballo.' },
    ],
  },
  cs: {
    intro: 'Pátky a soboty v SiSi, v komplexu R32 na Rzeźnicze.',
    imageAlt: 'Hudebníci hrají živě vedle baru a hostů v SiSi.',
    caption: 'Živá hudba, přímo u baru.',
    phases: [
      { title: 'První koktejl', body: 'Sejdeme se u baru. Je čas na rozhovor a první přípitek.' },
      { title: 'Živá hudba', body: 'Živá vystoupení udávají rytmus začátku večera. Hudebníci jsou hned vedle vás.' },
      { title: 'Tanec do 04:00', body: 'Později se pultu ujmou DJové a večer se přesune na taneční parket.' },
    ],
  },
};
