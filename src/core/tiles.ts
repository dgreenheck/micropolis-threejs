/**
 * Micropolis Tile Definitions
 * Based on the original Micropolis/SimCity source code
 */

/**
 * Map tile bit flags
 */
export enum TileBits {
  PWRBIT = 0x8000,   // bit 15, tile has power
  CONDBIT = 0x4000,  // bit 14, tile can conduct electricity
  BURNBIT = 0x2000,  // bit 13, tile can be lit on fire
  BULLBIT = 0x1000,  // bit 12, tile is bulldozable
  ANIMBIT = 0x0800,  // bit 11, tile is animated
  ZONEBIT = 0x0400,  // bit 10, tile is the center of a zone

  // Combined masks
  ALLBITS = 0xFC00,  // All status bits
  LOMASK = 0x03FF,   // Mask for tile character (lower 10 bits)

  // Common combinations
  BLBNBIT = BULLBIT | BURNBIT,
  BLBNCNBIT = BULLBIT | BURNBIT | CONDBIT,
  BNCNBIT = BURNBIT | CONDBIT,
}

/**
 * Map tile characters (the lower 10 bits of a tile value)
 */
export enum Tiles {
  DIRT = 0,

  // Water tiles
  RIVER = 2,
  REDGE = 3,
  CHANNEL = 4,
  FIRSTRIVEDGE = 5,
  LASTRIVEDGE = 20,
  WATER_LOW = 2,
  WATER_HIGH = 20,

  // Tree tiles
  TREEBASE = 21,
  WOODS_LOW = 21,
  LASTTREE = 36,
  WOODS = 37,
  UNUSED_TRASH1 = 38,
  UNUSED_TRASH2 = 39,
  WOODS_HIGH = 39,
  WOODS2 = 40,
  WOODS3 = 41,
  WOODS4 = 42,
  WOODS5 = 43,

  // Rubble
  RUBBLE = 44,
  LASTRUBBLE = 47,

  // Flood
  FLOOD = 48,
  LASTFLOOD = 51,

  // Radioactive
  RADTILE = 52,

  // Fire animation
  FIRE = 56,
  FIREBASE = 56,
  LASTFIRE = 63,

  // Roads
  HBRIDGE = 64,
  ROADBASE = 64,
  VBRIDGE = 65,
  ROADS = 66,
  ROADS2 = 67,
  ROADS3 = 68,
  ROADS4 = 69,
  ROADS5 = 70,
  ROADS6 = 71,
  ROADS7 = 72,
  ROADS8 = 73,
  ROADS9 = 74,
  ROADS10 = 75,
  INTERSECTION = 76,
  HROADPOWER = 77,
  VROADPOWER = 78,
  BRWH = 79,
  LTRFBASE = 80,
  BRWV = 95,
  BRWXXX1 = 111,
  BRWXXX2 = 127,
  BRWXXX3 = 143,
  HTRFBASE = 144,
  BRWXXX4 = 159,
  BRWXXX5 = 175,
  BRWXXX6 = 191,
  LASTROAD = 206,
  BRWXXX7 = 207,

  // Power lines
  HPOWER = 208,
  VPOWER = 209,
  LHPOWER = 210,
  LVPOWER = 211,
  LVPOWER2 = 212,
  LVPOWER3 = 213,
  LVPOWER4 = 214,
  LVPOWER5 = 215,
  LVPOWER6 = 216,
  LVPOWER7 = 217,
  LVPOWER8 = 218,
  LVPOWER9 = 219,
  LVPOWER10 = 220,
  RAILHPOWERV = 221,
  RAILVPOWERH = 222,
  POWERBASE = 208,
  LASTPOWER = 222,

  // Rail
  HRAIL = 224,
  VRAIL = 225,
  LHRAIL = 226,
  LVRAIL = 227,
  LVRAIL2 = 228,
  LVRAIL3 = 229,
  LVRAIL4 = 230,
  LVRAIL5 = 231,
  LVRAIL6 = 232,
  LVRAIL7 = 233,
  LVRAIL8 = 234,
  LVRAIL9 = 235,
  LVRAIL10 = 236,
  HRAILROAD = 237,
  VRAILROAD = 238,
  RAILBASE = 224,
  LASTRAIL = 238,

  ROADVPOWERH = 239,

  // Residential zones
  RESBASE = 240,
  FREEZ = 244,
  HOUSE = 249,
  LHTHR = 249,
  HHTHR = 260,
  RZB = 265,

  // Hospital
  HOSPITALBASE = 405,
  HOSPITAL = 409,

  // Church
  CHURCHBASE = 414,
  CHURCH0BASE = 414,
  CHURCH = 418,
  CHURCH0 = 418,

  // Commercial zones
  COMBASE = 423,
  COMCLR = 427,
  CZB = 436,
  COMLAST = 609,

  // Industrial zones
  INDBASE = 612,
  INDCLR = 616,
  LASTIND = 620,
  IND1 = 621,
  IZB = 625,
  IND2 = 641,
  IND3 = 644,
  IND4 = 649,
  IND5 = 650,
  IND6 = 676,
  IND7 = 677,
  IND8 = 686,
  IND9 = 689,

  // Seaport
  PORTBASE = 693,
  PORT = 698,
  LASTPORT = 708,

  // Airport
  AIRPORTBASE = 709,
  RADAR = 711,
  AIRPORT = 716,

