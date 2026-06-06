/* ============================================================================
 * dialect-data.js
 * Dialect questions + per-region answer-probability profiles.
 *
 * The "regions" are documented U.S. dialect areas. For each question, every
 * region has a weight vector over the answer options (weights need not sum to
 * 100 — they are normalised at runtime into probabilities).
 *
 * Sources / grounding: Harvard Dialect Survey (Vaux & Golder 2002-03),
 * Cambridge Online Survey of World Englishes, Atlas of North American English
 * (Labov et al.), and widely documented American regional vocabulary splits.
 * These are realistic, hand-built estimates for a reproduction of the method —
 * not the NYT's proprietary 350k-response model.
 * ==========================================================================*/

const REGION_KEYS = ["NE", "NYC", "DV", "SO", "TX", "IN", "UM", "ML", "MW", "WC"];

const REGION_NAMES = {
  NE:  "New England",
  NYC: "New York City & N. Jersey",
  DV:  "Philadelphia & Mid-Atlantic",
  SO:  "The South",
  TX:  "Texas & Oklahoma",
  IN:  "Great Lakes / Inland North",
  UM:  "Upper Midwest",
  ML:  "Lower Midwest / Midland",
  MW:  "Mountain West",
  WC:  "West Coast"
};

// State (by full name, as used in us-atlas) -> dialect region.
const STATE_REGION = {
  "Maine": "NE", "New Hampshire": "NE", "Vermont": "NE", "Massachusetts": "NE",
  "Rhode Island": "NE", "Connecticut": "NE",
  "New York": "NYC", "New Jersey": "NYC",
  "Pennsylvania": "DV", "Delaware": "DV", "Maryland": "DV",
  "District of Columbia": "DV", "West Virginia": "DV",
  "Virginia": "SO", "North Carolina": "SO", "South Carolina": "SO",
  "Georgia": "SO", "Florida": "SO", "Alabama": "SO", "Mississippi": "SO",
  "Tennessee": "SO", "Kentucky": "SO", "Arkansas": "SO", "Louisiana": "SO",
  "Texas": "TX", "Oklahoma": "TX",
  "Michigan": "IN", "Ohio": "IN", "Indiana": "IN", "Illinois": "IN", "Wisconsin": "IN",
  "Minnesota": "UM", "North Dakota": "UM", "South Dakota": "UM", "Iowa": "UM", "Nebraska": "UM",
  "Missouri": "ML", "Kansas": "ML",
  "Montana": "MW", "Idaho": "MW", "Wyoming": "MW", "Colorado": "MW",
  "Utah": "MW", "Nevada": "MW", "Arizona": "MW", "New Mexico": "MW",
  "California": "WC", "Oregon": "WC", "Washington": "WC", "Alaska": "WC", "Hawaii": "WC"
};

// Representative cities for the "most / least similar" panels.
const CITIES = [
  { name: "Boston, MA",        lat: 42.36, lon: -71.06, region: "NE" },
  { name: "Providence, RI",    lat: 41.82, lon: -71.41, region: "NE" },
  { name: "Portland, ME",      lat: 43.66, lon: -70.26, region: "NE" },
  { name: "New York, NY",      lat: 40.71, lon: -74.01, region: "NYC" },
  { name: "Newark, NJ",        lat: 40.74, lon: -74.17, region: "NYC" },
  { name: "Philadelphia, PA",  lat: 39.95, lon: -75.16, region: "DV" },
  { name: "Pittsburgh, PA",    lat: 40.44, lon: -79.99, region: "DV" },
  { name: "Baltimore, MD",     lat: 39.29, lon: -76.61, region: "DV" },
  { name: "Washington, DC",    lat: 38.91, lon: -77.04, region: "DV" },
  { name: "Atlanta, GA",       lat: 33.75, lon: -84.39, region: "SO" },
  { name: "Charlotte, NC",     lat: 35.23, lon: -80.84, region: "SO" },
  { name: "Nashville, TN",     lat: 36.16, lon: -86.78, region: "SO" },
  { name: "New Orleans, LA",   lat: 29.95, lon: -90.07, region: "SO" },
  { name: "Miami, FL",         lat: 25.76, lon: -80.19, region: "SO" },
  { name: "Richmond, VA",      lat: 37.54, lon: -77.44, region: "SO" },
  { name: "Houston, TX",       lat: 29.76, lon: -95.37, region: "TX" },
  { name: "Dallas, TX",        lat: 32.78, lon: -96.80, region: "TX" },
  { name: "Oklahoma City, OK", lat: 35.47, lon: -97.52, region: "TX" },
  { name: "Chicago, IL",       lat: 41.88, lon: -87.63, region: "IN" },
  { name: "Detroit, MI",       lat: 42.33, lon: -83.05, region: "IN" },
  { name: "Cleveland, OH",     lat: 41.50, lon: -81.69, region: "IN" },
  { name: "Milwaukee, WI",     lat: 43.04, lon: -87.91, region: "IN" },
  { name: "Indianapolis, IN",  lat: 39.77, lon: -86.16, region: "IN" },
  { name: "Minneapolis, MN",   lat: 44.98, lon: -93.27, region: "UM" },
  { name: "Des Moines, IA",    lat: 41.59, lon: -93.62, region: "UM" },
  { name: "Omaha, NE",         lat: 41.26, lon: -95.93, region: "UM" },
  { name: "Fargo, ND",         lat: 46.88, lon: -96.79, region: "UM" },
  { name: "St. Louis, MO",     lat: 38.63, lon: -90.20, region: "ML" },
  { name: "Kansas City, MO",   lat: 39.10, lon: -94.58, region: "ML" },
  { name: "Denver, CO",        lat: 39.74, lon: -104.99, region: "MW" },
  { name: "Salt Lake City, UT",lat: 40.76, lon: -111.89, region: "MW" },
  { name: "Phoenix, AZ",       lat: 33.45, lon: -112.07, region: "MW" },
  { name: "Albuquerque, NM",   lat: 35.08, lon: -106.65, region: "MW" },
  { name: "Las Vegas, NV",     lat: 36.17, lon: -115.14, region: "MW" },
  { name: "Los Angeles, CA",   lat: 34.05, lon: -118.24, region: "WC" },
  { name: "San Francisco, CA", lat: 37.77, lon: -122.42, region: "WC" },
  { name: "Seattle, WA",       lat: 47.61, lon: -122.33, region: "WC" },
  { name: "Portland, OR",      lat: 45.52, lon: -122.68, region: "WC" },
  { name: "San Diego, CA",     lat: 32.72, lon: -117.16, region: "WC" }
];

