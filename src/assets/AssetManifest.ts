/**
 * Asset Manifest - Maps tile types to 3D model files
 */

import { Tiles } from '../core/tiles';

/**
 * Model asset definition
 */
export interface ModelAsset {
  path: string;
  scale?: number;
  rotation?: number; // Y-axis rotation in radians
}

/**
 * Building category with multiple model variants
 */
export interface BuildingCategory {
  models: ModelAsset[];
  size: number; // Zone size (1x1, 3x3, 4x4, etc.)
}

/**
 * Residential building models - small houses for low density
 */
export const RESIDENTIAL_HOUSES: ModelAsset[] = [
  { path: '/models/house01.glb', scale: 1.0 },
  { path: '/models/house02.glb', scale: 1.0 },
  { path: '/models/house03.glb', scale: 1.0 },
  { path: '/models/house04.glb', scale: 1.0 },
  { path: '/models/house05.glb', scale: 1.0 },
  { path: '/models/house06.glb', scale: 1.0 },
  { path: '/models/house07.glb', scale: 1.0 },
  { path: '/models/house08.glb', scale: 1.0 },
  { path: '/models/house09.glb', scale: 1.0 },
  { path: '/models/house10.glb', scale: 1.0 },
  { path: '/models/house11.glb', scale: 1.0 },
  { path: '/models/house12.glb', scale: 1.0 },
  { path: '/models/house13.glb', scale: 1.0 },
];

/**
 * Residential building models - higher density apartments
 */
export const RESIDENTIAL_APARTMENTS: ModelAsset[] = [
  { path: '/models/res2.glb', scale: 1.0 },
  { path: '/models/res3.glb', scale: 1.0 },
  { path: '/models/res4.glb', scale: 1.0 },
  { path: '/models/res05.glb', scale: 1.0 },
  { path: '/models/res06.glb', scale: 1.0 },
  { path: '/models/res09.glb', scale: 1.0 },
];

/**
 * Commercial building models
 */
export const COMMERCIAL_BUILDINGS: ModelAsset[] = [
  { path: '/models/com01.glb', scale: 1.0 },
  { path: '/models/com02.glb', scale: 1.0 },
  { path: '/models/com03.glb', scale: 1.0 },
  { path: '/models/com05.glb', scale: 1.0 },
  { path: '/models/com06.glb', scale: 1.0 },
  { path: '/models/com11.glb', scale: 1.0 },
];

/**
 * Industrial building models
 */
export const INDUSTRIAL_BUILDINGS: ModelAsset[] = [
  { path: '/models/ind01.glb', scale: 1.0 },
  { path: '/models/ind02.glb', scale: 1.0 },
];

/**
 * Special building models - single instances
 */
export const SPECIAL_BUILDINGS: Record<string, ModelAsset> = {
  coal: { path: '/models/coal.glb', scale: 1.0 },
  firestation: { path: '/models/firestation.glb', scale: 1.0 },
  police: { path: '/models/police.glb', scale: 1.0 },
  hospital: { path: '/models/hospital.glb', scale: 1.0 },
  church: { path: '/models/church.glb', scale: 1.0 },
};

/**
 * Tile ranges for residential zone levels
 * Based on original Micropolis zone development levels
 */
export const RESIDENTIAL_LEVELS: { min: number; max: number; category: 'house' | 'apartment' }[] = [
  { min: Tiles.HOUSE, max: 260, category: 'house' },       // Low density houses
  { min: 265, max: 404, category: 'apartment' },           // Higher density residential
];

/**
 * Get a model for a given tile value
 * @param tileValue The tile value (with LOMASK applied)
 * @returns The model asset to use, or null if no model
 */
export function getModelForTile(tileValue: number): ModelAsset | null {
  // Residential zones - houses (low density)
  if (tileValue >= Tiles.HOUSE && tileValue <= 260) {
    const index = (tileValue - Tiles.HOUSE) % RESIDENTIAL_HOUSES.length;
    return RESIDENTIAL_HOUSES[index];
  }

  // Residential zones - apartments (higher density)
  if (tileValue >= 265 && tileValue <= 404) {
    const index = (tileValue - 265) % RESIDENTIAL_APARTMENTS.length;
    return RESIDENTIAL_APARTMENTS[index];
  }

  // Hospital
  if (tileValue === Tiles.HOSPITAL) {
    return SPECIAL_BUILDINGS.hospital;
  }

  // Church
  if (tileValue === Tiles.CHURCH || (tileValue >= Tiles.CHURCH1BASE && tileValue <= Tiles.CHURCH7LAST)) {
    return SPECIAL_BUILDINGS.church;
  }

  // Commercial zones
  if (tileValue >= Tiles.CZB && tileValue <= Tiles.COMLAST) {
    const index = (tileValue - Tiles.CZB) % COMMERCIAL_BUILDINGS.length;
    return COMMERCIAL_BUILDINGS[index];
  }

  // Industrial zones
  if (tileValue >= Tiles.IZB && tileValue <= 692) {
    const index = (tileValue - Tiles.IZB) % INDUSTRIAL_BUILDINGS.length;
    return INDUSTRIAL_BUILDINGS[index];
  }

  // Coal power plant
  if (tileValue === Tiles.POWERPLANT) {
    return SPECIAL_BUILDINGS.coal;
  }

  // Fire station
  if (tileValue === Tiles.FIRESTATION) {
    return SPECIAL_BUILDINGS.firestation;
  }

  // Police station
  if (tileValue === Tiles.POLICESTATION) {
    return SPECIAL_BUILDINGS.police;
  }

  return null;
}

/**
 * Get the zone size for a given tile value
 * @param tileValue The tile value (zone center)
 * @returns The zone size (1, 3, 4, or 6 for airport)
 */
export function getZoneSize(tileValue: number): number {
  // Power plants are 4x4
  if (tileValue === Tiles.POWERPLANT || tileValue === Tiles.NUCLEAR) {
    return 4;
  }

  // Airport is 6x6
  if (tileValue === Tiles.AIRPORT) {
    return 6;
  }

  // Stadium is 4x4
  if (tileValue === Tiles.STADIUM || tileValue === Tiles.FULLSTADIUM) {
    return 4;
  }

  // Seaport is 4x4
  if (tileValue === Tiles.PORT) {
    return 4;
  }

  // Most zones are 3x3
  return 3;
}

/**
 * All model paths for preloading
 */
export const ALL_MODEL_PATHS: string[] = [
  ...RESIDENTIAL_HOUSES.map(m => m.path),
  ...RESIDENTIAL_APARTMENTS.map(m => m.path),
  ...COMMERCIAL_BUILDINGS.map(m => m.path),
  ...INDUSTRIAL_BUILDINGS.map(m => m.path),
  ...Object.values(SPECIAL_BUILDINGS).map(m => m.path),
];
