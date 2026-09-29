/* Venue truth: the full menu.

   Every bar section and The Cork's food, with prices as numbers in PLN and
   volumes as numbers in ml. The strings the site prints ("44 zł", "4 cl",
   "20 / 22 zł") are rebuilt by format.ts.

   Written by the Phase 3a migration from src/data/bar-menu.ts, src/data/food-menu.ts,
   src/components/pages/MenuPage.astro and the dictionaries at repo commit f8ccc58;
   each fact cites the line it came from. Edit by hand from now on.

   abvPercent, allergens and tags are Gaps: no source provides allergens or taste
   tags, and only the eight beers state an ABV (in their description text). */

import { gap, l10n, pending } from './facts';
import { formatVolume } from './format';
import type {
  AbvValue, Dish, FoodSection, LineRef, Locale, Menu, MenuItem, MenuSection, Portion, PriceOption, VolumeUnit, WineInfo,
} from './types';

const BAR = 'src/data/bar-menu.ts';
const FOOD = 'src/data/food-menu.ts';
const at = (line: number): LineRef => `${BAR}:${line}`;
const atFood = (line: number): LineRef => `${FOOD}:${line}`;

/** ASCII id from a name: "Piña Colada" -> "pina-colada". */
export function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** `[PLN]`, `[PLN, ml]` or `[PLN, ml, printedUnit]`. */
type Size = readonly [zl: number, ml?: number, unit?: VolumeUnit];

interface Extra {
  readonly tokens?: readonly string[];
  readonly group?: string;
  readonly abv?: AbvValue;
  readonly abvQuote?: string;
  readonly wine?: WineInfo;
  /** Line that states the volume, when it is not the item's own line. */
  readonly volLine?: number;
}

function drink(section: string, name: string, line: number, sizes: readonly Size[], extra: Extra = {}): MenuItem {
  const ref = at(line);
  const paired = sizes.length > 1 ? { note: 'Sizes and prices are paired by position in the source ("a / b").' } : {};
  const options: PriceOption[] = sizes.map(([zl, ml, unit]) => {
    const printed: VolumeUnit = unit ?? 'ml';
    const needsQuote = printed !== 'ml' || extra.volLine !== undefined;
    return {
      pricePln: pending(zl, ref, paired),
      ...(ml === undefined
        ? {}
        : {
            volumeMl: pending(ml, at(extra.volLine ?? line), needsQuote ? { quote: formatVolume(ml, printed) } : {}),
            volumeUnit: printed,
          }),
    };
  });
  return {
    id: `${section}/${slug(name)}`,
    name: pending(name, ref),
    ...(extra.tokens ? { descTokens: pending(extra.tokens, ref) } : {}),
    ...(extra.group ? { group: extra.group } : {}),
    options,
    ...(extra.wine ? { wine: extra.wine } : {}),
    abvPercent:
      extra.abv === undefined
        ? gap('ABV')
        : pending(extra.abv, ref, extra.abvQuote ? { quote: extra.abvQuote } : {}),
    allergens: gap('ALLERGENS'),
    tags: gap('TASTE_TAGS'),
  };
}

function wine(line: number, info: WineInfoInput): WineInfo {
  const ref = at(line);
  return {
    winery: pending(info.winery, ref),
    category: info.category,
    ...(info.dryness ? { dryness: pending(info.dryness, ref) } : {}),
    ...(info.grapes ? { grapes: pending(info.grapes, ref) } : {}),
    ...(info.region ? { region: pending(info.region, ref) } : {}),
    ...(info.vintage ? { vintage: pending(info.vintage, ref) } : {}),
    ...(info.featured ? { featured: pending(true, ref, { quote: 'featured: true' }) } : {}),
  };
}
interface WineInfoInput {
  winery: string;
  category: 'white' | 'red' | 'roseOrange';
  dryness?: 'dry' | 'semiDry';
  grapes?: readonly string[];
  region?: string;
  vintage?: string;
  featured?: boolean;
}

function section(id: string, title: MenuSection['title'], items: readonly MenuItem[], extra: Omit<MenuSection, 'id' | 'title' | 'items'> = {}): MenuSection {
  return { id, title, ...extra, items };
}

/** Ingredient and beer-style words in the four other languages, keyed by the source word
    (Polish for ingredients, English for beer styles). Same table as INGREDIENTS in bar-menu.ts. */
