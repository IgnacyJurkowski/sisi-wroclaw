// Shared bar menu: the full menu and homepage preview render the same data.
import { type Locale } from '../i18n/config';
import { DRINK_ICONS } from './drink-icons';

// Cocktail and spirit brand names stay as-is (Hugo Spritz, Chivas XII, …); the
// generic ingredient words and beer-style descriptors are localized so non-Polish
// guests can read what's in each drink. Brand tokens simply fall through unchanged.
// Cocktail ingredients are keyed by their Polish source word, so `pl` is omitted
// (the source text is already Polish). Beer styles are keyed by their English
// source text, so they carry an explicit `pl` value too.
export type Item = { name: string; desc?: string; vol?: string; price: string };

export const INGREDIENTS: Record<string, Partial<Record<Locale, string>>> = {
  'Limonka': { en: 'Lime', de: 'Limette', it: 'Lime', cs: 'Limetka' },
  'Mięta': { en: 'Mint', de: 'Minze', it: 'Menta', cs: 'Máta' },
  'Woda gazowana': { en: 'Sparkling water', de: 'Sodawasser', it: 'Acqua frizzante', cs: 'Sodová voda' },
  'Pomarańcze': { en: 'Oranges', de: 'Orangen', it: 'Arance', cs: 'Pomeranče' },
  'Marakuja': { en: 'Passion fruit', de: 'Maracuja', it: 'Frutto della passione', cs: 'Marakuja' },
  'Wanilia': { en: 'Vanilla', de: 'Vanille', it: 'Vaniglia', cs: 'Vanilka' },
  'Cytryna': { en: 'Lemon', de: 'Zitrone', it: 'Limone', cs: 'Citron' },
  'Cukier': { en: 'Sugar', de: 'Zucker', it: 'Zucchero', cs: 'Cukr' },
  'Egg White': { en: 'Egg white', de: 'Eiweiß', it: 'Albume', cs: 'Bílek' },
  'Olejki pomarańczy': { en: 'Orange oils', de: 'Orangenöl', it: "Oli d'arancia", cs: 'Pomerančový olej' },
  'Skórka pomarańczy': { en: 'Orange peel', de: 'Orangenschale', it: "Scorza d'arancia", cs: 'Pomerančová kůra' },
  'Cytrusy': { en: 'Citrus', de: 'Zitrusfrüchte', it: 'Agrumi', cs: 'Citrusy' },
  'Czerwony wermut': { en: 'Red vermouth', de: 'Roter Wermut', it: 'Vermouth rosso', cs: 'Červený vermut' },
  'Żurawina': { en: 'Cranberry', de: 'Cranberry', it: 'Mirtillo rosso', cs: 'Brusinka' },
  'Ananas': { en: 'Pineapple', de: 'Ananas', it: 'Ananas', cs: 'Ananas' },
  'Krem kokosowy': { en: 'Coconut cream', de: 'Kokoscreme', it: 'Crema di cocco', cs: 'Kokosový krém' },
  'Malina': { en: 'Raspberry', de: 'Himbeere', it: 'Lampone', cs: 'Malina' },
  'Sok pomidorowy': { en: 'Tomato juice', de: 'Tomatensaft', it: 'Succo di pomodoro', cs: 'Rajčatový džus' },
  'Przyprawy': { en: 'Spices', de: 'Gewürze', it: 'Spezie', cs: 'Koření' },
  'Orgeat': { en: 'Orgeat', de: 'Orgeat', it: 'Orzata', cs: 'Orgeat' },
  'Piwo imbirowe': { en: 'Ginger beer', de: 'Ginger Beer', it: 'Ginger beer', cs: 'Zázvorové pivo' },
  'Cachaça': { en: 'Cachaça', de: 'Cachaça', it: 'Cachaça', cs: 'Cachaça' },
  'Jabłko': { en: 'Apple', de: 'Apfel', it: 'Mela', cs: 'Jablko' },
  'Woda mineralna niegazowana': { en: 'Still mineral water', de: 'Stilles Mineralwasser', it: 'Acqua minerale naturale', cs: 'Neperlivá minerální voda' },
  'Woda mineralna gazowana': { en: 'Sparkling mineral water', de: 'Mineralwasser mit Kohlensäure', it: 'Acqua minerale frizzante', cs: 'Perlivá minerální voda' },
  'Brzoskwinia': { en: 'Peach', de: 'Pfirsich', it: 'Pesca', cs: 'Broskev' },
  'Hibiskus': { en: 'Hibiscus', de: 'Hibiskus', it: 'Ibisco', cs: 'Ibišek' },
  'Multiwitamina': { en: 'Multivitamin', de: 'Multivitamin', it: 'Multivitaminico', cs: 'Multivitamin' },
  'Grejpfrut': { en: 'Grapefruit', de: 'Grapefruit', it: 'Pompelmo', cs: 'Grapefruit' },
  // Beer styles (source text is English; ABV and Blonde/Brune variant names stay).
  'Belgian lager': { pl: 'lager belgijski', en: 'Belgian lager', de: 'belgisches Lager', it: 'lager belga', cs: 'belgický ležák' },
  'Belgian wheat ale': { pl: 'belgijskie piwo pszeniczne', en: 'Belgian wheat ale', de: 'belgisches Weißbier', it: 'birra di frumento belga', cs: 'belgické pšeničné pivo' },
  'Belgian blonde ale': { pl: 'belgijski jasny ale', en: 'Belgian blonde ale', de: 'belgisches Blond Ale', it: 'blonde ale belga', cs: 'belgický světlý ale' },
  'Belgian ale': { pl: 'ale belgijski', en: 'Belgian ale', de: 'belgisches Ale', it: 'ale belga', cs: 'belgický ale' },
  'Mexican lager': { pl: 'lager meksykański', en: 'Mexican lager', de: 'mexikanisches Lager', it: 'lager messicano', cs: 'mexický ležák' },
  'German lager': { pl: 'lager niemiecki', en: 'German lager', de: 'deutsches Lager', it: 'lager tedesco', cs: 'německý ležák' },
  'American lager': { pl: 'lager amerykański', en: 'American lager', de: 'amerikanisches Lager', it: 'lager americano', cs: 'americký ležák' },
};

