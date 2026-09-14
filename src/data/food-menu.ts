// Shared The Cork dishes, portions and translations for the menu and homepage.
import { type Locale } from '../i18n/config';
import { UI_ICONS } from './ui-icons';
import { FOOD_ILLUSTRATIONS } from './food-icons';

export type L = Record<Locale, string>;
export type Diet = 'vegetarian' | 'vegan';
export interface Tier { qty?: L; price: string }
export interface Dish { icon: string; name: L; desc?: L; tiers: Tier[]; diet?: Diet; spicy?: boolean }
export interface FoodSection { title: L; icon: string; dishes: Dish[] }

// Prepared-dish illustrations plus simple section and dietary symbols.
// The cream menu renderer supplies the illustration palette.
export const ICONS = {
  shell: FOOD_ILLUSTRATIONS.oyster,
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  bread: FOOD_ILLUSTRATIONS.crostini,
  beef: FOOD_ILLUSTRATIONS.beef,
  fish: FOOD_ILLUSTRATIONS.tuna,
  platter: FOOD_ILLUSTRATIONS.platter,
  cheese: FOOD_ILLUSTRATIONS.cheese,
  drumstick: FOOD_ILLUSTRATIONS.buffalo,
  utensils: UI_ICONS.utensils,
  knife: FOOD_ILLUSTRATIONS.tartare,
  // Badge glyphs (real library icons) — a leaf (Lucide) shown in a CSS circle
  // for veg, a chili pepper (Tabler) for spicy.
  leafCircle: UI_ICONS.leaf,
  chili: '<path d="M13 11c0 2.21-2.239 4-5 4s-5-1.79-5-4a8 8 0 1 0 16 0a3 3 0 0 0-6 0"/><path d="M16 8c0-2 2-4 4-4"/>',
  shrimp: FOOD_ILLUSTRATIONS.seafood,
};

// Diet badge labels (shown as the badge's tooltip / a11y label). Only the
// clearly-vegetarian cheese board is marked; the rest await the kitchen's list.
export const DIET: Record<Diet, L> = {
  vegetarian: { pl: 'wegetariańskie', en: 'vegetarian', de: 'vegetarisch', it: 'vegetariano', cs: 'vegetariánské' },
  vegan: { pl: 'wegańskie', en: 'vegan', de: 'vegan', it: 'vegano', cs: 'veganské' },
};
export const SPICY: L = { pl: 'ostre', en: 'spicy', de: 'scharf', it: 'piccante', cs: 'pálivé' };

// Portion labels reused across dishes.
export const QTY: Record<string, L> = {
  p3: { pl: '3 szt', en: '3 pcs', de: '3 Stk.', it: '3 pz', cs: '3 ks' },
  p5: { pl: '5 szt', en: '5 pcs', de: '5 Stk.', it: '5 pz', cs: '5 ks' },
  p6: { pl: '6 szt', en: '6 pcs', de: '6 Stk.', it: '6 pz', cs: '6 ks' },
  p9: { pl: '9 szt', en: '9 pcs', de: '9 Stk.', it: '9 pz', cs: '9 ks' },
  d2: { pl: 'dla 2 os.', en: 'for 2', de: 'für 2', it: 'per 2', cs: 'pro 2' },
  d4: { pl: 'dla 4 os.', en: 'for 4', de: 'für 4', it: 'per 4', cs: 'pro 4' },
  d6: { pl: 'dla 6 os.', en: 'for 6', de: 'für 6', it: 'per 6', cs: 'pro 6' },
};

export const TAGLINE = {
  eyebrow: 'The Cork · Wrocław',
  heading: {
    pl: 'Odkrywaj z nami pasję do jedzenia',
    en: 'Discover our passion for food',
    de: 'Entdecke mit uns die Leidenschaft fürs Essen',
    it: 'Scopri con noi la passione per il cibo',
    cs: 'Objevujte s námi vášeň pro jídlo',
  } as L,
  sub: {
    pl: 'Bogactwo ulubionych smaków – prosto, świeżo, autentycznie.',
    en: 'A wealth of beloved flavours – simple, fresh, authentic.',
    de: 'Eine Fülle liebster Aromen – schlicht, frisch, authentisch.',
    it: 'Una ricchezza di sapori amati – semplice, fresco, autentico.',
    cs: 'Bohatství oblíbených chutí – jednoduše, čerstvě, autenticky.',
  } as L,
};

