/**
 * Micropolis Map System
 * Implements the various map data structures used in the simulation
 */

import { WORLD_W, WORLD_H } from './constants';

/**
 * Generic 2D map class with block-based storage
 */
export class GameMap<T> {
  public readonly width: number;
  public readonly height: number;
  public readonly blockSize: number;
  public readonly mapWidth: number;
  public readonly mapHeight: number;
  private data: T[];
  private defaultValue: T;

  constructor(blockSize: number, defaultValue: T) {
    this.blockSize = blockSize;
    this.width = WORLD_W;
    this.height = WORLD_H;
    this.mapWidth = Math.ceil(WORLD_W / blockSize);
    this.mapHeight = Math.ceil(WORLD_H / blockSize);
    this.defaultValue = defaultValue;
    this.data = new Array(this.mapWidth * this.mapHeight).fill(defaultValue);
  }

  /**
   * Fill the entire map with a value
   */
  fill(value: T): void {
    this.data.fill(value);
  }

  /**
   * Clear the map to default values
   */
  clear(): void {
    this.fill(this.defaultValue);
  }

  /**
   * Check if map coordinates are valid
   */
  onMap(x: number, y: number): boolean {
    return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight;
  }

  /**
   * Check if world coordinates are valid
   */
  worldOnMap(x: number, y: number): boolean {
    return x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
  }

  /**
   * Get value at map coordinates
   */
  get(x: number, y: number): T {
    if (!this.onMap(x, y)) {
      return this.defaultValue;
    }
    return this.data[x * this.mapHeight + y];
  }

  /**
   * Set value at map coordinates
   */
  set(x: number, y: number, value: T): void {
    if (this.onMap(x, y)) {
      this.data[x * this.mapHeight + y] = value;
    }
  }

  /**
   * Get value at world coordinates
   */
  worldGet(x: number, y: number): T {
    if (!this.worldOnMap(x, y)) {
      return this.defaultValue;
    }
    const mx = Math.floor(x / this.blockSize);
    const my = Math.floor(y / this.blockSize);
    return this.data[mx * this.mapHeight + my];
  }

  /**
   * Set value at world coordinates
   */
  worldSet(x: number, y: number, value: T): void {
    if (this.worldOnMap(x, y)) {
      const mx = Math.floor(x / this.blockSize);
      const my = Math.floor(y / this.blockSize);
      this.data[mx * this.mapHeight + my] = value;
    }
  }

  /**
   * Get the raw data array
   */
  getData(): T[] {
    return this.data;
  }
}

/**
 * Byte map with 1x1 blocks (full resolution)
 */
export class MapByte1 extends GameMap<number> {
  constructor(defaultValue: number = 0) {
    super(1, defaultValue);
  }
}

/**
 * Byte map with 2x2 blocks
 */
export class MapByte2 extends GameMap<number> {
  constructor(defaultValue: number = 0) {
    super(2, defaultValue);
  }
}

/**
 * Byte map with 4x4 blocks
 */
export class MapByte4 extends GameMap<number> {
  constructor(defaultValue: number = 0) {
    super(4, defaultValue);
  }
}

/**
 * Short map with 8x8 blocks
 */
export class MapShort8 extends GameMap<number> {
  constructor(defaultValue: number = 0) {
    super(8, defaultValue);
  }
}

/**
 * The main tile map for the world
 * Stores 16-bit tile values (tile character + status bits)
 */
export class TileMap {
  public readonly width = WORLD_W;
  public readonly height = WORLD_H;
  private data: Uint16Array;

  constructor() {
    this.data = new Uint16Array(WORLD_W * WORLD_H);
  }

  /**
   * Check if coordinates are valid
   */
  onMap(x: number, y: number): boolean {
    return x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
  }

  /**
   * Get tile at coordinates
   */
  getTile(x: number, y: number): number {
    if (!this.onMap(x, y)) {
      return 0;
    }
    return this.data[x * WORLD_H + y];
  }

  /**
   * Set tile at coordinates
   */
  setTile(x: number, y: number, value: number): void {
    if (this.onMap(x, y)) {
      this.data[x * WORLD_H + y] = value;
    }
  }

  /**
   * Fill the entire map with a value
   */
  fill(value: number): void {
    this.data.fill(value);
  }

  /**
   * Clear the map
   */
  clear(): void {
    this.fill(0);
  }

  /**
   * Get the raw data array
   */
  getData(): Uint16Array {
    return this.data;
  }

  /**
   * Get a rectangular region of the map
   */
  getRegion(x: number, y: number, width: number, height: number): number[][] {
    const region: number[][] = [];
    for (let dy = 0; dy < height; dy++) {
      const row: number[] = [];
      for (let dx = 0; dx < width; dx++) {
        row.push(this.getTile(x + dx, y + dy));
      }
      region.push(row);
    }
    return region;
  }

  /**
   * Set a rectangular region of the map
   */
  setRegion(x: number, y: number, tiles: number[][]): void {
    for (let dy = 0; dy < tiles.length; dy++) {
      for (let dx = 0; dx < tiles[dy].length; dx++) {
        this.setTile(x + dx, y + dy, tiles[dy][dx]);
      }
    }
  }
}