// Localize each generic token, keeping brand tokens, ABV and volumes as-is. Descs
// use " · " between a style and its ABV and " / " between ingredients; split on
// both so each token can be looked up. Polish (and any token absent from the
// glossary) keeps the original word.
export function localizeDesc(desc: string, loc: Locale): string {
  return desc
    .split(' · ')
    .map((part) =>
      part
        .split(' / ')
        .map((tok) => INGREDIENTS[tok.trim()]?.[loc] ?? tok.trim())
        .join(' / '),
    )
    .join(' · ');
}

// Polish-vineyard wine list, grouped by colour. Wine name, winery, grape names
// and region are brand/proper-noun invariant; dryness and the colour category
// are localised (DRYNESS / WINE_CATEGORIES). Every wine has a 750 ml bottle
// price; only Halka and Triada have a 150 ml glass price. `vintage` is only set
// where a year was given; `featured` flags the one recommended bottle.
export type WineCategory = 'white' | 'red' | 'roseOrange';
export type Dryness = 'dry' | 'semiDry';

export interface Wine {
  category: WineCategory;
  name: string;
  winery: string;
  dryness?: Dryness;
  grapes?: string[];
  region?: string;
  glassPrice?: string;  // 150 ml
  bottlePrice: string;  // 750 ml
  vintage?: string;
  featured?: boolean;
}