const GLOSSARY: Menu['glossary'] = {
  'Limonka': pending({ en: 'Lime', de: 'Limette', it: 'Lime', cs: 'Limetka' }, at(14), { quote: ['Limonka', 'Lime', 'Limette', 'Lime', 'Limetka'] }),
  'Mięta': pending({ en: 'Mint', de: 'Minze', it: 'Menta', cs: 'Máta' }, at(15), { quote: ['Mięta', 'Mint', 'Minze', 'Menta', 'Máta'] }),
  'Woda gazowana': pending({ en: 'Sparkling water', de: 'Sodawasser', it: 'Acqua frizzante', cs: 'Sodová voda' }, at(16), { quote: ['Woda gazowana', 'Sparkling water', 'Sodawasser', 'Acqua frizzante', 'Sodová voda'] }),
  'Pomarańcze': pending({ en: 'Oranges', de: 'Orangen', it: 'Arance', cs: 'Pomeranče' }, at(17), { quote: ['Pomarańcze', 'Oranges', 'Orangen', 'Arance', 'Pomeranče'] }),
  'Marakuja': pending({ en: 'Passion fruit', de: 'Maracuja', it: 'Frutto della passione', cs: 'Marakuja' }, at(18), { quote: ['Marakuja', 'Passion fruit', 'Maracuja', 'Frutto della passione', 'Marakuja'] }),
  'Wanilia': pending({ en: 'Vanilla', de: 'Vanille', it: 'Vaniglia', cs: 'Vanilka' }, at(19), { quote: ['Wanilia', 'Vanilla', 'Vanille', 'Vaniglia', 'Vanilka'] }),
  'Cytryna': pending({ en: 'Lemon', de: 'Zitrone', it: 'Limone', cs: 'Citron' }, at(20), { quote: ['Cytryna', 'Lemon', 'Zitrone', 'Limone', 'Citron'] }),
  'Cukier': pending({ en: 'Sugar', de: 'Zucker', it: 'Zucchero', cs: 'Cukr' }, at(21), { quote: ['Cukier', 'Sugar', 'Zucker', 'Zucchero', 'Cukr'] }),
  'Egg White': pending({ en: 'Egg white', de: 'Eiweiß', it: 'Albume', cs: 'Bílek' }, at(22), { quote: ['Egg White', 'Egg white', 'Eiweiß', 'Albume', 'Bílek'] }),
  'Olejki pomarańczy': pending({ en: 'Orange oils', de: 'Orangenöl', it: 'Oli d\'arancia', cs: 'Pomerančový olej' }, at(23), { quote: ['Olejki pomarańczy', 'Orange oils', 'Orangenöl', 'Oli d\'arancia', 'Pomerančový olej'] }),
  'Skórka pomarańczy': pending({ en: 'Orange peel', de: 'Orangenschale', it: 'Scorza d\'arancia', cs: 'Pomerančová kůra' }, at(24), { quote: ['Skórka pomarańczy', 'Orange peel', 'Orangenschale', 'Scorza d\'arancia', 'Pomerančová kůra'] }),
  'Cytrusy': pending({ en: 'Citrus', de: 'Zitrusfrüchte', it: 'Agrumi', cs: 'Citrusy' }, at(25), { quote: ['Cytrusy', 'Citrus', 'Zitrusfrüchte', 'Agrumi', 'Citrusy'] }),
  'Czerwony wermut': pending({ en: 'Red vermouth', de: 'Roter Wermut', it: 'Vermouth rosso', cs: 'Červený vermut' }, at(26), { quote: ['Czerwony wermut', 'Red vermouth', 'Roter Wermut', 'Vermouth rosso', 'Červený vermut'] }),
  'Żurawina': pending({ en: 'Cranberry', de: 'Cranberry', it: 'Mirtillo rosso', cs: 'Brusinka' }, at(27), { quote: ['Żurawina', 'Cranberry', 'Cranberry', 'Mirtillo rosso', 'Brusinka'] }),
  'Ananas': pending({ en: 'Pineapple', de: 'Ananas', it: 'Ananas', cs: 'Ananas' }, at(28), { quote: ['Ananas', 'Pineapple', 'Ananas', 'Ananas', 'Ananas'] }),
  'Krem kokosowy': pending({ en: 'Coconut cream', de: 'Kokoscreme', it: 'Crema di cocco', cs: 'Kokosový krém' }, at(29), { quote: ['Krem kokosowy', 'Coconut cream', 'Kokoscreme', 'Crema di cocco', 'Kokosový krém'] }),
  'Malina': pending({ en: 'Raspberry', de: 'Himbeere', it: 'Lampone', cs: 'Malina' }, at(30), { quote: ['Malina', 'Raspberry', 'Himbeere', 'Lampone', 'Malina'] }),
  'Sok pomidorowy': pending({ en: 'Tomato juice', de: 'Tomatensaft', it: 'Succo di pomodoro', cs: 'Rajčatový džus' }, at(31), { quote: ['Sok pomidorowy', 'Tomato juice', 'Tomatensaft', 'Succo di pomodoro', 'Rajčatový džus'] }),
  'Przyprawy': pending({ en: 'Spices', de: 'Gewürze', it: 'Spezie', cs: 'Koření' }, at(32), { quote: ['Przyprawy', 'Spices', 'Gewürze', 'Spezie', 'Koření'] }),
  'Orgeat': pending({ en: 'Orgeat', de: 'Orgeat', it: 'Orzata', cs: 'Orgeat' }, at(33), { quote: ['Orgeat', 'Orgeat', 'Orgeat', 'Orzata', 'Orgeat'] }),
  'Piwo imbirowe': pending({ en: 'Ginger beer', de: 'Ginger Beer', it: 'Ginger beer', cs: 'Zázvorové pivo' }, at(34), { quote: ['Piwo imbirowe', 'Ginger beer', 'Ginger Beer', 'Ginger beer', 'Zázvorové pivo'] }),
  'Cachaça': pending({ en: 'Cachaça', de: 'Cachaça', it: 'Cachaça', cs: 'Cachaça' }, at(35), { quote: ['Cachaça', 'Cachaça', 'Cachaça', 'Cachaça', 'Cachaça'] }),
  'Jabłko': pending({ en: 'Apple', de: 'Apfel', it: 'Mela', cs: 'Jablko' }, at(36), { quote: ['Jabłko', 'Apple', 'Apfel', 'Mela', 'Jablko'] }),
  'Woda mineralna niegazowana': pending({ en: 'Still mineral water', de: 'Stilles Mineralwasser', it: 'Acqua minerale naturale', cs: 'Neperlivá minerální voda' }, at(37), { quote: ['Woda mineralna niegazowana', 'Still mineral water', 'Stilles Mineralwasser', 'Acqua minerale naturale', 'Neperlivá minerální voda'] }),
  'Woda mineralna gazowana': pending({ en: 'Sparkling mineral water', de: 'Mineralwasser mit Kohlensäure', it: 'Acqua minerale frizzante', cs: 'Perlivá minerální voda' }, at(38), { quote: ['Woda mineralna gazowana', 'Sparkling mineral water', 'Mineralwasser mit Kohlensäure', 'Acqua minerale frizzante', 'Perlivá minerální voda'] }),
  'Brzoskwinia': pending({ en: 'Peach', de: 'Pfirsich', it: 'Pesca', cs: 'Broskev' }, at(39), { quote: ['Brzoskwinia', 'Peach', 'Pfirsich', 'Pesca', 'Broskev'] }),
  'Hibiskus': pending({ en: 'Hibiscus', de: 'Hibiskus', it: 'Ibisco', cs: 'Ibišek' }, at(40), { quote: ['Hibiskus', 'Hibiscus', 'Hibiskus', 'Ibisco', 'Ibišek'] }),
  'Multiwitamina': pending({ en: 'Multivitamin', de: 'Multivitamin', it: 'Multivitaminico', cs: 'Multivitamin' }, at(41), { quote: ['Multiwitamina', 'Multivitamin', 'Multivitamin', 'Multivitaminico', 'Multivitamin'] }),
  'Grejpfrut': pending({ en: 'Grapefruit', de: 'Grapefruit', it: 'Pompelmo', cs: 'Grapefruit' }, at(42), { quote: ['Grejpfrut', 'Grapefruit', 'Grapefruit', 'Pompelmo', 'Grapefruit'] }),
  'Belgian lager': pending({ pl: 'lager belgijski', en: 'Belgian lager', de: 'belgisches Lager', it: 'lager belga', cs: 'belgický ležák' }, at(44), { quote: ['Belgian lager', 'lager belgijski', 'Belgian lager', 'belgisches Lager', 'lager belga', 'belgický ležák'] }),
  'Belgian wheat ale': pending({ pl: 'belgijskie piwo pszeniczne', en: 'Belgian wheat ale', de: 'belgisches Weißbier', it: 'birra di frumento belga', cs: 'belgické pšeničné pivo' }, at(45), { quote: ['Belgian wheat ale', 'belgijskie piwo pszeniczne', 'Belgian wheat ale', 'belgisches Weißbier', 'birra di frumento belga', 'belgické pšeničné pivo'] }),
  'Belgian blonde ale': pending({ pl: 'belgijski jasny ale', en: 'Belgian blonde ale', de: 'belgisches Blond Ale', it: 'blonde ale belga', cs: 'belgický světlý ale' }, at(46), { quote: ['Belgian blonde ale', 'belgijski jasny ale', 'Belgian blonde ale', 'belgisches Blond Ale', 'blonde ale belga', 'belgický světlý ale'] }),
  'Belgian ale': pending({ pl: 'ale belgijski', en: 'Belgian ale', de: 'belgisches Ale', it: 'ale belga', cs: 'belgický ale' }, at(47), { quote: ['Belgian ale', 'ale belgijski', 'Belgian ale', 'belgisches Ale', 'ale belga', 'belgický ale'] }),
  'Mexican lager': pending({ pl: 'lager meksykański', en: 'Mexican lager', de: 'mexikanisches Lager', it: 'lager messicano', cs: 'mexický ležák' }, at(48), { quote: ['Mexican lager', 'lager meksykański', 'Mexican lager', 'mexikanisches Lager', 'lager messicano', 'mexický ležák'] }),
  'German lager': pending({ pl: 'lager niemiecki', en: 'German lager', de: 'deutsches Lager', it: 'lager tedesco', cs: 'německý ležák' }, at(49), { quote: ['German lager', 'lager niemiecki', 'German lager', 'deutsches Lager', 'lager tedesco', 'německý ležák'] }),
  'American lager': pending({ pl: 'lager amerykański', en: 'American lager', de: 'amerikanisches Lager', it: 'lager americano', cs: 'americký ležák' }, at(50), { quote: ['American lager', 'lager amerykański', 'American lager', 'amerikanisches Lager', 'lager americano', 'americký ležák'] }),
};

/** The description a row shows in a locale: tokens localised through GLOSSARY, joined with " / ",
    then the ABV for beers as "style · 5%". Mirrors localizeDesc() in bar-menu.ts. */
export function describeItem(item: MenuItem, locale: Locale, glossary: Menu['glossary'] = GLOSSARY, withAbv = false): string {
  const tokens = item.descTokens?.value ?? [];
  const base = tokens.map((token) => glossary[token]?.value[locale] ?? token).join(' / ');
  const abv = withAbv && item.abvPercent.value !== null ? abvText(item.abvPercent.value) : '';
  return [base, abv].filter(Boolean).join(' · ');
}

/** `5` -> "5%"; `{ Blonde: 6.6, Brune: 6.5 }` -> "Blonde 6.6% / Brune 6.5%". */
export function abvText(value: AbvValue): string {
  if (typeof value === 'number') return `${value}%`;
  return Object.entries(value).map(([variant, percent]) => `${variant} ${percent}%`).join(' / ');
}

/** Martini Prosecco is typed into MenuPage.astro, not into bar-menu.ts. */
function prosecco(): MenuItem {
  const name = 'src/components/pages/MenuPage.astro:113' as const;
  const price = 'src/components/pages/MenuPage.astro:114' as const;
  return {
    id: 'champagne/martini-prosecco',
    name: pending('Martini Prosecco', name),
    group: 'Prosecco',
    options: [
      { pricePln: pending(25, price), volumeMl: pending(150, price), volumeUnit: 'ml' },
      { pricePln: pending(120, price), volumeMl: pending(750, price), volumeUnit: 'ml' },
    ],
    abvPercent: gap('ABV'),
    allergens: gap('ALLERGENS'),
    tags: gap('TASTE_TAGS'),
  };
}

const GLASS_LINE = at(84);
const BOTTLE_LINE = at(85);

/** A wine: 750 ml bottle always, 150 ml glass only for Halka and Triada. */
function wineItem(
  name: string,
  line: number,
  hasGlass: boolean,
  glassZl: number,
  bottleZl: number,
  info: WineInfoInput,
): MenuItem {
  const ref = at(line);
  const options: PriceOption[] = [];
  if (hasGlass) {
    options.push({ pricePln: pending(glassZl, ref), volumeMl: pending(150, GLASS_LINE, { quote: '150 ml' }), volumeUnit: 'ml' });
  }
  options.push({ pricePln: pending(bottleZl, ref), volumeMl: pending(750, BOTTLE_LINE, { quote: '750 ml' }), volumeUnit: 'ml' });
  return {
    id: `wines/${slug(name)}`,
    name: pending(name, ref),
    group: info.category,
    options,
    wine: wine(line, info),
    abvPercent: gap('ABV'),
    allergens: gap('ALLERGENS'),
    tags: gap('TASTE_TAGS'),
  };
}

