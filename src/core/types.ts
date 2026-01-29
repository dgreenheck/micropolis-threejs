/**
 * Micropolis Type Definitions
 */

/**
 * History data types
 */
export enum HistoryType {
  RES = 0,      // Residential
  COM = 1,      // Commercial
  IND = 2,      // Industrial
  MONEY = 3,    // Money
  CRIME = 4,    // Crime
  POLLUTION = 5, // Pollution
  COUNT = 6,
}

/**
 * History time scales
 */
export enum HistoryScale {
  SHORT = 0,  // 10 years
  LONG = 1,   // 120 years
  COUNT = 2,
}

/**
 * Map overlay types
 */
export enum MapType {
  ALL = 0,
  RES = 1,
  COM = 2,
  IND = 3,
  POWER = 4,
  ROAD = 5,
  POPULATION_DENSITY = 6,
  RATE_OF_GROWTH = 7,
  TRAFFIC_DENSITY = 8,
  POLLUTION = 9,
  CRIME = 10,
  LAND_VALUE = 11,
  FIRE_RADIUS = 12,
  POLICE_RADIUS = 13,
  DYNAMIC = 14,
  COUNT = 15,
}

/**
 * Sprite types
 */
export enum SpriteType {
  NOTUSED = 0,
  TRAIN = 1,
  HELICOPTER = 2,
  AIRPLANE = 3,
  SHIP = 4,
  MONSTER = 5,
  TORNADO = 6,
  EXPLOSION = 7,
  BUS = 8,
  COUNT = 9,
}

/**
 * Tool result codes
 */
export enum ToolResult {
  NO_MONEY = -2,
  NEED_BULLDOZE = -1,
  FAILED = 0,
  OK = 1,
}

/**
 * Editing tools
 */
export enum EditingTool {
  RESIDENTIAL = 0,
  COMMERCIAL = 1,
  INDUSTRIAL = 2,
  FIRESTATION = 3,
  POLICESTATION = 4,
  QUERY = 5,
  WIRE = 6,
  BULLDOZER = 7,
  RAILROAD = 8,
  ROAD = 9,
  STADIUM = 10,
  PARK = 11,
  SEAPORT = 12,
  COALPOWER = 13,
  NUCLEARPOWER = 14,
  AIRPORT = 15,
  NETWORK = 16,
  WATER = 17,
  LAND = 18,
  FOREST = 19,
  COUNT = 20,
}

/**
 * Scenarios
 */
export enum Scenario {
  NONE = 0,
  DULLSVILLE = 1,     // Boredom
  SAN_FRANCISCO = 2,  // Earthquake
  HAMBURG = 3,        // Fire bombs
  BERN = 4,           // Traffic
  TOKYO = 5,          // Monster
  DETROIT = 6,        // Crime
  BOSTON = 7,         // Nuclear meltdown
  RIO = 8,            // Flooding
  COUNT = 9,
}

/**
 * Zone types for traffic destination
 */
export enum ZoneType {
  COMMERCIAL = 0,
  INDUSTRIAL = 1,
  RESIDENTIAL = 2,
  NUM_DESTINATIONS = 3,
}

/**
 * City problems that citizens vote on
 */
export enum CityVotingProblems {
  CRIME = 0,
  POLLUTION = 1,
  HOUSING = 2,
  TAXES = 3,
  TRAFFIC = 4,
  UNEMPLOYMENT = 5,
  FIRE = 6,
  NUM_PROBLEMS = 7,
  PROBLEM_COMPLAINTS = 4,
}

/**
 * City class based on population
 */
export enum CityClass {
  VILLAGE = 0,      // < 2,000
  TOWN = 1,         // 2,000 - 10,000
  CITY = 2,         // 10,000 - 50,000
  CAPITAL = 3,      // 50,000 - 100,000
  METROPOLIS = 4,   // 100,000 - 500,000
  MEGALOPOLIS = 5,  // > 500,000
  NUM_CITIES = 6,
}

/**
 * Game difficulty levels
 */
export enum GameLevel {
  EASY = 0,
  MEDIUM = 1,
  HARD = 2,
  COUNT = 3,
}

/**
 * Simulation speed
 */
export enum SimSpeed {
  PAUSED = 0,
  SLOW = 1,
  MEDIUM = 2,
  FAST = 3,
}

/**
 * Direction enumeration for 4-way movement
 */
export enum Direction {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
  NONE = 4,
}

/**
 * Direction enumeration for 8-way movement
 */
export enum Direction8 {
  NORTH = 0,
  NORTHEAST = 1,
  EAST = 2,
  SOUTHEAST = 3,
  SOUTH = 4,
  SOUTHWEST = 5,
  WEST = 6,
  NORTHWEST = 7,
  NONE = 8,
}