export const WINES: Wine[] = [
  // White
  { category: 'white', name: 'Halka', winery: "Winnica L'Opera", dryness: 'semiDry', grapes: ['Chardonnay', 'Bronner', 'Muscaris'], region: 'Wzgórza Trzebnickie, Dolny Śląsk', glassPrice: '37 zł', bottlePrice: '220 zł' },
  { category: 'white', name: 'Hibernal', winery: 'Winnica Turnau', dryness: 'semiDry', grapes: ['Hibernal'], region: 'Baniewice, Pomorze Zachodnie', bottlePrice: '330 zł' },
  { category: 'white', name: 'Solaris', winery: 'Dom Charbielin', dryness: 'semiDry', grapes: ['Solaris'], region: 'Charbielin, Opolskie', bottlePrice: '360 zł' },
  { category: 'white', name: 'Chardonnay Barrique', winery: 'Winnica Płochockich', dryness: 'dry', grapes: ['Chardonnay'], region: 'Daromin, Świętokrzyskie', bottlePrice: '420 zł', vintage: '2024', featured: true },
  // Red
  { category: 'red', name: 'Triada', winery: "Winnica L'Opera", dryness: 'dry', grapes: ['Baron', 'Cabernet Cantor', 'Cabernet Cortis'], region: 'Wzgórza Trzebnickie, Dolny Śląsk', glassPrice: '40 zł', bottlePrice: '240 zł' },
  { category: 'red', name: 'Rege', winery: 'Winnica Płochockich', bottlePrice: '330 zł' },
  { category: 'red', name: 'Pinot Noir', winery: 'Winnica Turnau', dryness: 'dry', grapes: ['Pinot Noir'], region: 'Baniewice, Pomorze Zachodnie', bottlePrice: '420 zł' },
  // Rosé / Orange
  { category: 'roseOrange', name: 'Yacobus Orange', winery: 'Winnica Jakubów', dryness: 'dry', grapes: ['Hibernal', 'Riesling', 'Solaris', 'Traminer'], region: 'Wzgórza Dalkowskie, Dolny Śląsk', bottlePrice: '390 zł' },
  { category: 'roseOrange', name: 'Rosé', winery: 'Winnica Turnau', dryness: 'semiDry', grapes: ['Rondo', 'Regent'], region: 'Baniewice, Pomorze Zachodnie', bottlePrice: '330 zł' },
];

// Display order of the colour groups + their localised labels.
export const WINE_CATEGORIES: { key: WineCategory; label: Record<Locale, string> }[] = [
  { key: 'white',      label: { pl: 'Białe', en: 'White', de: 'Weiß', it: 'Bianco', cs: 'Bílé' } },
  { key: 'red',        label: { pl: 'Czerwone', en: 'Red', de: 'Rot', it: 'Rosso', cs: 'Červené' } },
  { key: 'roseOrange', label: { pl: 'Różowe / Pomarańczowe', en: 'Rosé / Orange', de: 'Rosé / Orange', it: 'Rosato / Arancione', cs: 'Růžové / Oranžové' } },
];

export const DRYNESS: Record<Dryness, Record<Locale, string>> = {
  dry: { pl: 'wytrawne', en: 'dry', de: 'trocken', it: 'secco', cs: 'suché' },
  semiDry: { pl: 'półwytrawne', en: 'semi-dry', de: 'halbtrocken', it: 'semisecco', cs: 'polosuché' },
};

export const FEATURED_LABEL: Record<Locale, string> = {
  pl: 'Polecamy', en: 'Recommended', de: 'Empfehlung', it: 'Consigliato', cs: 'Doporučujeme',
};

// Champagne (Maison Mumm + Perrier-Jouët), grouped by house. Each cuvée carries
// up to four sizes (125 ml glass, 750 ml, 1.5 l magnum, 3 l jeroboam); null =
// not offered in that size. Only Grand Cordon and Grand Brut are poured by the
// glass (see champagneNote). Brand names and prices are invariant, not localised.
export const CHAMP_VOLS = ['125 ml', '750 ml', '1,5 l', '3 l'] as const;

export interface Champagne { name: string; prices: (string | null)[] }
export const CHAMPAGNE_HOUSES: { house: string; items: Champagne[] }[] = [
  {
    house: 'G. H. Mumm',
    items: [
      { name: 'Grand Cordon', prices: ['69 zł', '420 zł', '900 zł', '2300 zł'] },
      { name: 'Grand Cordon Rosé', prices: [null, '479 zł', '950 zł', null] },
      { name: 'Demi Sec', prices: [null, '450 zł', null, null] },
      { name: 'Ice Xtra', prices: [null, '479 zł', null, null] },
    ],
  },
  {
    house: 'Perrier-Jouët',
    items: [
      { name: 'Grand Brut', prices: ['99 zł', '600 zł', '1500 zł', '4500 zł'] },
      { name: 'Blason Rosé', prices: [null, '650 zł', null, null] },
      { name: 'Blanc de Blancs', prices: [null, '700 zł', null, null] },
      { name: 'Belle Époque Brut 2015', prices: [null, '1700 zł', null, null] },
    ],
  },
];