const SECTIONS: readonly MenuSection[] = [
  section('cocktails', l10n({
    pl: ['Koktajle', 'src/i18n/ui/pl.ts:253'],
    en: ['Cocktails', 'src/i18n/ui/en.ts:246'],
    de: ['Cocktails', 'src/i18n/ui/de.ts:246'],
    it: ['Cocktail', 'src/i18n/ui/it.ts:245'],
    cs: ['Koktejly', 'src/i18n/ui/cs.ts:246'],
  }), [
    drink('cocktails', 'Hugo Spritz', 150, [[44, 160]], { tokens: ['St-Germain', 'Limonka', 'Mięta', 'Martini Prosecco', 'Woda gazowana'] }),
    drink('cocktails', 'Fiero Spritz', 151, [[42, 180]], { tokens: ['Martini Fiero', 'Martini Prosecco', 'Pomarańcze', 'Woda gazowana'] }),
    drink('cocktails', 'Italicus Spritz', 152, [[46]], { tokens: ['Italicus', 'Martini Prosecco', 'Woda gazowana'] }),
    drink('cocktails', 'Rose Spritz', 153, [[42]], { tokens: ['Malfy Rosa', 'Martini Prosecco', 'Woda gazowana'] }),
    drink('cocktails', 'Lillet Blanc Spritz', 154, [[42]], { tokens: ['Lillet Blanc', 'Martini Prosecco', 'Woda gazowana'] }),
    drink('cocktails', 'Lillet Rosé Spritz', 155, [[42]], { tokens: ['Lillet Rosé', 'Martini Prosecco', 'Woda gazowana'] }),
    drink('cocktails', 'Floral Spritz', 156, [[42]]),
    drink('cocktails', 'Porn Star Martini', 157, [[44, 120]], { tokens: ['Ostoya', 'Marakuja', 'Wanilia', 'Martini Prosecco'] }),
    drink('cocktails', 'Cosmopolitan', 158, [[42]], { tokens: ['Absolut', 'Triple Sec', 'Żurawina', 'Limonka'] }),
    drink('cocktails', 'Dry Martini', 159, [[44]], { tokens: ['Beefeater 24', 'Martini Dry'] }),
    drink('cocktails', 'Negroni', 160, [[44, 120]], { tokens: ['Beefeater 24', 'Czerwony wermut', 'Martini Bitter', 'Skórka pomarańczy'] }),
    drink('cocktails', 'Manhattan', 161, [[44]], { tokens: ['Chivas XII', 'Martini Rosso', 'Angostura Bitters'] }),
    drink('cocktails', 'Old Fashioned', 162, [[48, 80]], { tokens: ['Chivas XV', 'Cukier', 'Angostura Bitters', 'Skórka pomarańczy'] }),
    drink('cocktails', 'Whisky Sour', 163, [[42, 130]], { tokens: ['Chivas XII', 'Cytryna', 'Cukier', 'Egg White', 'Angostura Bitters', 'Olejki pomarańczy'] }),
    drink('cocktails', 'Clover Club', 164, [[42]], { tokens: ['Beefeater 24', 'Malina', 'Cytryna', 'Egg White'] }),
    drink('cocktails', 'Jasmine', 165, [[44]], { tokens: ['Beefeater 24', 'Triple Sec', 'Martini Bitter', 'Cytryna'] }),
    drink('cocktails', 'Gin + Tonic', 166, [[39, 200]], { tokens: ['Beefeater 24', '3 Cents Tonic', 'Cytrusy'] }),
    drink('cocktails', 'Bloody Mary', 167, [[44]], { tokens: ['Ostoya', 'Sok pomidorowy', 'Cytryna', 'Przyprawy'] }),
    drink('cocktails', 'Margarita', 168, [[44]], { tokens: ['Olmeca Silver', 'Triple Sec', 'Limonka'] }),
    drink('cocktails', 'Paloma', 169, [[42]], { tokens: ['Altos Plata', 'Grejpfrut', 'Limonka', 'Woda gazowana'] }),
    drink('cocktails', 'Daiquiri', 170, [[39, 120]], { tokens: ['Havana 7', 'Limonka', 'Cukier'] }),
    drink('cocktails', 'Mojito', 171, [[42]], { tokens: ['Havana 7', 'Limonka', 'Mięta', 'Cukier', 'Woda gazowana'] }),
    drink('cocktails', 'Old Cuban', 172, [[42]], { tokens: ['Havana 7', 'Mięta', 'Limonka', 'Cukier', 'Angostura Bitters', 'Martini Prosecco'] }),
    drink('cocktails', 'Cuba Libre', 173, [[39, 200]], { tokens: ['Havana 7', 'Limonka', 'Coca-Cola'] }),
    drink('cocktails', 'Caipirinha', 174, [[42]], { tokens: ['Leblon', 'Limonka', 'Cukier'] }),
    drink('cocktails', 'Mai Tai', 175, [[44]], { tokens: ['Havana 7', 'Banks 5', 'Triple Sec', 'Limonka', 'Orgeat'] }),
    drink('cocktails', 'Piña Colada', 176, [[44]], { tokens: ['Havana 3', 'Ananas', 'Krem kokosowy'] }),
    drink('cocktails', 'Jungle Bird', 177, [[44]], { tokens: ['Havana 7', 'Martini Bitter', 'Ananas', 'Limonka'] }),
    drink('cocktails', 'Dark \'n\' Stormy', 178, [[44]], { tokens: ['Santa Teresa', 'Piwo imbirowe', 'Limonka'] }),
    drink('cocktails', 'Chivas Mule', 179, [[46]], { tokens: ['Chivas XII', 'Piwo imbirowe', 'Limonka'] }),
    drink('cocktails', 'Sicilian Mule', 180, [[38]]),
    drink('cocktails', 'Old Gal', 181, [[46]]),
    drink('cocktails', 'Long Island Iced Tea', 182, [[52, 180]], { tokens: ['Ostoya', 'Beefeater 24', 'Havana 3', 'Olmeca Silver', 'Triple Sec', 'Coca-Cola', 'Limonka'] }),
  ]),
  section('nonAlcoholic', l10n({
    pl: ['Bez alkoholu', 'src/i18n/ui/pl.ts:254'],
    en: ['Alcohol-free', 'src/i18n/ui/en.ts:247'],
    de: ['Alkoholfrei', 'src/i18n/ui/de.ts:247'],
    it: ['Analcolici', 'src/i18n/ui/it.ts:246'],
    cs: ['Nealko', 'src/i18n/ui/cs.ts:247'],
  }), [
    drink('nonAlcoholic', 'Mojito 0%', 187, [[38]], { tokens: ['Limonka', 'Mięta', 'Cukier', 'Woda gazowana'], group: 'cocktails' }),
    drink('nonAlcoholic', 'Cosmo 0%', 188, [[38]], { tokens: ['Żurawina', 'Limonka', 'Cytrusy'], group: 'cocktails' }),
    drink('nonAlcoholic', 'Piña Colada 0%', 189, [[38]], { tokens: ['Ananas', 'Krem kokosowy'], group: 'cocktails' }),
    drink('nonAlcoholic', 'Post', 190, [[38]], { group: 'cocktails' }),
    drink('nonAlcoholic', 'Like a Virgin', 191, [[38]], { group: 'cocktails' }),
    drink('nonAlcoholic', 'In Rainbows', 192, [[38]], { group: 'cocktails' }),
    drink('nonAlcoholic', 'Sober Club', 193, [[38]], { group: 'cocktails' }),
    drink('nonAlcoholic', 'Beefeater 0%', 196, [[22, 40, 'cl']], { group: 'spirits' }),
    drink('nonAlcoholic', 'Martini Vibrante', 197, [[18, 40, 'cl']], { group: 'spirits' }),
    drink('nonAlcoholic', 'Martini Floreale', 198, [[18, 40, 'cl']], { group: 'spirits' }),
    drink('nonAlcoholic', 'Prosecco 0%', 199, [[25, 150], [120, 750]], { group: 'spirits' }),
  ], {
    groups: {
      cocktails: l10n({
        pl: ['Koktajle 0%', 'src/i18n/ui/pl.ts:272'],
        en: ['Mocktails', 'src/i18n/ui/en.ts:265'],
        de: ['Alkoholfreie Cocktails', 'src/i18n/ui/de.ts:265'],
        it: ['Mocktail', 'src/i18n/ui/it.ts:264'],
        cs: ['Nealko koktejly', 'src/i18n/ui/cs.ts:265'],
      }),
      spirits: l10n({
        pl: ['Alkohole 0%', 'src/i18n/ui/pl.ts:272'],
        en: ['Alcohol-free spirits', 'src/i18n/ui/en.ts:265'],
        de: ['Alkoholfreie Spirituosen', 'src/i18n/ui/de.ts:265'],
        it: ['Distillati analcolici', 'src/i18n/ui/it.ts:264'],
        cs: ['Nealko lihoviny', 'src/i18n/ui/cs.ts:265'],
      }),
    },
  }),
  section('vodka', l10n({
    pl: ['Wódka', 'src/i18n/ui/pl.ts:255'],
    en: ['Vodka', 'src/i18n/ui/en.ts:248'],
    de: ['Wodka', 'src/i18n/ui/de.ts:248'],
    it: ['Vodka', 'src/i18n/ui/it.ts:247'],
    cs: ['Vodka', 'src/i18n/ui/cs.ts:248'],
  }), [
    drink('vodka', 'Ostoya', 205, [[22]]),
    drink('vodka', 'Ostoya Black', 206, [[24]]),
    drink('vodka', 'Absolut', 207, [[22]]),
    drink('vodka', 'Absolut Lime', 208, [[24]]),
    drink('vodka', 'Absolut Grapefruit', 209, [[24]]),
    drink('vodka', 'Absolut Pear', 210, [[24]]),
    drink('vodka', 'Absolut Currant', 211, [[24]]),
    drink('vodka', 'Grey Goose', 212, [[30]]),
    drink('vodka', 'Grey Goose Altius', 213, [[68]]),
  ], { pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }) }),
  section('gin', l10n({
    pl: ['Gin', 'src/i18n/ui/pl.ts:256'],
    en: ['Gin', 'src/i18n/ui/en.ts:249'],
    de: ['Gin', 'src/i18n/ui/de.ts:249'],
    it: ['Gin', 'src/i18n/ui/it.ts:248'],
    cs: ['Gin', 'src/i18n/ui/cs.ts:249'],
  }), [
    drink('gin', 'Beefeater', 216, [[22]]),
    drink('gin', 'Beefeater 24', 217, [[28]]),
    drink('gin', 'Beefeater Blood Orange', 218, [[22]]),
    drink('gin', 'Beefeater Pink', 219, [[22]]),
    drink('gin', 'Malfy', 220, [[26]]),
    drink('gin', 'Malfy con Limone', 221, [[26]]),
    drink('gin', 'Malfy Arancia', 222, [[26]]),
    drink('gin', 'Malfy Rosa', 223, [[26]]),
    drink('gin', 'Bombay Cru', 224, [[35]]),
    drink('gin', 'Monkey 47', 225, [[50]]),
    drink('gin', 'Monkey 47 Sloe', 226, [[50]]),
    drink('gin', 'Ki No Bi', 227, [[36]]),
    drink('gin', 'Ki No Bi Sei', 228, [[42]]),
    drink('gin', 'Ki No Tea', 229, [[46]]),
  ], { pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }) }),
  section('whisky', l10n({
    pl: ['Whisky', 'src/i18n/ui/pl.ts:257'],
    en: ['Whisky', 'src/i18n/ui/en.ts:250'],
    de: ['Whisky', 'src/i18n/ui/de.ts:250'],
    it: ['Whisky', 'src/i18n/ui/it.ts:249'],
    cs: ['Whisky', 'src/i18n/ui/cs.ts:250'],
  }), [
    drink('whisky', 'Jameson', 233, [[24]], { group: 'irish' }),
    drink('whisky', 'Jameson Black Barrel', 234, [[32]], { group: 'irish' }),
    drink('whisky', 'Jameson Crested', 235, [[26]], { group: 'irish' }),
    drink('whisky', 'Jameson Caskmates IPA', 236, [[26]], { group: 'irish' }),
    drink('whisky', 'Jameson Caskmates Stout', 237, [[26]], { group: 'irish' }),
    drink('whisky', 'Jameson Single Pot Still', 238, [[48]], { group: 'irish' }),
    drink('whisky', 'Redbreast 12', 239, [[54]], { group: 'irish' }),
    drink('whisky', 'Chivas XII', 240, [[28]], { group: 'scotch' }),
    drink('whisky', 'Chivas XIII', 241, [[32]], { group: 'scotch' }),
    drink('whisky', 'Chivas XV', 242, [[38]], { group: 'scotch' }),
    drink('whisky', 'Chivas XVIII', 243, [[65]], { group: 'scotch' }),
    drink('whisky', 'Chivas XX', 244, [[120]], { group: 'scotch' }),
    drink('whisky', 'Chivas XXI', 245, [[150]], { group: 'scotch' }),
    drink('whisky', 'Chivas XXV', 246, [[220]], { group: 'scotch' }),
    drink('whisky', 'Chivas Crystal', 247, [[26]], { group: 'scotch' }),
    drink('whisky', 'Glenlivet 12', 248, [[38]], { group: 'scotch' }),
    drink('whisky', 'Glenlivet 15', 249, [[56]], { group: 'scotch' }),
    drink('whisky', 'Glenlivet 18', 250, [[82]], { group: 'scotch' }),
    drink('whisky', 'Aberlour 12', 251, [[44]], { group: 'scotch' }),
    drink('whisky', 'Aberlour 14', 252, [[66]], { group: 'scotch' }),
    drink('whisky', 'Aberlour A\'bunadh Alba', 253, [[84]], { group: 'scotch' }),
    drink('whisky', 'Aberfeldy 12', 254, [[36]], { group: 'scotch' }),
    drink('whisky', 'Aberfeldy 16', 255, [[60]], { group: 'scotch' }),
    drink('whisky', 'Aberfeldy 21', 256, [[150]], { group: 'scotch' }),
    drink('whisky', 'Royal Brackla', 257, [[76]], { group: 'scotch' }),
    drink('whisky', 'The Deacon', 258, [[30]], { group: 'scotch' }),
    drink('whisky', 'Fuji Single Malt', 259, [[76]], { group: 'japanese' }),
    drink('whisky', 'Fuji Single Grain', 260, [[76]], { group: 'japanese' }),
    drink('whisky', 'Fuji Blend', 261, [[64]], { group: 'japanese' }),
    drink('whisky', 'Jefferson\'s', 262, [[32]], { group: 'bourbon' }),
    drink('whisky', 'Angel\'s Envy', 263, [[50]], { group: 'bourbon' }),
  ], {
    pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }),
    groups: {
      irish: l10n({
        pl: ['Irlandzka', 'src/i18n/ui/pl.ts:271'],
        en: ['Irish', 'src/i18n/ui/en.ts:264'],
        de: ['Irisch', 'src/i18n/ui/de.ts:264'],
        it: ['Irlandese', 'src/i18n/ui/it.ts:263'],
        cs: ['Irská', 'src/i18n/ui/cs.ts:264'],
      }),
      scotch: l10n({
        pl: ['Szkocka', 'src/i18n/ui/pl.ts:271'],
        en: ['Scotch', 'src/i18n/ui/en.ts:264'],
        de: ['Schottisch', 'src/i18n/ui/de.ts:264'],
        it: ['Scozzese', 'src/i18n/ui/it.ts:263'],
        cs: ['Skotská', 'src/i18n/ui/cs.ts:264'],
      }),
      japanese: l10n({
        pl: ['Japońska', 'src/i18n/ui/pl.ts:271'],
        en: ['Japanese', 'src/i18n/ui/en.ts:264'],
        de: ['Japanisch', 'src/i18n/ui/de.ts:264'],
        it: ['Giapponese', 'src/i18n/ui/it.ts:263'],
        cs: ['Japonská', 'src/i18n/ui/cs.ts:264'],
      }),
      bourbon: l10n({
        pl: ['Bourbon', 'src/i18n/ui/pl.ts:271'],
        en: ['Bourbon', 'src/i18n/ui/en.ts:264'],
        de: ['Bourbon', 'src/i18n/ui/de.ts:264'],
        it: ['Bourbon', 'src/i18n/ui/it.ts:263'],
        cs: ['Bourbon', 'src/i18n/ui/cs.ts:264'],
      }),
    },
  }),
  section('rum', l10n({
    pl: ['Rum', 'src/i18n/ui/pl.ts:258'],
    en: ['Rum', 'src/i18n/ui/en.ts:251'],
    de: ['Rum', 'src/i18n/ui/de.ts:251'],
    it: ['Rum', 'src/i18n/ui/it.ts:250'],
    cs: ['Rum', 'src/i18n/ui/cs.ts:251'],
  }), [
    drink('rum', 'Havana 3', 266, [[22]]),
    drink('rum', 'Havana Especial', 267, [[24]]),
    drink('rum', 'Havana 7', 268, [[28]]),
    drink('rum', 'Havana Selección de Maestros', 269, [[48]]),
    drink('rum', 'Havana 15 Iconica', 270, [[150]]),
    drink('rum', 'Bumbu Original', 271, [[32]]),
    drink('rum', 'Bumbu XO', 272, [[38]]),
    drink('rum', 'Banks 5', 273, [[38]]),
    drink('rum', 'Santa Teresa 1796', 274, [[44]]),
    drink('rum', 'Leblon', 275, [[32]], { tokens: ['Cachaça'] }),
  ], { pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }) }),
  section('tequila', l10n({
    pl: ['Tequila', 'src/i18n/ui/pl.ts:259'],
    en: ['Tequila', 'src/i18n/ui/en.ts:252'],
    de: ['Tequila', 'src/i18n/ui/de.ts:252'],
    it: ['Tequila', 'src/i18n/ui/it.ts:251'],
    cs: ['Tequila', 'src/i18n/ui/cs.ts:252'],
  }), [
    drink('tequila', 'Olmeca Silver', 278, [[22]]),
    drink('tequila', 'Olmeca Gold', 279, [[24]]),
    drink('tequila', 'Altos Plata', 280, [[30]]),
    drink('tequila', 'Altos Reposado', 281, [[32]]),
    drink('tequila', 'Patrón Silver', 282, [[38]]),
    drink('tequila', 'Patrón Reposado', 283, [[44]]),
    drink('tequila', 'Patrón Añejo', 284, [[48]]),
    drink('tequila', 'Patrón XO Cafe', 285, [[44]]),
    drink('tequila', 'Patrón El Cielo', 286, [[130]]),
    drink('tequila', 'Patrón El Alto', 287, [[165]]),
  ], { pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }) }),
  section('champagne', l10n({
    pl: ['Szampan i musujące', 'src/i18n/ui/pl.ts:263'],
    en: ['Champagne & sparkling', 'src/i18n/ui/en.ts:256'],
    de: ['Champagner & Schaumwein', 'src/i18n/ui/de.ts:256'],
    it: ['Champagne e spumanti', 'src/i18n/ui/it.ts:255'],
    cs: ['Šampaňské a sekt', 'src/i18n/ui/cs.ts:256'],
  }), [
    drink('champagne', 'Grand Cordon', 132, [[69, 125], [420, 750], [900, 1500, 'l'], [2300, 3000, 'l']], { group: 'G. H. Mumm', volLine: 125 }),
    drink('champagne', 'Grand Cordon Rosé', 133, [[479, 750], [950, 1500, 'l']], { group: 'G. H. Mumm', volLine: 125 }),
    drink('champagne', 'Demi Sec', 134, [[450, 750]], { group: 'G. H. Mumm', volLine: 125 }),
    drink('champagne', 'Ice Xtra', 135, [[479, 750]], { group: 'G. H. Mumm', volLine: 125 }),
    drink('champagne', 'Grand Brut', 141, [[99, 125], [600, 750], [1500, 1500, 'l'], [4500, 3000, 'l']], { group: 'Perrier-Jouët', volLine: 125 }),
    drink('champagne', 'Blason Rosé', 142, [[650, 750]], { group: 'Perrier-Jouët', volLine: 125 }),
    drink('champagne', 'Blanc de Blancs', 143, [[700, 750]], { group: 'Perrier-Jouët', volLine: 125 }),
    drink('champagne', 'Belle Époque Brut 2015', 144, [[1700, 750]], { group: 'Perrier-Jouët', volLine: 125 }),
    prosecco(),
  ]),
  section('wines', l10n({
    pl: ['Karta win', 'src/i18n/ui/pl.ts:269'],
    en: ['Wine list', 'src/i18n/ui/en.ts:262'],
    de: ['Weinkarte', 'src/i18n/ui/de.ts:262'],
    it: ['Carta dei vini', 'src/i18n/ui/it.ts:261'],
    cs: ['Vinný lístek', 'src/i18n/ui/cs.ts:262'],
  }), [
    wineItem('Halka', 92, true, 37, 220, { winery: 'Winnica L\'Opera', category: 'white', dryness: 'semiDry', grapes: ['Chardonnay', 'Bronner', 'Muscaris'], region: 'Wzgórza Trzebnickie, Dolny Śląsk' }),
    wineItem('Hibernal', 93, false, 0, 330, { winery: 'Winnica Turnau', category: 'white', dryness: 'semiDry', grapes: ['Hibernal'], region: 'Baniewice, Pomorze Zachodnie' }),
    wineItem('Solaris', 94, false, 0, 360, { winery: 'Dom Charbielin', category: 'white', dryness: 'semiDry', grapes: ['Solaris'], region: 'Charbielin, Opolskie' }),
    wineItem('Chardonnay Barrique', 95, false, 0, 420, { winery: 'Winnica Płochockich', category: 'white', dryness: 'dry', grapes: ['Chardonnay'], region: 'Daromin, Świętokrzyskie', vintage: '2024', featured: true }),
    wineItem('Triada', 97, true, 40, 240, { winery: 'Winnica L\'Opera', category: 'red', dryness: 'dry', grapes: ['Baron', 'Cabernet Cantor', 'Cabernet Cortis'], region: 'Wzgórza Trzebnickie, Dolny Śląsk' }),
    wineItem('Rege', 98, false, 0, 330, { winery: 'Winnica Płochockich', category: 'red' }),
    wineItem('Pinot Noir', 99, false, 0, 420, { winery: 'Winnica Turnau', category: 'red', dryness: 'dry', grapes: ['Pinot Noir'], region: 'Baniewice, Pomorze Zachodnie' }),
    wineItem('Yacobus Orange', 101, false, 0, 390, { winery: 'Winnica Jakubów', category: 'roseOrange', dryness: 'dry', grapes: ['Hibernal', 'Riesling', 'Solaris', 'Traminer'], region: 'Wzgórza Dalkowskie, Dolny Śląsk' }),
    wineItem('Rosé', 102, false, 0, 330, { winery: 'Winnica Turnau', category: 'roseOrange', dryness: 'semiDry', grapes: ['Rondo', 'Regent'], region: 'Baniewice, Pomorze Zachodnie' }),
  ], {
    groups: {
      white: l10n({
        pl: ['Białe', at(107)],
        en: ['White', at(107)],
        de: ['Weiß', at(107)],
        it: ['Bianco', at(107)],
        cs: ['Bílé', at(107)],
      }),
      red: l10n({
        pl: ['Czerwone', at(108)],
        en: ['Red', at(108)],
        de: ['Rot', at(108)],
        it: ['Rosso', at(108)],
        cs: ['Červené', at(108)],
      }),
      roseOrange: l10n({
        pl: ['Różowe / Pomarańczowe', at(109)],
        en: ['Rosé / Orange', at(109)],
        de: ['Rosé / Orange', at(109)],
        it: ['Rosato / Arancione', at(109)],
        cs: ['Růžové / Oranžové', at(109)],
      }),
    },
  }),
  section('cognac', l10n({
    pl: ['Koniak', 'src/i18n/ui/pl.ts:260'],
    en: ['Cognac', 'src/i18n/ui/en.ts:253'],
    de: ['Cognac', 'src/i18n/ui/de.ts:253'],
    it: ['Cognac', 'src/i18n/ui/it.ts:252'],
    cs: ['Koňak', 'src/i18n/ui/cs.ts:253'],
  }), [
    drink('cognac', 'Martell VS', 290, [[35]]),
    drink('cognac', 'Martell VSOP', 291, [[48]]),
    drink('cognac', 'Martell XO', 292, [[160]]),
  ], { pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }) }),
  section('liqueurs', l10n({
    pl: ['Likiery', 'src/i18n/ui/pl.ts:261'],
    en: ['Liqueurs', 'src/i18n/ui/en.ts:254'],
    de: ['Liköre', 'src/i18n/ui/de.ts:254'],
    it: ['Liquori', 'src/i18n/ui/it.ts:253'],
    cs: ['Likéry', 'src/i18n/ui/cs.ts:254'],
  }), [
    drink('liqueurs', 'St-Germain', 295, [[28]]),
    drink('liqueurs', 'Italicus', 296, [[32]]),
    drink('liqueurs', 'Triple Sec', 297, [[18]]),
    drink('liqueurs', 'Kahlúa', 298, [[18]]),
    drink('liqueurs', 'Jägermeister', 299, [[22]]),
    drink('liqueurs', 'Bumbu Crème', 300, [[28]]),
  ], { pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }) }),
  section('vermouth', l10n({
    pl: ['Wermuty i aperitify', 'src/i18n/ui/pl.ts:262'],
    en: ['Vermouth & aperitifs', 'src/i18n/ui/en.ts:255'],
    de: ['Wermut & Aperitifs', 'src/i18n/ui/de.ts:255'],
    it: ['Vermouth e aperitivi', 'src/i18n/ui/it.ts:254'],
    cs: ['Vermuty a aperitivy', 'src/i18n/ui/cs.ts:255'],
  }), [
    drink('vermouth', 'Martini Bianco', 303, [[18]]),
    drink('vermouth', 'Martini Rosso', 304, [[18]]),
    drink('vermouth', 'Martini Dry', 305, [[18]]),
    drink('vermouth', 'Martini Fiero', 306, [[18]]),
    drink('vermouth', 'Martini Rubino', 307, [[20]]),
    drink('vermouth', 'Martini Ambrato', 308, [[20]]),
    drink('vermouth', 'Martini Bitter', 309, [[20]]),
    drink('vermouth', 'Lillet Blanc', 310, [[18]]),
    drink('vermouth', 'Lillet Rosé', 311, [[18]]),
  ], { pourMl: pending(40, 'src/i18n/ui/pl.ts:273', { quote: '4 cl' }) }),
  section('bottleService', l10n({
    pl: ['Bottle service', 'src/i18n/ui/pl.ts:264'],
    en: ['Bottle service', 'src/i18n/ui/en.ts:257'],
    de: ['Bottle-Service', 'src/i18n/ui/de.ts:257'],
    it: ['Bottle service', 'src/i18n/ui/it.ts:256'],
    cs: ['Bottle service', 'src/i18n/ui/cs.ts:257'],
  }), [
    drink('bottleService', 'Ostoya', 318, [[269, 700]], { group: 'vodka' }),
    drink('bottleService', 'Ostoya Black', 319, [[289, 700]], { group: 'vodka' }),
    drink('bottleService', 'Grey Goose', 320, [[400, 700]], { group: 'vodka' }),
    drink('bottleService', 'Grey Goose Altius', 321, [[790, 700]], { group: 'vodka' }),
    drink('bottleService', 'Grey Goose Aurora', 322, [[890, 1750, 'l']], { group: 'vodka' }),
    drink('bottleService', 'Chivas XII', 323, [[379, 700]], { group: 'whisky' }),
    drink('bottleService', 'Chivas XV', 324, [[450, 700]], { group: 'whisky' }),
    drink('bottleService', 'Chivas XVIII', 325, [[630, 700]], { group: 'whisky' }),
    drink('bottleService', 'Chivas Crystal', 326, [[379, 700]], { group: 'whisky' }),
    drink('bottleService', 'Patrón Silver', 327, [[630, 700]], { group: 'tequila' }),
    drink('bottleService', 'Patrón Reposado', 328, [[730, 700]], { group: 'tequila' }),
    drink('bottleService', 'Patrón Añejo', 329, [[800, 700]], { group: 'tequila' }),
    drink('bottleService', 'Bumbu Original', 330, [[420, 700]], { group: 'rum' }),
    drink('bottleService', 'Bumbu XO', 331, [[480, 700]], { group: 'rum' }),
    drink('bottleService', 'Jägermeister', 332, [[350, 700]], { group: 'liqueur' }),
  ], {
    groups: {
      vodka: l10n({
        pl: ['Wódka', 'src/i18n/ui/pl.ts:255'],
        en: ['Vodka', 'src/i18n/ui/en.ts:248'],
        de: ['Wodka', 'src/i18n/ui/de.ts:248'],
        it: ['Vodka', 'src/i18n/ui/it.ts:247'],
        cs: ['Vodka', 'src/i18n/ui/cs.ts:248'],
      }),
      whisky: l10n({
        pl: ['Whisky', 'src/i18n/ui/pl.ts:257'],
        en: ['Whisky', 'src/i18n/ui/en.ts:250'],
        de: ['Whisky', 'src/i18n/ui/de.ts:250'],
        it: ['Whisky', 'src/i18n/ui/it.ts:249'],
        cs: ['Whisky', 'src/i18n/ui/cs.ts:250'],
      }),
      tequila: l10n({
        pl: ['Tequila', 'src/i18n/ui/pl.ts:259'],
        en: ['Tequila', 'src/i18n/ui/en.ts:252'],
        de: ['Tequila', 'src/i18n/ui/de.ts:252'],
        it: ['Tequila', 'src/i18n/ui/it.ts:251'],
        cs: ['Tequila', 'src/i18n/ui/cs.ts:252'],
      }),
      rum: l10n({
        pl: ['Rum', 'src/i18n/ui/pl.ts:258'],
        en: ['Rum', 'src/i18n/ui/en.ts:251'],
        de: ['Rum', 'src/i18n/ui/de.ts:251'],
        it: ['Rum', 'src/i18n/ui/it.ts:250'],
        cs: ['Rum', 'src/i18n/ui/cs.ts:251'],
      }),
      liqueur: l10n({
        pl: ['Likiery', 'src/i18n/ui/pl.ts:261'],
        en: ['Liqueurs', 'src/i18n/ui/en.ts:254'],
        de: ['Liköre', 'src/i18n/ui/de.ts:254'],
        it: ['Liquori', 'src/i18n/ui/it.ts:253'],
        cs: ['Likéry', 'src/i18n/ui/cs.ts:254'],
      }),
    },
  }),
  section('beer', l10n({
    pl: ['Piwo', 'src/i18n/ui/pl.ts:266'],
    en: ['Beer', 'src/i18n/ui/en.ts:259'],
    de: ['Bier', 'src/i18n/ui/de.ts:259'],
    it: ['Birra', 'src/i18n/ui/it.ts:258'],
    cs: ['Pivo', 'src/i18n/ui/cs.ts:259'],
  }), [
    drink('beer', 'Stella Artois', 349, [[20, 330], [22, 500]], { tokens: ['Belgian lager'], group: 'draught', abv: 5, abvQuote: '5%' }),
    drink('beer', 'Hoegaarden', 350, [[22, 330], [25, 500]], { tokens: ['Belgian wheat ale'], group: 'draught', abv: 4.9, abvQuote: '4.9%' }),
    drink('beer', 'Leffe Blonde', 351, [[25, 330], [33, 500]], { tokens: ['Belgian blonde ale'], group: 'draught', abv: 6.5, abvQuote: '6.5%' }),
    drink('beer', 'Corona Extra', 355, [[20]], { tokens: ['Mexican lager'], group: 'bottled', abv: 4.5, abvQuote: '4.5%' }),
    drink('beer', 'Corona Cero', 356, [[20]], { tokens: ['Mexican lager'], group: 'bottled', abv: 0, abvQuote: '0%' }),
    drink('beer', 'Leffe', 357, [[22]], { tokens: ['Belgian ale'], group: 'bottled', abv: { Blonde: 6.6, Brune: 6.5 }, abvQuote: 'Blonde 6.6% / Brune 6.5%' }),
    drink('beer', 'Beck\'s', 358, [[20]], { tokens: ['German lager'], group: 'bottled', abv: 5, abvQuote: '5%' }),
    drink('beer', 'Bud', 359, [[20]], { tokens: ['American lager'], group: 'bottled', abv: 5, abvQuote: '5%' }),
  ], {
    bottleMl: pending(330, 'src/i18n/ui/pl.ts:274', { quote: '330 ml' }),
    groups: {
      draught: l10n({
        pl: ['Lane', 'src/i18n/ui/pl.ts:267'],
        en: ['Draught', 'src/i18n/ui/en.ts:260'],
        de: ['Vom Fass', 'src/i18n/ui/de.ts:260'],
        it: ['Alla spina', 'src/i18n/ui/it.ts:259'],
        cs: ['Točené', 'src/i18n/ui/cs.ts:260'],
      }),
      bottled: l10n({
        pl: ['Butelkowe', 'src/i18n/ui/pl.ts:268'],
        en: ['Bottled', 'src/i18n/ui/en.ts:261'],
        de: ['Flasche', 'src/i18n/ui/de.ts:261'],
        it: ['In bottiglia', 'src/i18n/ui/it.ts:260'],
        cs: ['Lahvové', 'src/i18n/ui/cs.ts:261'],
      }),
    },
  }),
  section('drinks', l10n({
    pl: ['Napoje', 'src/i18n/ui/pl.ts:265'],
    en: ['Soft drinks', 'src/i18n/ui/en.ts:258'],
    de: ['Alkoholfreie Getränke', 'src/i18n/ui/de.ts:258'],
    it: ['Bibite', 'src/i18n/ui/it.ts:257'],
    cs: ['Nealko nápoje', 'src/i18n/ui/cs.ts:258'],
  }), [
    drink('drinks', 'Coca-Cola / Coca-Cola Zero', 336, [[13, 250]]),
    drink('drinks', 'Coca-Cola', 337, [[10, 150]]),
    drink('drinks', 'Sprite / Fanta', 338, [[13, 250]]),
    drink('drinks', 'Cappy', 339, [[13, 250]], { tokens: ['Grejpfrut', 'Jabłko', 'Multiwitamina'] }),
    drink('drinks', 'Fuze Tea', 340, [[15, 250]], { tokens: ['Brzoskwinia', 'Hibiskus', 'Cytryna'] }),
    drink('drinks', 'Red Bull', 341, [[16, 250]], { tokens: ['Original', 'Sugar Free', 'Tropical', 'Peach'] }),
    drink('drinks', '3 Cents', 342, [[14, 250]], { tokens: ['Tonic', 'Aegean Tonic', 'Grapefruit', 'Cherry', 'Lemonade'] }),
    drink('drinks', 'Karafka lemoniady', 343, [[30, 1000]]),
    drink('drinks', 'Kropla Beskidu', 344, [[10, 300]], { tokens: ['Woda mineralna niegazowana'] }),
    drink('drinks', 'Délice', 345, [[10, 300]], { tokens: ['Woda mineralna gazowana'] }),
  ]),
];

