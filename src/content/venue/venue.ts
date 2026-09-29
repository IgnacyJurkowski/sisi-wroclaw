/* Venue truth: the record.

   Every fact the site states about SiSi Wrocław, in one typed object, each with
   the place it currently appears and a status. Nothing here is CONFIRMED: only
   Ignacy confirms. Missing facts are Gaps (see gaps.ts), never guesses.

   This file is new in Phase 3a. No page reads it yet; the consumers (footer,
   contact page, JSON-LD, dictionaries, llms.txt) still read src/data/site.ts and
   the dictionaries. The refactor that points them here is Phase 3b. Until then
   `node scripts/venue-inventory.mjs` compares the two and lists every place they
   disagree. */

import { gap, pending, sourcesOf } from './facts';
import {
  DESCRIPTION,
  DESCRIPTOR,
  FOOTER_TAGLINE,
  SPONSOR_ZONE_NAME,
  TAGLINE,
} from './copy';
import { HOURS } from './hours';
import { MENU } from './menu';
import { RESERVATIONS } from './reservations';
import type { Phone, Venue } from './types';

const SITE = 'src/data/site.ts';
const PL = 'src/i18n/ui/pl.ts';

const phone = (display: string, e164: string): Phone => ({ display, e164 });

export const VENUE: Venue = {
  snapshot: {
    repoCommit: 'f8ccc58',
    mainCommit: 'e1feb25',
    capturedOn: '2026-09-29',
    note: 'Every source line refers to this commit of the repository. Production could not be reached from the build container, so no fact was checked against the live site.',
  },

  identity: {
    brandName: pending('SiSi Wrocław', [`${SITE}:129`, 'src/layouts/Base.astro:140']),
    siteUrl: pending('https://www.sisiwroclaw.pl', [`${SITE}:130`, 'astro.config.mjs:6']),
    complexName: pending('R32', `${SITE}:202`, { note: 'The complex SiSi and The Cork share (EventVenue name in JSON-LD).' }),
    complexUrl: pending('https://www.r32.com.pl/', `${SITE}:203`),
    restaurantName: pending('The Cork', `${PL}:466`, { note: 'Restaurant in the same complex. Its seating (150) is not SiSi\'s.' }),
    sponsorZoneName: SPONSOR_ZONE_NAME,
    legalEntity: {
      legalName: pending('Rzeźnicza 32 Sp. z o.o.', `${SITE}:101`),
      tradeName: pending('SiSi Wrocław', `${SITE}:102`),
      legalForm: pending('spółka z ograniczoną odpowiedzialnością', `${PL}:352`),
      registryCourt: pending('Sąd Rejonowy dla Wrocławia-Fabrycznej we Wrocławiu', `${PL}:352`),
      nip: pending('8971933394', `${SITE}:105`),
      regon: pending('527683726', `${SITE}:106`),
      krs: pending('0001085945', [`${SITE}:107`, `${SITE}:97-98`], {
        note: 'The code comment says the data comes from the KRS register (rejestr.io) and should be reviewed by a lawyer.',
      }),
      registeredStreet: pending('Rzeźnicza 32-33', `${SITE}:103`),
      registeredPostalCity: pending('50-130 Wrocław', `${SITE}:104`),
    },
    tagline: TAGLINE,
    taglineCanonicalPl: pending('Serce Wrocławia bije w SiSi', 'docs/sisi-elevate/WORKING-RULES.md:13', {
      quote: 'Serce Wrocławia bije w SiSi',
      note: 'The sentence-case form named in the run\'s working rules. The dictionaries spell the slogan in capitals.',
    }),
    description: DESCRIPTION,
    descriptor: DESCRIPTOR,
    footerTagline: FOOTER_TAGLINE,
    priceRangeSymbol: pending('$$', `${SITE}:142`),
  },

  address: {
    street: pending('Rzeźnicza 32-33', [`${SITE}:133`, `${SITE}:103`]),
    postalCode: pending('50-130', `${SITE}:136`),
    city: pending('Wrocław', `${SITE}:134`),
    region: pending('Dolnośląskie', `${SITE}:135`),
    country: pending('PL', `${SITE}:137`),
    oneLine: pending('Rzeźnicza 32-33, 50-130 Wrocław', `${SITE}:83`),
    mapsUrl: pending(
      'https://www.google.com/maps/search/?api=1&query=SISI%20%7C%20Music%20Club%20Wroc%C5%82aw&query_place_id=ChIJS14DTYDDD0cRWrK8z0wRcsM',
      `${SITE}:84`,
    ),
    mapsPlaceId: pending('ChIJS14DTYDDD0cRWrK8z0wRcsM', `${SITE}:84`),
    coordinates: {
      latitude: pending(51.1106472, `${SITE}:140`),
      longitude: pending(17.0279287, `${SITE}:141`),
      basis: pending(
        'Building point for Rzeźnicza 32-33, verified against the public address record on 2026-07-16.',
        `${SITE}:138-139`,
        {
          quote: ['Building point for Rzeźnicza 32-33', 'record on 2026-07-16'],
          note: 'The code comment. The record is not named and the point is the building, not the entrance.',
        },
      ),
      verification: gap('COORDINATES'),
    },
  },

  contacts: {
    phone: pending(phone('+48 515 126 260', '+48515126260'), [`${SITE}:85-86`, `${SITE}:109-110`]),
    eventsPhone: pending(phone('+48 514 032 930', '+48514032930'), `${SITE}:87-88`),
    email: pending('biuro@r32.com.pl', [`${SITE}:82`, `${SITE}:108`]),
    eventsEmail: pending('events@r32.com.pl', `${SITE}:89`),
    hours: gap('CONTACT_HOURS'),
  },

  socials: {
    instagram: pending('https://www.instagram.com/sisiwroclaw/', `${SITE}:91`),
    facebook: pending('https://www.facebook.com/sisimusicclub', `${SITE}:92`),
    tripadvisor: pending(
      'https://www.tripadvisor.com/Attraction_Review-g274812-d34327483-Reviews-SISI_Wroclaw_Music_Club-Wroclaw_Lower_Silesia_Province_Southern_Poland.html',
      `${SITE}:93-94`,
    ),
  },

  hours: HOURS,
  reservations: RESERVATIONS,

  b2b: {
    areaSqm: pending(663, sourcesOf(`${SITE}:120`, `${PL}:428`), {
      note: 'docs/B2B.md:12 says the owner confirmed 663 m2 on 2026-07-14. Not re-confirmed in this run, so it stays PENDING.',
    }),
    theCorkSeated: pending(150, sourcesOf(`${SITE}:121`, `${PL}:429`), {
      note: 'The Cork\'s seated capacity. Never imply SiSi seats 150 (the code comment at src/data/site.ts:117-118 says so).',
    }),
    standingBuffet: pending(500, sourcesOf(`${SITE}:122`, `${PL}:430`), {
      note: 'Standing guests, buffet format. The corporate page lists it under the SiSi space (src/i18n/ui/pl.ts:479).',
    }),
    presentationScreens: pending(2, sourcesOf(`${SITE}:123`, `${PL}:431`), { quote: ['presentationScreens', '2 ekrany'] }),
    clubCapacity: gap('CAPACITY'),
  },

  menu: MENU,

  programme: {
    lineup: gap('LINEUP'),
    artists: gap('ARTISTS'),
    eventDates: gap('EVENT_DATES'),
    djStart: gap('DJ_START'),
  },

  access: {
    entrance: gap('ENTRANCE'),
    stepFree: gap('STEP_FREE'),
    parking: gap('PARKING'),
    transport: gap('TRANSPORT'),
  },

  media: {
    photoRights: gap('PHOTO_RIGHTS'),
    press: gap('PRESS'),
    reviews: gap('REVIEWS'),
  },

  policies: {
    ageNotice: gap('AGE_NOTICE'),
    dressCodeDetail: gap('DRESS_CODE_DETAIL'),
    cloakroom: gap('CLOAKROOM'),
    paymentMethods: gap('PAYMENT_METHODS'),
    foodMenuCompleteness: gap('FOOD_MENU'),
    sponsorZoneContent: gap('CHIVAS_ZONE'),
  },

  translations: {
    legal: {
      de: gap('LEGAL_TRANSLATIONS'),
      it: gap('LEGAL_TRANSLATIONS'),
      cs: gap('LEGAL_TRANSLATIONS'),
    },
  },
};