export const koktajle: Item[] = [
  { name: 'Hugo Spritz', desc: 'St-Germain / Limonka / Mięta / Martini Prosecco / Woda gazowana', vol: '160 ml', price: '44 zł' },
  { name: 'Fiero Spritz', desc: 'Martini Fiero / Martini Prosecco / Pomarańcze / Woda gazowana', vol: '180 ml', price: '42 zł' },
  { name: 'Italicus Spritz', desc: 'Italicus / Martini Prosecco / Woda gazowana', price: '46 zł' },
  { name: 'Rose Spritz', desc: 'Malfy Rosa / Martini Prosecco / Woda gazowana', price: '42 zł' },
  { name: 'Lillet Blanc Spritz', desc: 'Lillet Blanc / Martini Prosecco / Woda gazowana', price: '42 zł' },
  { name: 'Lillet Rosé Spritz', desc: 'Lillet Rosé / Martini Prosecco / Woda gazowana', price: '42 zł' },
  { name: 'Floral Spritz', price: '42 zł' },
  { name: 'Porn Star Martini', desc: 'Ostoya / Marakuja / Wanilia / Martini Prosecco', vol: '120 ml', price: '44 zł' },
  { name: 'Cosmopolitan', desc: 'Absolut / Triple Sec / Żurawina / Limonka', price: '42 zł' },
  { name: 'Dry Martini', desc: 'Beefeater 24 / Martini Dry', price: '44 zł' },
  { name: 'Negroni', desc: 'Beefeater 24 / Czerwony wermut / Martini Bitter / Skórka pomarańczy', vol: '120 ml', price: '44 zł' },
  { name: 'Manhattan', desc: 'Chivas XII / Martini Rosso / Angostura Bitters', price: '44 zł' },
  { name: 'Old Fashioned', desc: 'Chivas XV / Cukier / Angostura Bitters / Skórka pomarańczy', vol: '80 ml', price: '48 zł' },
  { name: 'Whisky Sour', desc: 'Chivas XII / Cytryna / Cukier / Egg White / Angostura Bitters / Olejki pomarańczy', vol: '130 ml', price: '42 zł' },
  { name: 'Clover Club', desc: 'Beefeater 24 / Malina / Cytryna / Egg White', price: '42 zł' },
  { name: 'Jasmine', desc: 'Beefeater 24 / Triple Sec / Martini Bitter / Cytryna', price: '44 zł' },
  { name: 'Gin + Tonic', desc: 'Beefeater 24 / 3 Cents Tonic / Cytrusy', vol: '200 ml', price: '39 zł' },
  { name: 'Bloody Mary', desc: 'Ostoya / Sok pomidorowy / Cytryna / Przyprawy', price: '44 zł' },
  { name: 'Margarita', desc: 'Olmeca Silver / Triple Sec / Limonka', price: '44 zł' },
  { name: 'Paloma', desc: 'Altos Plata / Grejpfrut / Limonka / Woda gazowana', price: '42 zł' },
  { name: 'Daiquiri', desc: 'Havana 7 / Limonka / Cukier', vol: '120 ml', price: '39 zł' },
  { name: 'Mojito', desc: 'Havana 7 / Limonka / Mięta / Cukier / Woda gazowana', price: '42 zł' },
  { name: 'Old Cuban', desc: 'Havana 7 / Mięta / Limonka / Cukier / Angostura Bitters / Martini Prosecco', price: '42 zł' },
  { name: 'Cuba Libre', desc: 'Havana 7 / Limonka / Coca-Cola', vol: '200 ml', price: '39 zł' },
  { name: 'Caipirinha', desc: 'Leblon / Limonka / Cukier', price: '42 zł' },
  { name: 'Mai Tai', desc: 'Havana 7 / Banks 5 / Triple Sec / Limonka / Orgeat', price: '44 zł' },
  { name: 'Piña Colada', desc: 'Havana 3 / Ananas / Krem kokosowy', price: '44 zł' },
  { name: 'Jungle Bird', desc: 'Havana 7 / Martini Bitter / Ananas / Limonka', price: '44 zł' },
  { name: "Dark 'n' Stormy", desc: 'Santa Teresa / Piwo imbirowe / Limonka', price: '44 zł' },
  { name: 'Chivas Mule', desc: 'Chivas XII / Piwo imbirowe / Limonka', price: '46 zł' },
  { name: 'Sicilian Mule', price: '38 zł' },
  { name: 'Old Gal', price: '46 zł' },
  { name: 'Long Island Iced Tea', desc: 'Ostoya / Beefeater 24 / Havana 3 / Olmeca Silver / Triple Sec / Coca-Cola / Limonka', vol: '180 ml', price: '52 zł' },
];