// ---- The Cork -----------------------------------------------------------

const QTY_PIECES_LINE = 'src/data/food-menu.ts:42-45' as const;
const QTY_SERVES_LINE = 'src/data/food-menu.ts:46-48' as const;

interface DishExtra {
  /** [diet, line] */
  readonly diet?: readonly ['vegetarian' | 'vegan', number];
  /** Line of `spicy: true`. */
  readonly spicy?: number;
  /** The site shows this dish without a price. */
  readonly missingPrice?: boolean;
}

/** Tiers: `[PLN]`, `[PLN, 'pieces', 3]` or `[PLN, 'serves', 2]`, all from the dish's `tiers` line. */
type Tier = readonly [zl: number, kind?: Portion['kind'], n?: number];

function dish(id: string, name: Dish['name'], desc: Dish['desc'] | undefined, tiersLine: number, tiers: readonly Tier[], extra: DishExtra = {}): Dish {
  const ref = atFood(tiersLine);
  return {
    id,
    name,
    ...(desc ? { desc } : {}),
    options: tiers.map(([zl, kind, n]) => ({
      pricePln: pending(zl, ref),
      ...(kind && n ? { portion: pending<Portion>({ kind, n }, ref, { quote: `QTY.${kind === 'pieces' ? 'p' : 'd'}${n}` }) } : {}),
    })),
    ...(extra.missingPrice ? { missingPrice: gap('DISH_PRICE') } : {}),
    ...(extra.diet ? { diet: pending(extra.diet[0], atFood(extra.diet[1])) } : {}),
    ...(extra.spicy ? { spicy: pending(true, atFood(extra.spicy), { quote: 'spicy: true' }) } : {}),
    allergens: gap('ALLERGENS'),
    tags: gap('TASTE_TAGS'),
  };
}