/**
 * Position in the world
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Sprite object
 */
export interface Sprite {
  type: SpriteType;
  frame: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  xHot: number;
  yHot: number;
  origX: number;
  origY: number;
  destX: number;
  destY: number;
  count: number;
  soundCount: number;
  dir: number;
  newDir: number;
  step: number;
  flag: number;
  control: number;
  turn: number;
  accel: number;
  speed: number;
}

/**
 * Budget data
 */
export interface BudgetData {
  totalFunds: number;
  taxFund: number;
  roadFund: number;
  policeFund: number;
  fireFund: number;
  roadSpend: number;
  policeSpend: number;
  fireSpend: number;
  roadPercent: number;
  policePercent: number;
  firePercent: number;
  roadEffect: number;
  policeEffect: number;
  fireEffect: number;
  cityTax: number;
}

/**
 * City statistics
 */
export interface CityStats {
  totalPop: number;
  resPop: number;
  comPop: number;
  indPop: number;
  resZonePop: number;
  comZonePop: number;
  indZonePop: number;
  hospitalPop: number;
  churchPop: number;
  policeStationPop: number;
  fireStationPop: number;
  stadiumPop: number;
  coalPowerPop: number;
  nuclearPowerPop: number;
  seaportPop: number;
  airportPop: number;
  crimeAverage: number;
  pollutionAverage: number;
  landValueAverage: number;
  cityScore: number;
  cityClass: CityClass;
}

/**
 * Tool costs
 */
export const TOOL_COSTS: Record<EditingTool, number> = {
  [EditingTool.RESIDENTIAL]: 100,
  [EditingTool.COMMERCIAL]: 100,
  [EditingTool.INDUSTRIAL]: 100,
  [EditingTool.FIRESTATION]: 500,
  [EditingTool.POLICESTATION]: 500,
  [EditingTool.QUERY]: 0,
  [EditingTool.WIRE]: 5,
  [EditingTool.BULLDOZER]: 1,
  [EditingTool.RAILROAD]: 20,
  [EditingTool.ROAD]: 10,
  [EditingTool.STADIUM]: 5000,
  [EditingTool.PARK]: 10,
  [EditingTool.SEAPORT]: 3000,
  [EditingTool.COALPOWER]: 3000,
  [EditingTool.NUCLEARPOWER]: 5000,
  [EditingTool.AIRPORT]: 10000,
  [EditingTool.NETWORK]: 100,
  [EditingTool.WATER]: 0,
  [EditingTool.LAND]: 0,
  [EditingTool.FOREST]: 0,
  [EditingTool.COUNT]: 0,
};

/**
 * Tool sizes (width x height)
 */
export const TOOL_SIZES: Record<EditingTool, { width: number; height: number }> = {
  [EditingTool.RESIDENTIAL]: { width: 3, height: 3 },
  [EditingTool.COMMERCIAL]: { width: 3, height: 3 },
  [EditingTool.INDUSTRIAL]: { width: 3, height: 3 },
  [EditingTool.FIRESTATION]: { width: 3, height: 3 },
  [EditingTool.POLICESTATION]: { width: 3, height: 3 },
  [EditingTool.QUERY]: { width: 1, height: 1 },
  [EditingTool.WIRE]: { width: 1, height: 1 },
  [EditingTool.BULLDOZER]: { width: 1, height: 1 },
  [EditingTool.RAILROAD]: { width: 1, height: 1 },
  [EditingTool.ROAD]: { width: 1, height: 1 },
  [EditingTool.STADIUM]: { width: 4, height: 4 },
  [EditingTool.PARK]: { width: 1, height: 1 },
  [EditingTool.SEAPORT]: { width: 4, height: 4 },
  [EditingTool.COALPOWER]: { width: 4, height: 4 },
  [EditingTool.NUCLEARPOWER]: { width: 4, height: 4 },
  [EditingTool.AIRPORT]: { width: 6, height: 6 },
  [EditingTool.NETWORK]: { width: 1, height: 1 },
  [EditingTool.WATER]: { width: 1, height: 1 },
  [EditingTool.LAND]: { width: 1, height: 1 },
  [EditingTool.FOREST]: { width: 1, height: 1 },
  [EditingTool.COUNT]: { width: 0, height: 0 },
};

/**
 * City class population thresholds
 */
export const CITY_CLASS_POPULATION: number[] = [
  0,       // Village
  2000,    // Town
  10000,   // City
  50000,   // Capital
  100000,  // Metropolis
  500000,  // Megalopolis
];

/**
 * Month names
 */
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