// Alcohol-free — mocktails + 0% spirits/aperitifs/sparkling.
export const mocktails: Item[] = [
  { name: 'Mojito 0%', desc: 'Limonka / Mięta / Cukier / Woda gazowana', price: '38 zł' },
  { name: 'Cosmo 0%', desc: 'Żurawina / Limonka / Cytrusy', price: '38 zł' },
  { name: 'Piña Colada 0%', desc: 'Ananas / Krem kokosowy', price: '38 zł' },
  { name: 'Post', price: '38 zł' },
  { name: 'Like a Virgin', price: '38 zł' },
  { name: 'In Rainbows', price: '38 zł' },
  { name: 'Sober Club', price: '38 zł' },
];
export const spirits0: Item[] = [
  { name: 'Beefeater 0%', vol: '4 cl', price: '22 zł' },
  { name: 'Martini Vibrante', vol: '4 cl', price: '18 zł' },
  { name: 'Martini Floreale', vol: '4 cl', price: '18 zł' },
  { name: 'Prosecco 0%', vol: '150 / 750 ml', price: '25 / 120 zł' },
];

// Spirits — 4 cl pours behind foldable sections. Bottle prices live in Bottle
// service, so these rows stay name + price only.
export const wodka: Item[] = [
  { name: 'Ostoya', price: '22 zł' },
  { name: 'Ostoya Black', price: '24 zł' },
  { name: 'Absolut', price: '22 zł' },
  { name: 'Absolut Lime', price: '24 zł' },
  { name: 'Absolut Grapefruit', price: '24 zł' },
  { name: 'Absolut Pear', price: '24 zł' },
  { name: 'Absolut Currant', price: '24 zł' },
  { name: 'Grey Goose', price: '30 zł' },
  { name: 'Grey Goose Altius', price: '68 zł' },
];
export const gin: Item[] = [
  { name: 'Beefeater', price: '22 zł' },
  { name: 'Beefeater 24', price: '28 zł' },
  { name: 'Beefeater Blood Orange', price: '22 zł' },
  { name: 'Beefeater Pink', price: '22 zł' },
  { name: 'Malfy', price: '26 zł' },
  { name: 'Malfy con Limone', price: '26 zł' },
  { name: 'Malfy Arancia', price: '26 zł' },
  { name: 'Malfy Rosa', price: '26 zł' },
  { name: 'Bombay Cru', price: '35 zł' },
  { name: 'Monkey 47', price: '50 zł' },
  { name: 'Monkey 47 Sloe', price: '50 zł' },
  { name: 'Ki No Bi', price: '36 zł' },
  { name: 'Ki No Bi Sei', price: '42 zł' },
  { name: 'Ki No Tea', price: '46 zł' },
];
export type WhiskyGroup = 'irish' | 'scotch' | 'japanese' | 'bourbon';
export const whisky: (Item & { group: WhiskyGroup })[] = [
  { group: 'irish', name: 'Jameson', price: '24 zł' },
  { group: 'irish', name: 'Jameson Black Barrel', price: '32 zł' },
  { group: 'irish', name: 'Jameson Crested', price: '26 zł' },
  { group: 'irish', name: 'Jameson Caskmates IPA', price: '26 zł' },
  { group: 'irish', name: 'Jameson Caskmates Stout', price: '26 zł' },
  { group: 'irish', name: 'Jameson Single Pot Still', price: '48 zł' },
  { group: 'irish', name: 'Redbreast 12', price: '54 zł' },
  { group: 'scotch', name: 'Chivas XII', price: '28 zł' },
  { group: 'scotch', name: 'Chivas XIII', price: '32 zł' },
  { group: 'scotch', name: 'Chivas XV', price: '38 zł' },
  { group: 'scotch', name: 'Chivas XVIII', price: '65 zł' },
  { group: 'scotch', name: 'Chivas XX', price: '120 zł' },
  { group: 'scotch', name: 'Chivas XXI', price: '150 zł' },
  { group: 'scotch', name: 'Chivas XXV', price: '220 zł' },
  { group: 'scotch', name: 'Chivas Crystal', price: '26 zł' },
  { group: 'scotch', name: 'Glenlivet 12', price: '38 zł' },
  { group: 'scotch', name: 'Glenlivet 15', price: '56 zł' },
  { group: 'scotch', name: 'Glenlivet 18', price: '82 zł' },
  { group: 'scotch', name: 'Aberlour 12', price: '44 zł' },
  { group: 'scotch', name: 'Aberlour 14', price: '66 zł' },
  { group: 'scotch', name: "Aberlour A'bunadh Alba", price: '84 zł' },
  { group: 'scotch', name: 'Aberfeldy 12', price: '36 zł' },
  { group: 'scotch', name: 'Aberfeldy 16', price: '60 zł' },
  { group: 'scotch', name: 'Aberfeldy 21', price: '150 zł' },
  { group: 'scotch', name: 'Royal Brackla', price: '76 zł' },
  { group: 'scotch', name: 'The Deacon', price: '30 zł' },
  { group: 'japanese', name: 'Fuji Single Malt', price: '76 zł' },
  { group: 'japanese', name: 'Fuji Single Grain', price: '76 zł' },
  { group: 'japanese', name: 'Fuji Blend', price: '64 zł' },
  { group: 'bourbon', name: "Jefferson's", price: '32 zł' },
  { group: 'bourbon', name: "Angel's Envy", price: '50 zł' },
];
export const rum: Item[] = [
  { name: 'Havana 3', price: '22 zł' },
  { name: 'Havana Especial', price: '24 zł' },
  { name: 'Havana 7', price: '28 zł' },
  { name: 'Havana Selección de Maestros', price: '48 zł' },
  { name: 'Havana 15 Iconica', price: '150 zł' },
  { name: 'Bumbu Original', price: '32 zł' },
  { name: 'Bumbu XO', price: '38 zł' },
  { name: 'Banks 5', price: '38 zł' },
  { name: 'Santa Teresa 1796', price: '44 zł' },
  { name: 'Leblon', desc: 'Cachaça', price: '32 zł' },
];
export const tequila: Item[] = [
  { name: 'Olmeca Silver', price: '22 zł' },
  { name: 'Olmeca Gold', price: '24 zł' },
  { name: 'Altos Plata', price: '30 zł' },
  { name: 'Altos Reposado', price: '32 zł' },
  { name: 'Patrón Silver', price: '38 zł' },
  { name: 'Patrón Reposado', price: '44 zł' },
  { name: 'Patrón Añejo', price: '48 zł' },
  { name: 'Patrón XO Cafe', price: '44 zł' },
  { name: 'Patrón El Cielo', price: '130 zł' },
  { name: 'Patrón El Alto', price: '165 zł' },
];
export const koniak: Item[] = [
  { name: 'Martell VS', price: '35 zł' },
  { name: 'Martell VSOP', price: '48 zł' },
  { name: 'Martell XO', price: '160 zł' },
];
export const likiery: Item[] = [
  { name: 'St-Germain', price: '28 zł' },
  { name: 'Italicus', price: '32 zł' },
  { name: 'Triple Sec', price: '18 zł' },
  { name: 'Kahlúa', price: '18 zł' },
  { name: 'Jägermeister', price: '22 zł' },
  { name: 'Bumbu Crème', price: '28 zł' },
];
export const wermuty: Item[] = [
  { name: 'Martini Bianco', price: '18 zł' },
  { name: 'Martini Rosso', price: '18 zł' },
  { name: 'Martini Dry', price: '18 zł' },
  { name: 'Martini Fiero', price: '18 zł' },
  { name: 'Martini Rubino', price: '20 zł' },
  { name: 'Martini Ambrato', price: '20 zł' },
  { name: 'Martini Bitter', price: '20 zł' },
  { name: 'Lillet Blanc', price: '18 zł' },
  { name: 'Lillet Rosé', price: '18 zł' },
];