const FOOD_SECTIONS: readonly FoodSection[] = [
  { id: 'to-start', title: l10n({
    pl: ['Na początek', 'src/data/food-menu.ts:71'],
    en: ['To start', 'src/data/food-menu.ts:71'],
    de: ['Zum Anfang', 'src/data/food-menu.ts:71'],
    it: ['Per iniziare', 'src/data/food-menu.ts:71'],
    cs: ['Na začátek', 'src/data/food-menu.ts:71'],
  }), dishes: [
    dish('oysters', l10n({
      pl: ['Ostrygi', 'src/data/food-menu.ts:76'],
      en: ['Oysters', 'src/data/food-menu.ts:76'],
      de: ['Austern', 'src/data/food-menu.ts:76'],
      it: ['Ostriche', 'src/data/food-menu.ts:76'],
      cs: ['Ústřice', 'src/data/food-menu.ts:76'],
    }), l10n({
      pl: ['Szkocja · Irlandia · Francja, na lodzie\nSosy do wyboru: klasyczna cytryna, mignonette, spicy mango', 'src/data/food-menu.ts:77-83'],
      en: ['Scotland · Ireland · France, on ice\nSauces to choose: classic lemon, mignonette, spicy mango', 'src/data/food-menu.ts:77-83'],
      de: ['Schottland · Irland · Frankreich, auf Eis\nSaucen zur Wahl: klassisch Zitrone, Mignonette, Spicy Mango', 'src/data/food-menu.ts:77-83'],
      it: ['Scozia · Irlanda · Francia, su ghiaccio\nSalse a scelta: limone classico, mignonette, mango piccante', 'src/data/food-menu.ts:77-83'],
      cs: ['Skotsko · Irsko · Francie, na ledu\nOmáčky na výběr: klasický citron, mignonette, pikantní mango', 'src/data/food-menu.ts:77-83'],
    }), 84, [[49, 'pieces', 3], [85, 'pieces', 6], [120, 'pieces', 9]]),
    dish('crostini', l10n({
      pl: ['Crostini', 'src/data/food-menu.ts:88'],
      en: ['Crostini', 'src/data/food-menu.ts:88'],
      de: ['Crostini', 'src/data/food-menu.ts:88'],
      it: ['Crostini', 'src/data/food-menu.ts:88'],
      cs: ['Crostini', 'src/data/food-menu.ts:88'],
    }), l10n({
      pl: ['Dedykowany chleb Sisi', 'src/data/food-menu.ts:89-95'],
      en: ['Signature Sisi bread', 'src/data/food-menu.ts:89-95'],
      de: ['Sisi-Signature-Brot', 'src/data/food-menu.ts:89-95'],
      it: ['Pane Sisi della casa', 'src/data/food-menu.ts:89-95'],
      cs: ['Signature chléb Sisi', 'src/data/food-menu.ts:89-95'],
    }), 96, [], { missingPrice: true }),
    dish('the-cork-classic-beef-tartare', l10n({
      pl: ['Klasyczny tatar wołowy The Cork', 'src/data/food-menu.ts:100-106'],
      en: ['The Cork classic beef tartare', 'src/data/food-menu.ts:100-106'],
      de: ['Klassisches Rindertatar The Cork', 'src/data/food-menu.ts:100-106'],
      it: ['Tartare di manzo classica The Cork', 'src/data/food-menu.ts:100-106'],
      cs: ['Klasický hovězí tatarák The Cork', 'src/data/food-menu.ts:100-106'],
    }), l10n({
      pl: ['Ogórki / szalotka / musztarda / lubczyk / żółtko / chili / kapelusze borowika / domowa focaccia aglio e olio peperoncino', 'src/data/food-menu.ts:107-113'],
      en: ['Cucumber / shallot / mustard / lovage / egg yolk / chili / porcini caps / house focaccia aglio e olio peperoncino', 'src/data/food-menu.ts:107-113'],
      de: ['Gurke / Schalotte / Senf / Liebstöckel / Eigelb / Chili / Steinpilzköpfe / hausgemachte Focaccia aglio e olio peperoncino', 'src/data/food-menu.ts:107-113'],
      it: ['Cetriolo / scalogno / senape / levistico / tuorlo / peperoncino / cappelle di porcini / focaccia della casa aglio e olio peperoncino', 'src/data/food-menu.ts:107-113'],
      cs: ['Okurka / šalotka / hořčice / libeček / žloutek / chili / hlavičky hřibů / domácí focaccia aglio e olio peperoncino', 'src/data/food-menu.ts:107-113'],
    }), 114, [[49, 'pieces', 3]]),
    dish('roasted-rubia-gallega-beef', l10n({
      pl: ['Pieczona polędwica Rubia Gallega', 'src/data/food-menu.ts:118-124'],
      en: ['Roasted Rubia Gallega beef', 'src/data/food-menu.ts:118-124'],
      de: ['Gebratenes Rubia-Gallega-Rind', 'src/data/food-menu.ts:118-124'],
      it: ['Controfiletto di Rubia Gallega arrosto', 'src/data/food-menu.ts:118-124'],
      cs: ['Pečená svíčková Rubia Gallega', 'src/data/food-menu.ts:118-124'],
    }), l10n({
      pl: ['Sos pepe verde / śmietana truflowa / ser Emilgrana', 'src/data/food-menu.ts:125-131'],
      en: ['Pepe verde sauce / truffle cream / Emilgrana cheese', 'src/data/food-menu.ts:125-131'],
      de: ['Pepe-Verde-Sauce / Trüffelcreme / Emilgrana-Käse', 'src/data/food-menu.ts:125-131'],
      it: ['Salsa al pepe verde / crema al tartufo / formaggio Emilgrana', 'src/data/food-menu.ts:125-131'],
      cs: ['Omáčka pepe verde / lanýžová smetana / sýr Emilgrana', 'src/data/food-menu.ts:125-131'],
    }), 132, [[49, 'pieces', 3]]),
    dish('blue-fin-tuna-a-la-chinoise', l10n({
      pl: ['Tuńczyk Blue Fin à la chinoise', 'src/data/food-menu.ts:137-143'],
      en: ['Blue Fin tuna à la chinoise', 'src/data/food-menu.ts:137-143'],
      de: ['Blue-Fin-Thunfisch à la chinoise', 'src/data/food-menu.ts:137-143'],
      it: ['Tonno Blue Fin à la chinoise', 'src/data/food-menu.ts:137-143'],
      cs: ['Tuňák Blue Fin à la chinoise', 'src/data/food-menu.ts:137-143'],
    }), l10n({
      pl: ['Palony por / cytrusy / chili / sos sojowy / sezam', 'src/data/food-menu.ts:144-150'],
      en: ['Charred leek / citrus / chili / soy sauce / sesame', 'src/data/food-menu.ts:144-150'],
      de: ['Gebrannter Lauch / Zitrus / Chili / Sojasauce / Sesam', 'src/data/food-menu.ts:144-150'],
      it: ['Porro bruciato / agrumi / peperoncino / salsa di soia / sesamo', 'src/data/food-menu.ts:144-150'],
      cs: ['Opálený pórek / citrusy / chili / sójová omáčka / sezam', 'src/data/food-menu.ts:144-150'],
    }), 151, [[49, 'pieces', 3]], { spicy: 136 }),
    dish('sisi-tiered-platter', l10n({
      pl: ['Etażera Sisi', 'src/data/food-menu.ts:155-161'],
      en: ['Sisi tiered platter', 'src/data/food-menu.ts:155-161'],
      de: ['Sisi Etagere', 'src/data/food-menu.ts:155-161'],
      it: ['Alzata Sisi', 'src/data/food-menu.ts:155-161'],
      cs: ['Etažér Sisi', 'src/data/food-menu.ts:155-161'],
    }), l10n({
      pl: ['Miks crostini i ostryg', 'src/data/food-menu.ts:162-168'],
      en: ['A mix of crostini and oysters', 'src/data/food-menu.ts:162-168'],
      de: ['Mix aus Crostini und Austern', 'src/data/food-menu.ts:162-168'],
      it: ['Mix di crostini e ostriche', 'src/data/food-menu.ts:162-168'],
      cs: ['Mix crostini a ústřic', 'src/data/food-menu.ts:162-168'],
    }), 169, [[139, 'serves', 2], [259, 'serves', 4], [379, 'serves', 6]]),
    dish('the-cork-cheese-board', l10n({
      pl: ['Sery Corka', 'src/data/food-menu.ts:173-179'],
      en: ['The Cork cheese board', 'src/data/food-menu.ts:173-179'],
      de: ['Käseauswahl The Cork', 'src/data/food-menu.ts:173-179'],
      it: ['Selezione di formaggi The Cork', 'src/data/food-menu.ts:173-179'],
      cs: ['Sýrové prkénko The Cork', 'src/data/food-menu.ts:173-179'],
    }), l10n({
      pl: ['Kozi / owczy / krowi / oliwki / musztarda pomarańczowa', 'src/data/food-menu.ts:180-186'],
      en: ['Goat / sheep / cow / olives / orange mustard', 'src/data/food-menu.ts:180-186'],
      de: ['Ziege / Schaf / Kuh / Oliven / Orangensenf', 'src/data/food-menu.ts:180-186'],
      it: ['Capra / pecora / mucca / olive / senape all\'arancia', 'src/data/food-menu.ts:180-186'],
      cs: ['Kozí / ovčí / kravský / olivy / pomerančová hořčice', 'src/data/food-menu.ts:180-186'],
    }), 187, [[65]], { diet: ['vegetarian', 188] }),
  ] },
  { id: 'hot', title: l10n({
    pl: ['Na ciepło', 'src/data/food-menu.ts:193'],
    en: ['Hot', 'src/data/food-menu.ts:193'],
    de: ['Warme Gerichte', 'src/data/food-menu.ts:193'],
    it: ['Piatti caldi', 'src/data/food-menu.ts:193'],
    cs: ['Teplá jídla', 'src/data/food-menu.ts:193'],
  }), dishes: [
    dish('seafood-basket', l10n({
      pl: ['Seafood basket', 'src/data/food-menu.ts:198'],
      en: ['Seafood basket', 'src/data/food-menu.ts:198'],
      de: ['Seafood-Korb', 'src/data/food-menu.ts:198'],
      it: ['Cestino di mare', 'src/data/food-menu.ts:198'],
      cs: ['Seafood basket', 'src/data/food-menu.ts:198'],
    }), l10n({
      pl: ['Krewetki / dorsz / kalmar / dip czosnkowo-ziołowy / cytryna / chipsy warzywne', 'src/data/food-menu.ts:199-205'],
      en: ['Shrimp / cod / squid / garlic-herb dip / lemon / vegetable chips', 'src/data/food-menu.ts:199-205'],
      de: ['Garnelen / Kabeljau / Tintenfisch / Knoblauch-Kräuter-Dip / Zitrone / Gemüsechips', 'src/data/food-menu.ts:199-205'],
      it: ['Gamberi / merluzzo / calamaro / dip aglio ed erbe / limone / chips di verdure', 'src/data/food-menu.ts:199-205'],
      cs: ['Krevety / treska / kalamáry / česnekovo-bylinkový dip / citron / zeleninové chipsy', 'src/data/food-menu.ts:199-205'],
    }), 206, [[65]]),
    dish('buffalo-crispy-chicken', l10n({
      pl: ['Buffalo – chrupiący kurczak', 'src/data/food-menu.ts:211-217'],
      en: ['Buffalo crispy chicken', 'src/data/food-menu.ts:211-217'],
      de: ['Buffalo Crispy Chicken', 'src/data/food-menu.ts:211-217'],
      it: ['Pollo croccante Buffalo', 'src/data/food-menu.ts:211-217'],
      cs: ['Buffalo křupavé kuře', 'src/data/food-menu.ts:211-217'],
    }), l10n({
      pl: ['Miodowy czosnek / majonez piniowy / domowy sos Buffalo / nori / bonito', 'src/data/food-menu.ts:218-224'],
      en: ['Honey garlic / pine-nut mayo / house Buffalo sauce / nori / bonito', 'src/data/food-menu.ts:218-224'],
      de: ['Honig-Knoblauch / Pinienkern-Mayo / hausgemachte Buffalo-Sauce / Nori / Bonito', 'src/data/food-menu.ts:218-224'],
      it: ['Aglio e miele / maionese ai pinoli / salsa Buffalo della casa / nori / bonito', 'src/data/food-menu.ts:218-224'],
      cs: ['Medový česnek / piniová majonéza / domácí omáčka Buffalo / nori / bonito', 'src/data/food-menu.ts:218-224'],
    }), 225, [[65]], { spicy: 210 }),
  ] },
];