  // Coal power plant
  COALBASE = 745,
  POWERPLANT = 750,
  LASTPOWERPLANT = 760,

  // Fire station
  FIRESTBASE = 761,
  FIRESTATION = 765,

  // Police station
  POLICESTBASE = 770,
  POLICESTATION = 774,

  // Stadium
  STADIUMBASE = 779,
  STADIUM = 784,
  FULLSTADIUM = 800,

  // Nuclear power plant
  NUCLEARBASE = 811,
  NUCLEAR = 816,
  LASTZONE = 826,

  // Miscellaneous
  LIGHTNINGBOLT = 827,
  HBRDG0 = 828,
  HBRDG1 = 829,
  HBRDG2 = 830,
  HBRDG3 = 831,
  HBRDG_END = 832,
  RADAR0 = 832,
  RADAR1 = 833,
  RADAR2 = 834,
  RADAR3 = 835,
  RADAR4 = 836,
  RADAR5 = 837,
  RADAR6 = 838,
  RADAR7 = 839,
  FOUNTAIN = 840,
  INDBASE2 = 844,
  TELEBASE = 844,
  TELELAST = 851,
  SMOKEBASE = 852,
  TINYEXP = 860,
  SOMETINYEXP = 864,
  LASTTINYEXP = 867,
  TINYEXPLAST = 883,

  // Coal smoke animation
  COALSMOKE1 = 916,
  COALSMOKE2 = 920,
  COALSMOKE3 = 924,
  COALSMOKE4 = 928,

  // Football game animation
  FOOTBALLGAME1 = 932,
  FOOTBALLGAME2 = 940,

  // Bridge animation
  VBRDG0 = 948,
  VBRDG1 = 949,
  VBRDG2 = 950,
  VBRDG3 = 951,

  // Nuclear swirl animation
  NUKESWIRL1 = 952,
  NUKESWIRL2 = 953,
  NUKESWIRL3 = 954,
  NUKESWIRL4 = 955,

  // Extended church tiles
  CHURCH1BASE = 956,
  CHURCH1 = 960,
  CHURCH2BASE = 965,
  CHURCH2 = 969,
  CHURCH3BASE = 974,
  CHURCH3 = 978,
  CHURCH4BASE = 983,
  CHURCH4 = 987,
  CHURCH5BASE = 992,
  CHURCH5 = 996,
  CHURCH6BASE = 1001,
  CHURCH6 = 1005,
  CHURCH7BASE = 1010,
  CHURCH7 = 1014,
  CHURCH7LAST = 1018,

  TILE_COUNT = 1024,
  TILE_INVALID = -1,
}

/**
 * Check if a tile is water
 */
export function isWater(tile: number): boolean {
  const t = tile & TileBits.LOMASK;
  return t >= Tiles.WATER_LOW && t <= Tiles.WATER_HIGH;
}

/**
 * Check if a tile is a tree/forest
 */
export function isTree(tile: number): boolean {
  const t = tile & TileBits.LOMASK;
  return t >= Tiles.WOODS_LOW && t <= Tiles.WOODS_HIGH;
}

/**
 * Check if a tile is rubble
 */
export function isRubble(tile: number): boolean {
  const t = tile & TileBits.LOMASK;
  return t >= Tiles.RUBBLE && t <= Tiles.LASTRUBBLE;
}

/**
 * Check if a tile is on fire
 */
export function isFire(tile: number): boolean {
  const t = tile & TileBits.LOMASK;
  return t >= Tiles.FIREBASE && t <= Tiles.LASTFIRE;
}

/**
 * Check if a tile is a road
 */
export function isRoad(tile: number): boolean {
  const t = tile & TileBits.LOMASK;
  return t >= Tiles.ROADBASE && t <= Tiles.LASTROAD;
}

/**
 * Check if a tile is a power line
 */
export function isPowerLine(tile: number): boolean {
  const t = tile & TileBits.LOMASK;
  return t >= Tiles.POWERBASE && t <= Tiles.LASTPOWER;
}

/**
 * Check if a tile is rail
 */
export function isRail(tile: number): boolean {
  const t = tile & TileBits.LOMASK;
  return t >= Tiles.RAILBASE && t <= Tiles.LASTRAIL;
}

/**
 * Check if a tile is a zone center
 */
export function isZoneCenter(tile: number): boolean {
  return (tile & TileBits.ZONEBIT) !== 0;
}

/**
 * Check if a tile has power
 */
export function hasPower(tile: number): boolean {
  return (tile & TileBits.PWRBIT) !== 0;
}

/**
 * Check if a tile is conductive
 */
export function isConductive(tile: number): boolean {
  return (tile & TileBits.CONDBIT) !== 0;
}

/**
 * Check if a tile is burnable
 */
export function isBurnable(tile: number): boolean {
  return (tile & TileBits.BURNBIT) !== 0;
}

/**
 * Check if a tile is bulldozable
 */
export function isBulldozable(tile: number): boolean {
  return (tile & TileBits.BULLBIT) !== 0;
}

/**
 * Check if a tile is animated
 */
export function isAnimated(tile: number): boolean {
  return (tile & TileBits.ANIMBIT) !== 0;
}

/**
 * Get the base tile value without flags
 */
export function getTileValue(tile: number): number {
  return tile & TileBits.LOMASK;
}