// Bottle service — full bottles, grouped by spirit. Reuses the spirit section
// labels as subsection headers.
export type BottleGroup = 'vodka' | 'whisky' | 'tequila' | 'rum' | 'liqueur';
export const bottleService: { name: string; vol: string; price: string; group: BottleGroup }[] = [
  { group: 'vodka', name: 'Ostoya', vol: '700 ml', price: '269 zł' },
  { group: 'vodka', name: 'Ostoya Black', vol: '700 ml', price: '289 zł' },
  { group: 'vodka', name: 'Grey Goose', vol: '700 ml', price: '400 zł' },
  { group: 'vodka', name: 'Grey Goose Altius', vol: '700 ml', price: '790 zł' },
  { group: 'vodka', name: 'Grey Goose Aurora', vol: '1,75 l', price: '890 zł' },
  { group: 'whisky', name: 'Chivas XII', vol: '700 ml', price: '379 zł' },
  { group: 'whisky', name: 'Chivas XV', vol: '700 ml', price: '450 zł' },
  { group: 'whisky', name: 'Chivas XVIII', vol: '700 ml', price: '630 zł' },
  { group: 'whisky', name: 'Chivas Crystal', vol: '700 ml', price: '379 zł' },
  { group: 'tequila', name: 'Patrón Silver', vol: '700 ml', price: '630 zł' },
  { group: 'tequila', name: 'Patrón Reposado', vol: '700 ml', price: '730 zł' },
  { group: 'tequila', name: 'Patrón Añejo', vol: '700 ml', price: '800 zł' },
  { group: 'rum', name: 'Bumbu Original', vol: '700 ml', price: '420 zł' },
  { group: 'rum', name: 'Bumbu XO', vol: '700 ml', price: '480 zł' },
  { group: 'liqueur', name: 'Jägermeister', vol: '700 ml', price: '350 zł' },
];