const LABELS: Menu['labels'] = {
  featured: l10n({
    pl: ['Polecamy', at(118)],
    en: ['Recommended', at(118)],
    de: ['Empfehlung', at(118)],
    it: ['Consigliato', at(118)],
    cs: ['Doporučujeme', at(118)],
  }),
  wineCategory: {
    white: SECTIONS.find((s) => s.id === 'wines')!.groups!.white!,
    red: SECTIONS.find((s) => s.id === 'wines')!.groups!.red!,
    roseOrange: SECTIONS.find((s) => s.id === 'wines')!.groups!.roseOrange!,
  },
  dryness: {
    dry: l10n({
      pl: ['wytrawne', at(113)],
      en: ['dry', at(113)],
      de: ['trocken', at(113)],
      it: ['secco', at(113)],
      cs: ['suché', at(113)],
    }),
    semiDry: l10n({
      pl: ['półwytrawne', at(114)],
      en: ['semi-dry', at(114)],
      de: ['halbtrocken', at(114)],
      it: ['semisecco', at(114)],
      cs: ['polosuché', at(114)],
    }),
  },
  diet: {
    vegetarian: l10n({
      pl: ['wegetariańskie', atFood(35)],
      en: ['vegetarian', atFood(35)],
      de: ['vegetarisch', atFood(35)],
      it: ['vegetariano', atFood(35)],
      cs: ['vegetariánské', atFood(35)],
    }),
    vegan: l10n({
      pl: ['wegańskie', atFood(36)],
      en: ['vegan', atFood(36)],
      de: ['vegan', atFood(36)],
      it: ['vegano', atFood(36)],
      cs: ['veganské', atFood(36)],
    }),
  },
  spicy: l10n({
    pl: ['ostre', atFood(38)],
    en: ['spicy', atFood(38)],
    de: ['scharf', atFood(38)],
    it: ['piccante', atFood(38)],
    cs: ['pálivé', atFood(38)],
  }),
  portionPieces: l10n({
    pl: ['{n} szt', QTY_PIECES_LINE, '3 szt'],
    en: ['{n} pcs', QTY_PIECES_LINE, '3 pcs'],
    de: ['{n} Stk.', QTY_PIECES_LINE, '3 Stk.'],
    it: ['{n} pz', QTY_PIECES_LINE, '3 pz'],
    cs: ['{n} ks', QTY_PIECES_LINE, '3 ks'],
  }),
  portionServes: l10n({
    pl: ['dla {n} os.', QTY_SERVES_LINE, 'dla 2 os.'],
    en: ['for {n}', QTY_SERVES_LINE, 'for 2'],
    de: ['für {n}', QTY_SERVES_LINE, 'für 2'],
    it: ['per {n}', QTY_SERVES_LINE, 'per 2'],
    cs: ['pro {n}', QTY_SERVES_LINE, 'pro 2'],
  }),
};