export const SECTIONS: FoodSection[] = [
  {
    title: { pl: 'Na początek', en: 'To start', de: 'Zum Anfang', it: 'Per iniziare', cs: 'Na začátek' },
    icon: ICONS.utensils,
    dishes: [
      {
        icon: ICONS.shell,
        name: { pl: 'Ostrygi', en: 'Oysters', de: 'Austern', it: 'Ostriche', cs: 'Ústřice' },
        desc: {
          pl: 'Szkocja · Irlandia · Francja, na lodzie\nSosy do wyboru: klasyczna cytryna, mignonette, spicy mango',
          en: 'Scotland · Ireland · France, on ice\nSauces to choose: classic lemon, mignonette, spicy mango',
          de: 'Schottland · Irland · Frankreich, auf Eis\nSaucen zur Wahl: klassisch Zitrone, Mignonette, Spicy Mango',
          it: 'Scozia · Irlanda · Francia, su ghiaccio\nSalse a scelta: limone classico, mignonette, mango piccante',
          cs: 'Skotsko · Irsko · Francie, na ledu\nOmáčky na výběr: klasický citron, mignonette, pikantní mango',
        },
        tiers: [{ qty: QTY.p3, price: '49 zł' }, { qty: QTY.p6, price: '85 zł' }, { qty: QTY.p9, price: '120 zł' }],
      },
      {
        icon: ICONS.bread,
        name: { pl: 'Crostini', en: 'Crostini', de: 'Crostini', it: 'Crostini', cs: 'Crostini' },
        desc: {
          pl: 'Dedykowany chleb Sisi',
          en: 'Signature Sisi bread',
          de: 'Sisi-Signature-Brot',
          it: 'Pane Sisi della casa',
          cs: 'Signature chléb Sisi',
        },
        tiers: [],
      },
      {
        icon: ICONS.knife,
        name: {
          pl: 'Klasyczny tatar wołowy The Cork',
          en: 'The Cork classic beef tartare',
          de: 'Klassisches Rindertatar The Cork',
          it: 'Tartare di manzo classica The Cork',
          cs: 'Klasický hovězí tatarák The Cork',
        },
        desc: {
          pl: 'Ogórki / szalotka / musztarda / lubczyk / żółtko / chili / kapelusze borowika / domowa focaccia aglio e olio peperoncino',
          en: 'Cucumber / shallot / mustard / lovage / egg yolk / chili / porcini caps / house focaccia aglio e olio peperoncino',
          de: 'Gurke / Schalotte / Senf / Liebstöckel / Eigelb / Chili / Steinpilzköpfe / hausgemachte Focaccia aglio e olio peperoncino',
          it: 'Cetriolo / scalogno / senape / levistico / tuorlo / peperoncino / cappelle di porcini / focaccia della casa aglio e olio peperoncino',
          cs: 'Okurka / šalotka / hořčice / libeček / žloutek / chili / hlavičky hřibů / domácí focaccia aglio e olio peperoncino',
        },
        tiers: [{ qty: QTY.p3, price: '49 zł' }],
      },
      {
        icon: ICONS.beef,
        name: {
          pl: 'Pieczona polędwica Rubia Gallega',
          en: 'Roasted Rubia Gallega beef',
          de: 'Gebratenes Rubia-Gallega-Rind',
          it: 'Controfiletto di Rubia Gallega arrosto',
          cs: 'Pečená svíčková Rubia Gallega',
        },
        desc: {
          pl: 'Sos pepe verde / śmietana truflowa / ser Emilgrana',
          en: 'Pepe verde sauce / truffle cream / Emilgrana cheese',
          de: 'Pepe-Verde-Sauce / Trüffelcreme / Emilgrana-Käse',
          it: 'Salsa al pepe verde / crema al tartufo / formaggio Emilgrana',
          cs: 'Omáčka pepe verde / lanýžová smetana / sýr Emilgrana',
        },
        tiers: [{ qty: QTY.p3, price: '49 zł' }],
      },
      {
        icon: ICONS.fish,
        spicy: true,
        name: {
          pl: 'Tuńczyk Blue Fin à la chinoise',
          en: 'Blue Fin tuna à la chinoise',
          de: 'Blue-Fin-Thunfisch à la chinoise',
          it: 'Tonno Blue Fin à la chinoise',
          cs: 'Tuňák Blue Fin à la chinoise',
        },
        desc: {
          pl: 'Palony por / cytrusy / chili / sos sojowy / sezam',
          en: 'Charred leek / citrus / chili / soy sauce / sesame',
          de: 'Gebrannter Lauch / Zitrus / Chili / Sojasauce / Sesam',
          it: 'Porro bruciato / agrumi / peperoncino / salsa di soia / sesamo',
          cs: 'Opálený pórek / citrusy / chili / sójová omáčka / sezam',
        },
        tiers: [{ qty: QTY.p3, price: '49 zł' }],
      },
      {
        icon: ICONS.platter,
        name: {
          pl: 'Etażera Sisi',
          en: 'Sisi tiered platter',
          de: 'Sisi Etagere',
          it: 'Alzata Sisi',
          cs: 'Etažér Sisi',
        },
        desc: {
          pl: 'Miks crostini i ostryg',
          en: 'A mix of crostini and oysters',
          de: 'Mix aus Crostini und Austern',
          it: 'Mix di crostini e ostriche',
          cs: 'Mix crostini a ústřic',
        },
        tiers: [{ qty: QTY.d2, price: '139 zł' }, { qty: QTY.d4, price: '259 zł' }, { qty: QTY.d6, price: '379 zł' }],
      },
      {
        icon: ICONS.cheese,
        name: {
          pl: 'Sery Corka',
          en: 'The Cork cheese board',
          de: 'Käseauswahl The Cork',
          it: 'Selezione di formaggi The Cork',
          cs: 'Sýrové prkénko The Cork',
        },
        desc: {
          pl: 'Kozi / owczy / krowi / oliwki / musztarda pomarańczowa',
          en: 'Goat / sheep / cow / olives / orange mustard',
          de: 'Ziege / Schaf / Kuh / Oliven / Orangensenf',
          it: "Capra / pecora / mucca / olive / senape all'arancia",
          cs: 'Kozí / ovčí / kravský / olivy / pomerančová hořčice',
        },
        tiers: [{ price: '65 zł' }],
        diet: 'vegetarian',
      },
    ],
  },
  {
    title: { pl: 'Na ciepło', en: 'Hot', de: 'Warme Gerichte', it: 'Piatti caldi', cs: 'Teplá jídla' },
    icon: ICONS.flame,
    dishes: [
      {
        icon: ICONS.shrimp,
        name: { pl: 'Seafood basket', en: 'Seafood basket', de: 'Seafood-Korb', it: 'Cestino di mare', cs: 'Seafood basket' },
        desc: {
          pl: 'Krewetki / dorsz / kalmar / dip czosnkowo-ziołowy / cytryna / chipsy warzywne',
          en: 'Shrimp / cod / squid / garlic-herb dip / lemon / vegetable chips',
          de: 'Garnelen / Kabeljau / Tintenfisch / Knoblauch-Kräuter-Dip / Zitrone / Gemüsechips',
          it: 'Gamberi / merluzzo / calamaro / dip aglio ed erbe / limone / chips di verdure',
          cs: 'Krevety / treska / kalamáry / česnekovo-bylinkový dip / citron / zeleninové chipsy',
        },
        tiers: [{ price: '65 zł' }],
      },
      {
        icon: ICONS.drumstick,
        spicy: true,
        name: {
          pl: 'Buffalo – chrupiący kurczak',
          en: 'Buffalo crispy chicken',
          de: 'Buffalo Crispy Chicken',
          it: 'Pollo croccante Buffalo',
          cs: 'Buffalo křupavé kuře',
        },
        desc: {
          pl: 'Miodowy czosnek / majonez piniowy / domowy sos Buffalo / nori / bonito',
          en: 'Honey garlic / pine-nut mayo / house Buffalo sauce / nori / bonito',
          de: 'Honig-Knoblauch / Pinienkern-Mayo / hausgemachte Buffalo-Sauce / Nori / Bonito',
          it: 'Aglio e miele / maionese ai pinoli / salsa Buffalo della casa / nori / bonito',
          cs: 'Medový česnek / piniová majonéza / domácí omáčka Buffalo / nori / bonito',
        },
        tiers: [{ price: '65 zł' }],
      },
    ],
  },
];
