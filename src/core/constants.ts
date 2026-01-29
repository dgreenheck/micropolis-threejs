/**
 * Micropolis Constants
 * Based on the original Micropolis/SimCity source code
 */

// World dimensions
export const WORLD_W = 120;
export const WORLD_H = 100;

// Derived world sizes for different map resolutions
export const WORLD_W_2 = WORLD_W / 2;  // 60
export const WORLD_H_2 = WORLD_H / 2;  // 50
export const WORLD_W_4 = WORLD_W / 4;  // 30
export const WORLD_H_4 = WORLD_H / 4;  // 25
export const WORLD_W_8 = WORLD_W / 8;  // 15
export const WORLD_H_8 = Math.floor((WORLD_H + 7) / 8);  // 13

// Tile sizes
export const BITS_PER_TILE = 16;
export const BYTES_PER_TILE = 2;
export const EDITOR_TILE_SIZE = 16;

// Simulation timing
export const PASSES_PER_CITYTIME = 16;
export const CITYTIMES_PER_MONTH = 4;
export const CITYTIMES_PER_YEAR = CITYTIMES_PER_MONTH * 12;

// History
export const HISTORY_LENGTH = 480;
export const MISC_HISTORY_LENGTH = 240;
export const HISTORY_COUNT = 120;

// Power
export const POWER_STACK_SIZE = Math.floor((WORLD_W * WORLD_H) / 4);

// Position constants
export const NOWHERE = -1;

// Traffic
export const MAX_TRAFFIC_DISTANCE = 30;
export const MAX_ROAD_EFFECT = 32;
export const MAX_POLICE_STATION_EFFECT = 1000;
export const MAX_FIRE_STATION_EFFECT = 1000;

// Valves (demand indicators)
export const RES_VALVE_RANGE = 2000;
export const COM_VALVE_RANGE = 1500;
export const IND_VALVE_RANGE = 1500;

// Census frequencies
export const CENSUS_FREQUENCY_10 = 4;
export const CENSUS_FREQUENCY_120 = CENSUS_FREQUENCY_10 * 12;
export const TAX_FREQUENCY = 48;

// Default starting values
export const DEFAULT_STARTING_YEAR = 1900;
export const DEFAULT_CITY_TAX = 7;

// Budget defaults
export const DEFAULT_ROAD_PERCENT = 1.0;
export const DEFAULT_POLICE_PERCENT = 1.0;
export const DEFAULT_FIRE_PERCENT = 1.0;