export const napoje: Item[] = [
  { name: 'Coca-Cola / Coca-Cola Zero', vol: '250 ml', price: '13 zł' },
  { name: 'Coca-Cola', vol: '150 ml', price: '10 zł' },
  { name: 'Sprite / Fanta', vol: '250 ml', price: '13 zł' },
  { name: 'Cappy', desc: 'Grejpfrut / Jabłko / Multiwitamina', vol: '250 ml', price: '13 zł' },
  { name: 'Fuze Tea', desc: 'Brzoskwinia / Hibiskus / Cytryna', vol: '250 ml', price: '15 zł' },
  { name: 'Red Bull', desc: 'Original / Sugar Free / Tropical / Peach', vol: '250 ml', price: '16 zł' },
  { name: '3 Cents', desc: 'Tonic / Aegean Tonic / Grapefruit / Cherry / Lemonade', vol: '250 ml', price: '14 zł' },
  { name: 'Karafka lemoniady', vol: '1000 ml', price: '30 zł' },
  { name: 'Kropla Beskidu', desc: 'Woda mineralna niegazowana', vol: '300 ml', price: '10 zł' },
  { name: 'Délice', desc: 'Woda mineralna gazowana', vol: '300 ml', price: '10 zł' },
];

export const piwoLane: Item[] = [
  { name: 'Stella Artois', desc: 'Belgian lager · 5%', vol: '330 / 500 ml', price: '20 / 22 zł' },
  { name: 'Hoegaarden', desc: 'Belgian wheat ale · 4.9%', vol: '330 / 500 ml', price: '22 / 25 zł' },
  { name: 'Leffe Blonde', desc: 'Belgian blonde ale · 6.5%', vol: '330 / 500 ml', price: '25 / 33 zł' },
];

export const piwoButelkowe: Item[] = [
  { name: 'Corona Extra', desc: 'Mexican lager · 4.5%', price: '20 zł' },
  { name: 'Corona Cero', desc: 'Mexican lager · 0%', price: '20 zł' },
  { name: 'Leffe', desc: 'Belgian ale · Blonde 6.6% / Brune 6.5%', price: '22 zł' },
  { name: "Beck's", desc: 'German lager · 5%', price: '20 zł' },
  { name: 'Bud', desc: 'American lager · 5%', price: '20 zł' },
];

// The homepage and full menu share the same pours, garnish and spirit glyphs.
export const ICONS: Record<string, string> = DRINK_ICONS;