/* Each question:
 *   id, text, options:[{id,label}], base:{opt:w}, over:{region:{opt:w}}
 * "base" is the fallback; "over" gives the full vector per region.
 */
const QUESTIONS = [
  {
    id: "beverage",
    text: "What is your general term for a sweetened carbonated beverage?",
    options: [
      { id: "soda", label: "Soda" },
      { id: "pop", label: "Pop" },
      { id: "coke", label: "Coke (for any brand)" },
      { id: "soft_drink", label: "Soft drink" },
      { id: "other", label: "Something else" }
    ],
    base: { soda: 40, pop: 25, coke: 15, soft_drink: 12, other: 8 },
    over: {
      NE:  { soda: 70, pop: 8,  coke: 6,  soft_drink: 10, other: 6 },
      NYC: { soda: 78, pop: 5,  coke: 5,  soft_drink: 7,  other: 5 },
      DV:  { soda: 72, pop: 10, coke: 6,  soft_drink: 7,  other: 5 },
      SO:  { soda: 18, pop: 8,  coke: 45, soft_drink: 22, other: 7 },
      TX:  { soda: 20, pop: 8,  coke: 50, soft_drink: 16, other: 6 },
      IN:  { soda: 20, pop: 60, coke: 8,  soft_drink: 8,  other: 4 },
      UM:  { soda: 25, pop: 58, coke: 6,  soft_drink: 7,  other: 4 },
      ML:  { soda: 35, pop: 40, coke: 12, soft_drink: 9,  other: 4 },
      MW:  { soda: 30, pop: 52, coke: 8,  soft_drink: 6,  other: 4 },
      WC:  { soda: 68, pop: 18, coke: 6,  soft_drink: 5,  other: 3 }
    }
  },
  {
    id: "plural_you",
    text: "How do you address a group of two or more people?",
    options: [
      { id: "you_guys", label: "You guys" },
      { id: "yall", label: "Y'all" },
      { id: "you", label: "You" },
      { id: "yinz", label: "Yinz" },
      { id: "youse", label: "Youse / you's" }
    ],
    base: { you_guys: 55, yall: 20, you: 15, yinz: 2, youse: 8 },
    over: {
      NE:  { you_guys: 78, yall: 3,  you: 14, yinz: 0,  youse: 5 },
      NYC: { you_guys: 55, yall: 4,  you: 12, yinz: 1,  youse: 28 },
      DV:  { you_guys: 45, yall: 8,  you: 12, yinz: 25, youse: 10 },
      SO:  { you_guys: 15, yall: 78, you: 6,  yinz: 0,  youse: 1 },
      TX:  { you_guys: 18, yall: 75, you: 6,  yinz: 0,  youse: 1 },
      IN:  { you_guys: 80, yall: 6,  you: 12, yinz: 1,  youse: 1 },
      UM:  { you_guys: 82, yall: 6,  you: 11, yinz: 0,  youse: 1 },
      ML:  { you_guys: 55, yall: 32, you: 12, yinz: 0,  youse: 1 },
      MW:  { you_guys: 78, yall: 12, you: 9,  yinz: 0,  youse: 1 },
      WC:  { you_guys: 80, yall: 10, you: 9,  yinz: 0,  youse: 1 }
    }
  },
  {
    id: "athletic_shoes",
    text: "What is your general term for rubber-soled shoes worn for sports?",
    options: [
      { id: "sneakers", label: "Sneakers" },
      { id: "tennis_shoes", label: "Tennis shoes" },
      { id: "gym_shoes", label: "Gym shoes" },
      { id: "other", label: "Something else" }
    ],
    base: { sneakers: 35, tennis_shoes: 50, gym_shoes: 10, other: 5 },
    over: {
      NE:  { sneakers: 82, tennis_shoes: 8,  gym_shoes: 4,  other: 6 },
      NYC: { sneakers: 85, tennis_shoes: 8,  gym_shoes: 3,  other: 4 },
      DV:  { sneakers: 70, tennis_shoes: 20, gym_shoes: 6,  other: 4 },
      SO:  { sneakers: 15, tennis_shoes: 78, gym_shoes: 4,  other: 3 },
      TX:  { sneakers: 15, tennis_shoes: 78, gym_shoes: 4,  other: 3 },
      IN:  { sneakers: 20, tennis_shoes: 45, gym_shoes: 32, other: 3 },
      UM:  { sneakers: 20, tennis_shoes: 60, gym_shoes: 17, other: 3 },
      ML:  { sneakers: 20, tennis_shoes: 70, gym_shoes: 7,  other: 3 },
      MW:  { sneakers: 25, tennis_shoes: 68, gym_shoes: 4,  other: 3 },
      WC:  { sneakers: 40, tennis_shoes: 52, gym_shoes: 4,  other: 4 }
    }
  },
  {
    id: "sandwich",
    text: "What do you call a long sandwich with cold cuts, lettuce, etc.?",
    options: [
      { id: "sub", label: "Sub" },
      { id: "hoagie", label: "Hoagie" },
      { id: "grinder", label: "Grinder" },
      { id: "hero", label: "Hero" },
      { id: "poboy", label: "Po'boy" },
      { id: "other", label: "Something else" }
    ],
    base: { sub: 65, hoagie: 8, grinder: 6, hero: 6, poboy: 4, other: 11 },
    over: {
      NE:  { sub: 55, hoagie: 3,  grinder: 30, hero: 4,  poboy: 1,  other: 7 },
      NYC: { sub: 55, hoagie: 5,  grinder: 4,  hero: 28, poboy: 1,  other: 7 },
      DV:  { sub: 40, hoagie: 48, grinder: 3,  hero: 3,  poboy: 1,  other: 5 },
      SO:  { sub: 72, hoagie: 2,  grinder: 2,  hero: 2,  poboy: 12, other: 10 },
      TX:  { sub: 78, hoagie: 2,  grinder: 1,  hero: 2,  poboy: 6,  other: 11 },
      IN:  { sub: 82, hoagie: 3,  grinder: 3,  hero: 2,  poboy: 1,  other: 9 },
      UM:  { sub: 84, hoagie: 2,  grinder: 2,  hero: 2,  poboy: 1,  other: 9 },
      ML:  { sub: 82, hoagie: 3,  grinder: 2,  hero: 2,  poboy: 2,  other: 9 },
      MW:  { sub: 84, hoagie: 2,  grinder: 2,  hero: 2,  poboy: 1,  other: 9 },
      WC:  { sub: 80, hoagie: 2,  grinder: 3,  hero: 3,  poboy: 2,  other: 10 }
    }
  },
  {
    id: "crustacean",
    text: "What do you call the small lobster-like creature in lakes and streams?",
    options: [
      { id: "crawfish", label: "Crawfish" },
      { id: "crayfish", label: "Crayfish" },
      { id: "crawdad", label: "Crawdad" },
      { id: "other", label: "Something else" }
    ],
    base: { crawfish: 35, crayfish: 35, crawdad: 25, other: 5 },
    over: {
      NE:  { crawfish: 10, crayfish: 80, crawdad: 6,  other: 4 },
      NYC: { crawfish: 12, crayfish: 78, crawdad: 6,  other: 4 },
      DV:  { crawfish: 20, crayfish: 65, crawdad: 11, other: 4 },
      SO:  { crawfish: 70, crayfish: 12, crawdad: 15, other: 3 },
      TX:  { crawfish: 68, crayfish: 10, crawdad: 19, other: 3 },
      IN:  { crawfish: 20, crayfish: 55, crawdad: 22, other: 3 },
      UM:  { crawfish: 15, crayfish: 45, crawdad: 37, other: 3 },
      ML:  { crawfish: 18, crayfish: 25, crawdad: 54, other: 3 },
      MW:  { crawfish: 18, crayfish: 35, crawdad: 44, other: 3 },
      WC:  { crawfish: 22, crayfish: 58, crawdad: 17, other: 3 }
    }
  },
  {
    id: "pillbug",
    text: "What do you call the gray bug that rolls into a ball when touched?",
    options: [
      { id: "roly_poly", label: "Roly poly" },
      { id: "pill_bug", label: "Pill bug" },
      { id: "potato_bug", label: "Potato bug" },
      { id: "doodlebug", label: "Doodlebug" },
      { id: "sow_bug", label: "Sow bug" },
      { id: "other", label: "Something else" }
    ],
    base: { roly_poly: 40, pill_bug: 25, potato_bug: 15, doodlebug: 8, sow_bug: 7, other: 5 },
    over: {
      NE:  { roly_poly: 35, pill_bug: 30, potato_bug: 8,  doodlebug: 3,  sow_bug: 18, other: 6 },
      NYC: { roly_poly: 40, pill_bug: 28, potato_bug: 8,  doodlebug: 3,  sow_bug: 15, other: 6 },
      DV:  { roly_poly: 45, pill_bug: 28, potato_bug: 8,  doodlebug: 4,  sow_bug: 10, other: 5 },
      SO:  { roly_poly: 70, pill_bug: 12, potato_bug: 3,  doodlebug: 12, sow_bug: 1,  other: 2 },
      TX:  { roly_poly: 78, pill_bug: 10, potato_bug: 3,  doodlebug: 6,  sow_bug: 1,  other: 2 },
      IN:  { roly_poly: 35, pill_bug: 35, potato_bug: 15, doodlebug: 3,  sow_bug: 9,  other: 3 },
      UM:  { roly_poly: 25, pill_bug: 35, potato_bug: 30, doodlebug: 2,  sow_bug: 6,  other: 2 },
      ML:  { roly_poly: 45, pill_bug: 30, potato_bug: 15, doodlebug: 6,  sow_bug: 2,  other: 2 },
      MW:  { roly_poly: 35, pill_bug: 30, potato_bug: 28, doodlebug: 2,  sow_bug: 3,  other: 2 },
      WC:  { roly_poly: 30, pill_bug: 35, potato_bug: 28, doodlebug: 2,  sow_bug: 3,  other: 2 }
    }
  },
  {
    id: "firefly",
    text: "What do you call the flying insect that glows at night?",
    options: [
      { id: "firefly", label: "Firefly" },
      { id: "lightning_bug", label: "Lightning bug" },
      { id: "both", label: "I use both equally" },
      { id: "other", label: "Something else" }
    ],
    base: { firefly: 35, lightning_bug: 55, both: 7, other: 3 },
    over: {
      NE:  { firefly: 55, lightning_bug: 38, both: 5, other: 2 },
      NYC: { firefly: 58, lightning_bug: 36, both: 4, other: 2 },
      DV:  { firefly: 35, lightning_bug: 58, both: 5, other: 2 },
      SO:  { firefly: 18, lightning_bug: 78, both: 3, other: 1 },
      TX:  { firefly: 20, lightning_bug: 76, both: 3, other: 1 },
      IN:  { firefly: 30, lightning_bug: 63, both: 5, other: 2 },
      UM:  { firefly: 35, lightning_bug: 58, both: 5, other: 2 },
      ML:  { firefly: 25, lightning_bug: 70, both: 4, other: 1 },
      MW:  { firefly: 60, lightning_bug: 33, both: 5, other: 2 },
      WC:  { firefly: 68, lightning_bug: 26, both: 4, other: 2 }
    }
  },
  {
    id: "water_dispenser",
    text: "What do you call the thing you drink water from at school?",
    options: [
      { id: "water_fountain", label: "Water fountain" },
      { id: "drinking_fountain", label: "Drinking fountain" },
      { id: "bubbler", label: "Bubbler" },
      { id: "other", label: "Something else" }
    ],
    base: { water_fountain: 60, drinking_fountain: 33, bubbler: 5, other: 2 },
    over: {
      NE:  { water_fountain: 50, drinking_fountain: 20, bubbler: 28, other: 2 },
      NYC: { water_fountain: 80, drinking_fountain: 16, bubbler: 2,  other: 2 },
      DV:  { water_fountain: 78, drinking_fountain: 18, bubbler: 2,  other: 2 },
      SO:  { water_fountain: 82, drinking_fountain: 15, bubbler: 1,  other: 2 },
      TX:  { water_fountain: 80, drinking_fountain: 17, bubbler: 1,  other: 2 },
      IN:  { water_fountain: 40, drinking_fountain: 40, bubbler: 18, other: 2 },
      UM:  { water_fountain: 42, drinking_fountain: 54, bubbler: 2,  other: 2 },
      ML:  { water_fountain: 55, drinking_fountain: 42, bubbler: 1,  other: 2 },
      MW:  { water_fountain: 45, drinking_fountain: 52, bubbler: 1,  other: 2 },
      WC:  { water_fountain: 55, drinking_fountain: 42, bubbler: 1,  other: 2 }
    }
  },
  {
    id: "cot_caught",
    text: "Do you pronounce \"cot\" and \"caught\" the same?",
    options: [
      { id: "merged", label: "Yes, they sound identical" },
      { id: "distinct", label: "No, they sound different" }
    ],
    base: { merged: 45, distinct: 55 },
    over: {
      NE:  { merged: 60, distinct: 40 },
      NYC: { merged: 15, distinct: 85 },
      DV:  { merged: 35, distinct: 65 },
      SO:  { merged: 25, distinct: 75 },
      TX:  { merged: 30, distinct: 70 },
      IN:  { merged: 15, distinct: 85 },
      UM:  { merged: 45, distinct: 55 },
      ML:  { merged: 55, distinct: 45 },
      MW:  { merged: 85, distinct: 15 },
      WC:  { merged: 82, distinct: 18 }
    }
  },
  {
    id: "mary_merry_marry",
    text: "How do you pronounce \"Mary,\" \"merry,\" and \"marry\"?",
    options: [
      { id: "all_same", label: "All three sound the same" },
      { id: "all_different", label: "All three sound different" },
      { id: "two_same", label: "Two sound the same, one different" }
    ],
    base: { all_same: 57, all_different: 18, two_same: 25 },
    over: {
      NE:  { all_same: 30, all_different: 45, two_same: 25 },
      NYC: { all_same: 15, all_different: 60, two_same: 25 },
      DV:  { all_same: 35, all_different: 40, two_same: 25 },
      SO:  { all_same: 68, all_different: 10, two_same: 22 },
      TX:  { all_same: 70, all_different: 8,  two_same: 22 },
      IN:  { all_same: 55, all_different: 18, two_same: 27 },
      UM:  { all_same: 72, all_different: 8,  two_same: 20 },
      ML:  { all_same: 72, all_different: 8,  two_same: 20 },
      MW:  { all_same: 82, all_different: 5,  two_same: 13 },
      WC:  { all_same: 80, all_different: 6,  two_same: 14 }
    }
  },
  {
    id: "big_road",
    text: "What is your general term for a big, fast road?",
    options: [
      { id: "highway", label: "Highway" },
      { id: "freeway", label: "Freeway" },
      { id: "expressway", label: "Expressway" },
      { id: "turnpike", label: "Turnpike" },
      { id: "other", label: "Something else" }
    ],
    base: { highway: 55, freeway: 25, expressway: 10, turnpike: 7, other: 3 },
    over: {
      NE:  { highway: 48, freeway: 6,  expressway: 8,  turnpike: 35, other: 3 },
      NYC: { highway: 42, freeway: 6,  expressway: 35, turnpike: 14, other: 3 },
      DV:  { highway: 45, freeway: 6,  expressway: 14, turnpike: 32, other: 3 },
      SO:  { highway: 70, freeway: 12, expressway: 6,  turnpike: 9,  other: 3 },
      TX:  { highway: 66, freeway: 24, expressway: 6,  turnpike: 2,  other: 2 },
      IN:  { highway: 45, freeway: 20, expressway: 28, turnpike: 5,  other: 2 },
      UM:  { highway: 62, freeway: 28, expressway: 6,  turnpike: 2,  other: 2 },
      ML:  { highway: 66, freeway: 24, expressway: 6,  turnpike: 2,  other: 2 },
      MW:  { highway: 55, freeway: 38, expressway: 4,  turnpike: 1,  other: 2 },
      WC:  { highway: 28, freeway: 66, expressway: 3,  turnpike: 1,  other: 2 }
    }
  },
  {
    id: "pecan",
    text: "How do you pronounce \"pecan\"?",
    options: [
      { id: "puh_kahn", label: "puh-KAHN" },
      { id: "pee_can", label: "PEE-can" },
      { id: "pee_kahn", label: "PEE-kahn" },
      { id: "pick_ahn", label: "pick-AHN" },
      { id: "other", label: "Something else" }
    ],
    base: { puh_kahn: 45, pee_can: 20, pee_kahn: 20, pick_ahn: 12, other: 3 },
    over: {
      NE:  { puh_kahn: 30, pee_can: 45, pee_kahn: 15, pick_ahn: 7,  other: 3 },
      NYC: { puh_kahn: 32, pee_can: 44, pee_kahn: 15, pick_ahn: 6,  other: 3 },
      DV:  { puh_kahn: 38, pee_can: 38, pee_kahn: 15, pick_ahn: 6,  other: 3 },
      SO:  { puh_kahn: 55, pee_can: 8,  pee_kahn: 15, pick_ahn: 20, other: 2 },
      TX:  { puh_kahn: 58, pee_can: 6,  pee_kahn: 14, pick_ahn: 20, other: 2 },
      IN:  { puh_kahn: 45, pee_can: 22, pee_kahn: 22, pick_ahn: 8,  other: 3 },
      UM:  { puh_kahn: 42, pee_can: 18, pee_kahn: 28, pick_ahn: 9,  other: 3 },
      ML:  { puh_kahn: 50, pee_can: 12, pee_kahn: 22, pick_ahn: 13, other: 3 },
      MW:  { puh_kahn: 50, pee_can: 16, pee_kahn: 22, pick_ahn: 9,  other: 3 },
      WC:  { puh_kahn: 52, pee_can: 18, pee_kahn: 20, pick_ahn: 7,  other: 3 }
    }
  },
  {
    id: "cake_topping",
    text: "What do you call the sweet spread on top of a cake?",
    options: [
      { id: "frosting", label: "Frosting" },
      { id: "icing", label: "Icing" },
      { id: "both", label: "I use both equally" },
      { id: "other", label: "Something else" }
    ],
    base: { frosting: 58, icing: 32, both: 8, other: 2 },
    over: {
      NE:  { frosting: 55, icing: 35, both: 8, other: 2 },
      NYC: { frosting: 48, icing: 42, both: 8, other: 2 },
      DV:  { frosting: 45, icing: 45, both: 8, other: 2 },
      SO:  { frosting: 42, icing: 50, both: 6, other: 2 },
      TX:  { frosting: 45, icing: 47, both: 6, other: 2 },
      IN:  { frosting: 62, icing: 28, both: 8, other: 2 },
      UM:  { frosting: 68, icing: 24, both: 6, other: 2 },
      ML:  { frosting: 60, icing: 32, both: 6, other: 2 },
      MW:  { frosting: 66, icing: 26, both: 6, other: 2 },
      WC:  { frosting: 66, icing: 26, both: 6, other: 2 }
    }
  },
  {
    id: "road_circle",
    text: "What do you call a circular road intersection?",
    options: [
      { id: "roundabout", label: "Roundabout" },
      { id: "traffic_circle", label: "Traffic circle" },
      { id: "rotary", label: "Rotary" },
      { id: "other", label: "Something else" }
    ],
    base: { roundabout: 60, traffic_circle: 25, rotary: 12, other: 3 },
    over: {
      NE:  { roundabout: 45, traffic_circle: 12, rotary: 40, other: 3 },
      NYC: { roundabout: 45, traffic_circle: 45, rotary: 7,  other: 3 },
      DV:  { roundabout: 50, traffic_circle: 40, rotary: 7,  other: 3 },
      SO:  { roundabout: 72, traffic_circle: 22, rotary: 3,  other: 3 },
      TX:  { roundabout: 74, traffic_circle: 20, rotary: 3,  other: 3 },
      IN:  { roundabout: 72, traffic_circle: 22, rotary: 3,  other: 3 },
      UM:  { roundabout: 74, traffic_circle: 20, rotary: 3,  other: 3 },
      ML:  { roundabout: 74, traffic_circle: 20, rotary: 3,  other: 3 },
      MW:  { roundabout: 76, traffic_circle: 18, rotary: 3,  other: 3 },
      WC:  { roundabout: 74, traffic_circle: 20, rotary: 3,  other: 3 }
    }
  },
  {
    id: "grass_strip",
    text: "What do you call the strip of grass between the sidewalk and the street?",
    options: [
      { id: "no_name", label: "It has no name" },
      { id: "tree_lawn", label: "Tree lawn" },
      { id: "parkway", label: "Parkway" },
      { id: "terrace", label: "Terrace" },
      { id: "berm", label: "Berm" },
      { id: "devil_strip", label: "Devil strip" },
      { id: "verge", label: "Verge" },
      { id: "other", label: "Something else" }
    ],
    base: { no_name: 55, tree_lawn: 10, parkway: 8, terrace: 6, berm: 6, devil_strip: 2, verge: 5, other: 8 },
    over: {
      NE:  { no_name: 62, tree_lawn: 5,  parkway: 6,  terrace: 3,  berm: 3,  devil_strip: 0, verge: 8, other: 13 },
      NYC: { no_name: 55, tree_lawn: 6,  parkway: 18, terrace: 2,  berm: 2,  devil_strip: 0, verge: 5, other: 12 },
      DV:  { no_name: 55, tree_lawn: 8,  parkway: 6,  terrace: 2,  berm: 14, devil_strip: 1, verge: 4, other: 10 },
      SO:  { no_name: 68, tree_lawn: 4,  parkway: 4,  terrace: 2,  berm: 2,  devil_strip: 0, verge: 6, other: 14 },
      TX:  { no_name: 70, tree_lawn: 4,  parkway: 4,  terrace: 2,  berm: 2,  devil_strip: 0, verge: 4, other: 14 },
      IN:  { no_name: 45, tree_lawn: 25, parkway: 6,  terrace: 3,  berm: 6,  devil_strip: 6, verge: 3, other: 6 },
      UM:  { no_name: 45, tree_lawn: 8,  parkway: 6,  terrace: 22, berm: 4,  devil_strip: 0, verge: 4, other: 11 },
      ML:  { no_name: 60, tree_lawn: 8,  parkway: 6,  terrace: 4,  berm: 4,  devil_strip: 0, verge: 4, other: 14 },
      MW:  { no_name: 62, tree_lawn: 6,  parkway: 8,  terrace: 3,  berm: 3,  devil_strip: 0, verge: 5, other: 13 },
      WC:  { no_name: 58, tree_lawn: 6,  parkway: 16, terrace: 3,  berm: 2,  devil_strip: 0, verge: 4, other: 11 }
    }
  },
  {
    id: "yard_sale",
    text: "What do you call a sale of unwanted items at your home?",
    options: [
      { id: "garage_sale", label: "Garage sale" },
      { id: "yard_sale", label: "Yard sale" },
      { id: "rummage_sale", label: "Rummage sale" },
      { id: "tag_sale", label: "Tag sale" },
      { id: "other", label: "Something else" }
    ],
    base: { garage_sale: 50, yard_sale: 38, rummage_sale: 6, tag_sale: 4, other: 2 },
    over: {
      NE:  { garage_sale: 25, yard_sale: 45, rummage_sale: 4,  tag_sale: 24, other: 2 },
      NYC: { garage_sale: 35, yard_sale: 45, rummage_sale: 4,  tag_sale: 14, other: 2 },
      DV:  { garage_sale: 42, yard_sale: 48, rummage_sale: 4,  tag_sale: 4,  other: 2 },
      SO:  { garage_sale: 40, yard_sale: 55, rummage_sale: 2,  tag_sale: 1,  other: 2 },
      TX:  { garage_sale: 58, yard_sale: 38, rummage_sale: 2,  tag_sale: 1,  other: 1 },
      IN:  { garage_sale: 60, yard_sale: 30, rummage_sale: 8,  tag_sale: 1,  other: 1 },
      UM:  { garage_sale: 55, yard_sale: 22, rummage_sale: 21, tag_sale: 1,  other: 1 },
      ML:  { garage_sale: 62, yard_sale: 30, rummage_sale: 6,  tag_sale: 1,  other: 1 },
      MW:  { garage_sale: 66, yard_sale: 28, rummage_sale: 4,  tag_sale: 1,  other: 1 },
      WC:  { garage_sale: 64, yard_sale: 30, rummage_sale: 4,  tag_sale: 1,  other: 1 }
    }
  },
  {
    id: "halloween_eve",
    text: "What do you call the night before Halloween?",
    options: [
      { id: "no_name", label: "It has no name" },
      { id: "mischief_night", label: "Mischief Night" },
      { id: "devils_night", label: "Devil's Night" },
      { id: "cabbage_night", label: "Cabbage Night" },
      { id: "goosey_night", label: "Goosey Night" },
      { id: "other", label: "Something else" }
    ],
    base: { no_name: 72, mischief_night: 12, devils_night: 6, cabbage_night: 4, goosey_night: 2, other: 4 },
    over: {
      NE:  { no_name: 60, mischief_night: 8,  devils_night: 3,  cabbage_night: 24, goosey_night: 2, other: 3 },
      NYC: { no_name: 55, mischief_night: 28, devils_night: 3,  cabbage_night: 6,  goosey_night: 5, other: 3 },
      DV:  { no_name: 58, mischief_night: 30, devils_night: 4,  cabbage_night: 2,  goosey_night: 2, other: 4 },
      SO:  { no_name: 86, mischief_night: 3,  devils_night: 2,  cabbage_night: 1,  goosey_night: 0, other: 8 },
      TX:  { no_name: 88, mischief_night: 2,  devils_night: 2,  cabbage_night: 1,  goosey_night: 0, other: 7 },
      IN:  { no_name: 70, mischief_night: 5,  devils_night: 18, cabbage_night: 2,  goosey_night: 0, other: 5 },
      UM:  { no_name: 82, mischief_night: 4,  devils_night: 6,  cabbage_night: 2,  goosey_night: 0, other: 6 },
      ML:  { no_name: 84, mischief_night: 4,  devils_night: 4,  cabbage_night: 1,  goosey_night: 0, other: 7 },
      MW:  { no_name: 86, mischief_night: 3,  devils_night: 3,  cabbage_night: 1,  goosey_night: 0, other: 7 },
      WC:  { no_name: 86, mischief_night: 3,  devils_night: 3,  cabbage_night: 1,  goosey_night: 0, other: 7 }
    }
  },
  {
    id: "outdoor_tap",
    text: "What do you call the outdoor tap that a garden hose attaches to?",
    options: [
      { id: "faucet", label: "Faucet" },
      { id: "spigot", label: "Spigot" },
      { id: "spicket", label: "Spicket" },
      { id: "hydrant", label: "Hydrant" },
      { id: "other", label: "Something else" }
    ],
    base: { faucet: 42, spigot: 38, spicket: 12, hydrant: 4, other: 4 },
    over: {
      NE:  { faucet: 50, spigot: 40, spicket: 3,  hydrant: 4, other: 3 },
      NYC: { faucet: 55, spigot: 36, spicket: 3,  hydrant: 3, other: 3 },
      DV:  { faucet: 42, spigot: 45, spicket: 6,  hydrant: 4, other: 3 },
      SO:  { faucet: 30, spigot: 38, spicket: 28, hydrant: 2, other: 2 },
      TX:  { faucet: 35, spigot: 40, spicket: 21, hydrant: 2, other: 2 },
      IN:  { faucet: 45, spigot: 44, spicket: 6,  hydrant: 3, other: 2 },
      UM:  { faucet: 48, spigot: 44, spicket: 4,  hydrant: 2, other: 2 },
      ML:  { faucet: 42, spigot: 44, spicket: 10, hydrant: 2, other: 2 },
      MW:  { faucet: 50, spigot: 42, spicket: 4,  hydrant: 2, other: 2 },
      WC:  { faucet: 55, spigot: 38, spicket: 3,  hydrant: 2, other: 2 }
    }
  },
  {
    id: "sun_rain",
    text: "What do you call it when rain falls while the sun is shining?",
    options: [
      { id: "no_term", label: "I have no word for this" },
      { id: "sunshower", label: "Sunshower" },
      { id: "devil_wife", label: "The devil is beating his wife" },
      { id: "monkeys", label: "Monkey's wedding" },
      { id: "other", label: "Something else" }
    ],
    base: { no_term: 72, sunshower: 14, devil_wife: 6, monkeys: 1, other: 7 },
    over: {
      NE:  { no_term: 62, sunshower: 28, devil_wife: 2,  monkeys: 0, other: 8 },
      NYC: { no_term: 60, sunshower: 30, devil_wife: 2,  monkeys: 0, other: 8 },
      DV:  { no_term: 65, sunshower: 24, devil_wife: 3,  monkeys: 0, other: 8 },
      SO:  { no_term: 62, sunshower: 6,  devil_wife: 24, monkeys: 0, other: 8 },
      TX:  { no_term: 64, sunshower: 5,  devil_wife: 23, monkeys: 0, other: 8 },
      IN:  { no_term: 76, sunshower: 12, devil_wife: 4,  monkeys: 0, other: 8 },
      UM:  { no_term: 80, sunshower: 8,  devil_wife: 3,  monkeys: 0, other: 9 },
      ML:  { no_term: 76, sunshower: 8,  devil_wife: 8,  monkeys: 0, other: 8 },
      MW:  { no_term: 80, sunshower: 8,  devil_wife: 3,  monkeys: 0, other: 9 },
      WC:  { no_term: 80, sunshower: 9,  devil_wife: 2,  monkeys: 0, other: 9 }
    }
  },
  {
    id: "intensifier",
    text: "Fill in: \"That movie was ___ good.\"",
    options: [
      { id: "very", label: "very" },
      { id: "real", label: "real" },
      { id: "wicked", label: "wicked" },
      { id: "hella", label: "hella" },
      { id: "mad", label: "mad" },
      { id: "super", label: "super" },
      { id: "other", label: "Something else" }
    ],
    base: { very: 38, real: 18, wicked: 4, hella: 6, mad: 3, super: 22, other: 9 },
    over: {
      NE:  { very: 30, real: 8,  wicked: 40, hella: 1,  mad: 2,  super: 14, other: 5 },
      NYC: { very: 34, real: 10, wicked: 3,  hella: 2,  mad: 18, super: 22, other: 11 },
      DV:  { very: 38, real: 12, wicked: 3,  hella: 2,  mad: 8,  super: 27, other: 10 },
      SO:  { very: 34, real: 34, wicked: 1,  hella: 1,  mad: 2,  super: 20, other: 8 },
      TX:  { very: 34, real: 32, wicked: 1,  hella: 2,  mad: 2,  super: 21, other: 8 },
      IN:  { very: 40, real: 14, wicked: 2,  hella: 2,  mad: 3,  super: 30, other: 9 },
      UM:  { very: 42, real: 12, wicked: 2,  hella: 2,  mad: 2,  super: 31, other: 9 },
      ML:  { very: 40, real: 18, wicked: 1,  hella: 2,  mad: 2,  super: 29, other: 8 },
      MW:  { very: 40, real: 12, wicked: 1,  hella: 8,  mad: 2,  super: 30, other: 7 },
      WC:  { very: 36, real: 10, wicked: 1,  hella: 22, mad: 2,  super: 22, other: 7 }
    }
  }
];

// ---- Derived helpers -------------------------------------------------------

const QUESTIONS_BY_ID = {};
QUESTIONS.forEach(q => { QUESTIONS_BY_ID[q.id] = q; });

function normalizeDist(distObj) {
  let total = 0;
  for (const k in distObj) total += distObj[k];
  const out = {};
  if (total <= 0) return out;
  for (const k in distObj) out[k] = distObj[k] / total;
  return out;
}

// Probability vector for a question in a given region.
function regionDist(q, region) {
  const vec = (q.over && q.over[region]) ? q.over[region] : q.base;
  return normalizeDist(vec);
}

// National average probability of an option (unweighted mean across regions).
function nationalProb(q, optionId) {
  let s = 0;
  REGION_KEYS.forEach(r => { s += (regionDist(q, r)[optionId] || 0); });
  return s / REGION_KEYS.length;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    REGION_KEYS, REGION_NAMES, STATE_REGION, CITIES, QUESTIONS,
    QUESTIONS_BY_ID, normalizeDist, regionDist, nationalProb
  };
}