/** "3 szt", "dla 2 os." in a locale. */
export function portionLabel(portion: Portion, locale: Locale, labels: Menu['labels'] = LABELS): string {
  const template = (portion.kind === 'pieces' ? labels.portionPieces : labels.portionServes)[locale].value;
  return template.replace('{n}', String(portion.n));
}

export const MENU: Menu = {
  currency: pending<'PLN'>('PLN', 'src/i18n/ui/pl.ts:251', { quote: 'Ceny w złotych' }),
  glossary: GLOSSARY,
  labels: LABELS,
  sections: SECTIONS,
  food: {
    eyebrow: pending('The Cork · Wrocław', atFood(52)),
    heading: l10n({
      pl: ['Odkrywaj z nami pasję do jedzenia', 'src/data/food-menu.ts:53-59'],
      en: ['Discover our passion for food', 'src/data/food-menu.ts:53-59'],
      de: ['Entdecke mit uns die Leidenschaft fürs Essen', 'src/data/food-menu.ts:53-59'],
      it: ['Scopri con noi la passione per il cibo', 'src/data/food-menu.ts:53-59'],
      cs: ['Objevujte s námi vášeň pro jídlo', 'src/data/food-menu.ts:53-59'],
    }),
    sub: l10n({
      pl: ['Bogactwo ulubionych smaków – prosto, świeżo, autentycznie.', 'src/data/food-menu.ts:60-66'],
      en: ['A wealth of beloved flavours – simple, fresh, authentic.', 'src/data/food-menu.ts:60-66'],
      de: ['Eine Fülle liebster Aromen – schlicht, frisch, authentisch.', 'src/data/food-menu.ts:60-66'],
      it: ['Una ricchezza di sapori amati – semplice, fresco, autentico.', 'src/data/food-menu.ts:60-66'],
      cs: ['Bohatství oblíbených chutí – jednoduše, čerstvě, autenticky.', 'src/data/food-menu.ts:60-66'],
    }),
    sections: FOOD_SECTIONS,
  },
  verifiedOn: gap('MENU_VERIFIED'),
};
