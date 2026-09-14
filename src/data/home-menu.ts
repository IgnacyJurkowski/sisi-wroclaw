import type { Locale } from '../i18n/config';

type Copy = { intro: string; photoAlt: string; photoTitle: string; photoCaption: string; links: string[] };
export const HOME_MENU: Record<Locale, Copy> = {
  pl: {
    intro: 'Koktajle, polskie wina i Night Menu od The Cork. Wybierz coś na początek.',
    photoAlt: 'Koktajle w szklankach i kieliszkach na barze SiSi',
    photoTitle: 'Na dobry początek.',
    photoCaption: 'Koktajl przy barze. Reszta wieczoru przed Tobą.',
    links: ['Wszystkie koktajle', 'Pełna karta bez alkoholu', 'Wszystkie wina', 'Pełne Night Menu'],
  },
  en: {
    intro: 'Cocktails, Polish wines and Night Menu by The Cork. Choose something to start.',
    photoAlt: 'Cocktails in tumblers and stemmed glasses on the SiSi bar',
    photoTitle: 'A good beginning.',
    photoCaption: 'A cocktail at the bar. The night is yours.',
    links: ['All cocktails', 'Full alcohol-free menu', 'All wines', 'Full Night Menu'],
  },
  de: {
    intro: 'Cocktails, polnische Weine und das Night Menu von The Cork. Was darf es zum Auftakt sein?',
    photoAlt: 'Cocktails in Gläsern auf der SiSi-Bar',
    photoTitle: 'Ein guter Anfang.',
    photoCaption: 'Ein Cocktail an der Bar. Der Abend gehört dir.',
    links: ['Alle Cocktails', 'Alle alkoholfreien Getränke', 'Alle Weine', 'Das gesamte Night Menu'],
  },
  it: {
    intro: 'Cocktail, vini polacchi e Night Menu di The Cork. Scegli da dove cominciare.',
    photoAlt: 'Cocktail in bicchieri e calici sul bancone del SiSi',
    photoTitle: 'Per iniziare bene.',
    photoCaption: 'Un cocktail al bar. La serata è tutta tua.',
    links: ['Tutti i cocktail', 'Tutte le bevande analcoliche', 'Tutti i vini', 'Night Menu completo'],
  },
  cs: {
    intro: 'Koktejly, polská vína a Night Menu od The Cork. Vyberte si něco na začátek.',
    photoAlt: 'Koktejly ve sklenicích na baru SiSi',
    photoTitle: 'Na dobrý začátek.',
    photoCaption: 'Koktejl u baru. Večer je váš.',
    links: ['Všechny koktejly', 'Všechny nealkoholické nápoje', 'Všechna vína', 'Celé Night Menu'],
  },
};
