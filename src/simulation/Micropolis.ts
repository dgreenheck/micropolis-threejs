/**
 * Micropolis - Main Simulation Engine
 * TypeScript port of the original Micropolis/SimCity simulation
 */

import {
  WORLD_W, WORLD_H,
  CITYTIMES_PER_MONTH, CITYTIMES_PER_YEAR,
  HISTORY_LENGTH, MISC_HISTORY_LENGTH,
  MAX_ROAD_EFFECT, MAX_POLICE_STATION_EFFECT, MAX_FIRE_STATION_EFFECT,
  RES_VALVE_RANGE, COM_VALVE_RANGE, IND_VALVE_RANGE,
  CENSUS_FREQUENCY_10, CENSUS_FREQUENCY_120, TAX_FREQUENCY,
  DEFAULT_STARTING_YEAR, DEFAULT_CITY_TAX,
} from '../core/constants';

import { TileMap, MapByte1, MapByte2, MapByte4, MapShort8 } from '../core/map';
import { Tiles, TileBits, getTileValue, isZoneCenter } from '../core/tiles';
import {
  GameLevel, SimSpeed, Scenario, CityClass, ZoneType,
  EditingTool, ToolResult,
  CityStats, BudgetData, Position, Sprite, SpriteType,
  MONTH_NAMES, TOOL_COSTS
} from '../core/types';
import { Random } from '../utils/random';

/**
 * Main Micropolis simulation class
 */
export class Micropolis {
  // Random number generator
  public random: Random;

  // Main tile map
  public map: TileMap;

  // Overlay maps
  public populationDensityMap: MapByte2;
  public trafficDensityMap: MapByte2;
  public pollutionDensityMap: MapByte2;
  public landValueMap: MapByte2;
  public crimeRateMap: MapByte2;
  public terrainDensityMap: MapByte4;
  public powerGridMap: MapByte1;
  public rateOfGrowthMap: MapShort8;
  public fireStationMap: MapShort8;
  public fireStationEffectMap: MapShort8;
  public policeStationMap: MapShort8;
  public policeStationEffectMap: MapShort8;
  public comRateMap: MapShort8;

  // Temporary maps for smoothing
  public tempMap1: MapByte2;
  public tempMap2: MapByte2;
  public tempMap3: MapByte4;

  // History arrays
  public resHist: Int16Array;
  public comHist: Int16Array;
  public indHist: Int16Array;
  public moneyHist: Int16Array;
  public pollutionHist: Int16Array;
  public crimeHist: Int16Array;
  public miscHist: Int16Array;

  // Population counters
  public roadTotal: number = 0;
  public railTotal: number = 0;
  public firePop: number = 0;
  public resPop: number = 0;
  public comPop: number = 0;
  public indPop: number = 0;
  public totalPop: number = 0;
  public totalPopLast: number = 0;
  public resZonePop: number = 0;
  public comZonePop: number = 0;
  public indZonePop: number = 0;
  public totalZonePop: number = 0;
  public hospitalPop: number = 0;
  public churchPop: number = 0;
  public stadiumPop: number = 0;
  public policeStationPop: number = 0;
  public fireStationPop: number = 0;
  public coalPowerPop: number = 0;
  public nuclearPowerPop: number = 0;
  public seaportPop: number = 0;
  public airportPop: number = 0;

  // Averages
  public crimeAverage: number = 0;
  public pollutionAverage: number = 0;
  public landValueAverage: number = 0;
  public trafficAverage: number = 0;

  // Time
  public cityTime: number = 0;
  public cityMonth: number = 0;
  public cityYear: number = 0;
  public startingYear: number = DEFAULT_STARTING_YEAR;

  // History maximums
  public resHist10Max: number = 0;
  public resHist120Max: number = 0;
  public comHist10Max: number = 0;
  public comHist120Max: number = 0;
  public indHist10Max: number = 0;
  public indHist120Max: number = 0;

  // Budget
  public totalFunds: number = 20000;
  public taxFund: number = 0;
  public roadFund: number = 0;
  public policeFund: number = 0;
  public fireFund: number = 0;
  public roadSpend: number = 0;
  public policeSpend: number = 0;
  public fireSpend: number = 0;
  public roadPercent: number = 1.0;
  public policePercent: number = 1.0;
  public firePercent: number = 1.0;
  public roadEffect: number = MAX_ROAD_EFFECT;
  public policeEffect: number = MAX_POLICE_STATION_EFFECT;
  public fireEffect: number = MAX_FIRE_STATION_EFFECT;
  public roadValue: number = 0;
  public policeValue: number = 0;
  public fireValue: number = 0;
  public cityTax: number = DEFAULT_CITY_TAX;
  public cityTaxAverage: number = 0;

  // Valves (demand indicators: -2000 to 2000)
  private resValve: number = 0;
  private comValve: number = 0;
  private indValve: number = 0;

  // Evaluation
  public cityYes: number = 0;
  public problemVotes: number[] = new Array(10).fill(0);
  public problemOrder: number[] = new Array(4).fill(7);
  public cityPop: number = 0;
  public cityPopDelta: number = 0;
  public cityAssessedValue: number = 0;
  public cityClass: CityClass = CityClass.VILLAGE;
  public cityScore: number = 500;
  public cityScoreDelta: number = 0;

  // Simulation state
  public simSpeed: SimSpeed = SimSpeed.MEDIUM;
  public simPaused: boolean = false;
  public gameLevel: GameLevel = GameLevel.EASY;
  public scenario: Scenario = Scenario.NONE;
  public enableDisasters: boolean = true;
  public autoBulldoze: boolean = true;
  public autoBudget: boolean = true;
  public autoGoto: boolean = true;
  public enableSound: boolean = true;

  // Simulation counters
  public simCycle: number = 0;
  public phaseCycle: number = 0;
  public speedCycle: number = 0;
  public mapSerial: number = 0;
  public poweredZoneCount: number = 0;
  public unpoweredZoneCount: number = 0;

  // City center
  private cityCenterX: number = WORLD_W / 2;
  private cityCenterY: number = WORLD_H / 2;

  // Pollution/crime hotspots
  private pollutionMaxX: number = 0;
  private pollutionMaxY: number = 0;
  private _crimeMaxX: number = 0;
  private _crimeMaxY: number = 0;

  // Growth caps
  public resCap: boolean = false;
  public comCap: boolean = false;
  public indCap: boolean = false;

  // Cash flow
  public cashFlow: number = 0;
  public externalMarket: number = 4.0;

  // Disasters
  public disasterEvent: Scenario = Scenario.NONE;
  public disasterWait: number = 0;
  public floodCount: number = 0;

  // Power
  private powerStackPointer: number = 0;
  private powerStack: Position[] = [];

  // Traffic (reserved for future use)
  private _curMapStackPointer: number = 0;
  private _curMapStack: Position[] = [];
  private _trafMaxX: number = 0;
  private _trafMaxY: number = 0;

  // Sprites
  public sprites: Sprite[] = [];

  // Need indicators (reserved for future use)
  private _needHospital: number = 0;
  private _needChurch: number = 0;

  // City info
  public cityName: string = 'Micropolis';
  public cityFileName: string = '';

  // Flags
  public censusChanged: boolean = false;
  public valveFlag: boolean = false;
  public doInitialEval: boolean = true;
  public newPower: boolean = false;
  public mustUpdateFunds: boolean = false;
  public mustUpdateOptions: boolean = false;
  public evalChanged: boolean = false;

  // Ramps
  public crimeRamp: number = 0;
  public pollutionRamp: number = 0;

  // Callbacks
  public onMessage?: (message: string, x?: number, y?: number, important?: boolean) => void;
  public onUpdateUI?: () => void;
  public onPlaySound?: (sound: string, x?: number, y?: number) => void;

  constructor() {
    this.random = new Random();

    // Initialize maps
    this.map = new TileMap();
    this.populationDensityMap = new MapByte2();
    this.trafficDensityMap = new MapByte2();
    this.pollutionDensityMap = new MapByte2();
    this.landValueMap = new MapByte2();
    this.crimeRateMap = new MapByte2();
    this.terrainDensityMap = new MapByte4();
    this.powerGridMap = new MapByte1();
    this.rateOfGrowthMap = new MapShort8();
    this.fireStationMap = new MapShort8();
    this.fireStationEffectMap = new MapShort8();
    this.policeStationMap = new MapShort8();
    this.policeStationEffectMap = new MapShort8();
    this.comRateMap = new MapShort8();
    this.tempMap1 = new MapByte2();
    this.tempMap2 = new MapByte2();
    this.tempMap3 = new MapByte4();

    // Initialize history arrays
    this.resHist = new Int16Array(HISTORY_LENGTH);
    this.comHist = new Int16Array(HISTORY_LENGTH);
    this.indHist = new Int16Array(HISTORY_LENGTH);
    this.moneyHist = new Int16Array(HISTORY_LENGTH);
    this.pollutionHist = new Int16Array(HISTORY_LENGTH);
    this.crimeHist = new Int16Array(HISTORY_LENGTH);
    this.miscHist = new Int16Array(MISC_HISTORY_LENGTH);

    // Initialize power and traffic stacks
    this.powerStack = new Array(Math.floor((WORLD_W * WORLD_H) / 4));
    this._curMapStack = new Array(31); // MAX_TRAFFIC_DISTANCE + 1

    this.init();
  }

  /**
   * Initialize the simulation
   */
  private init(): void {
    this.clearMaps();
    this.initFundingLevel();
    this.updateDate();
  }

  /**
   * Clear all maps
   */
  private clearMaps(): void {
    this.map.clear();
    this.populationDensityMap.clear();
    this.trafficDensityMap.clear();
    this.pollutionDensityMap.clear();
    this.landValueMap.clear();
    this.crimeRateMap.clear();
    this.terrainDensityMap.clear();
    this.powerGridMap.clear();
    this.rateOfGrowthMap.clear();
    this.fireStationMap.clear();
    this.fireStationEffectMap.clear();
    this.policeStationMap.clear();
    this.policeStationEffectMap.clear();
    this.comRateMap.clear();
    this.tempMap1.clear();
    this.tempMap2.clear();
    this.tempMap3.clear();
  }

  /**
   * Initialize funding levels
   */
  private initFundingLevel(): void {
    this.roadPercent = 1.0;
    this.policePercent = 1.0;
    this.firePercent = 1.0;
  }

  /**
   * Generate a new random map
   */
  public generateMap(seed?: number): void {
    if (seed !== undefined) {
      this.random.setSeed(seed);
    }

    this.clearMaps();

    // Generate terrain
    const createIsland = this.random.getRandom(10) < 1;

    if (createIsland) {
      this.makeIsland();
    } else {
      this.clearMap();
    }

    // Add rivers
    this.doRivers();

    // Add lakes
    this.makeLakes();

    // Add trees
    this.doTrees();

    // Smooth the terrain
    this.smoothRiver();
    this.smoothTrees();

    this.invalidateMaps();
  }

  /**
   * Clear the map to empty land
   */
  public clearMap(): void {
    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        this.map.setTile(x, y, Tiles.DIRT);
      }
    }
  }

  /**
   * Create island terrain
   */
  private makeIsland(): void {
    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        this.map.setTile(x, y, Tiles.RIVER);
      }
    }

    for (let x = 5; x < WORLD_W - 5; x++) {
      for (let y = 5; y < WORLD_H - 5; y++) {
        this.map.setTile(x, y, Tiles.DIRT);
      }
    }

    // Add some variation to the coastline
    for (let i = 0; i < 100; i++) {
      const x = 5 + this.random.getRandom(WORLD_W - 10);
      const y = 5 + this.random.getRandom(WORLD_H - 10);
      this.plopBRiver({ x, y });
    }
  }

  /**
   * Generate rivers
   */
  private doRivers(): void {
    const dir = this.random.getRandom(3);
    let x: number, y: number;

    if (dir === 0) {
      x = 0;
      y = this.random.getRandom(WORLD_H - 1);
    } else if (dir === 1) {
      x = WORLD_W - 1;
      y = this.random.getRandom(WORLD_H - 1);
    } else if (dir === 2) {
      x = this.random.getRandom(WORLD_W - 1);
      y = 0;
    } else {
      x = this.random.getRandom(WORLD_W - 1);
      y = WORLD_H - 1;
    }

    this.doBRiver({ x, y }, dir, dir);
  }

  /**
   * Create a big river
   */
  private doBRiver(pos: Position, riverDir: number, _terrainDir: number): void {
    let rate1: number, rate2: number;

    if (this.random.getRandom(100) < 50) {
      rate1 = 100;
      rate2 = 200;
    } else {
      rate1 = 200;
      rate2 = 100;
    }

    let x = pos.x;
    let y = pos.y;

    while (this.map.onMap(x, y)) {
      this.plopBRiver({ x, y });

      if (this.random.getRandom(rate1) < 10) {
        riverDir = (riverDir + 1) & 3;
      } else if (this.random.getRandom(rate2) < 10) {
        riverDir = (riverDir + 3) & 3;
      }

      switch (riverDir) {
        case 0: y--; break;
        case 1: x++; break;
        case 2: y++; break;
        case 3: x--; break;
      }
    }
  }

  /**
   * Plop a big river segment
   */
  private plopBRiver(pos: Position): void {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.map.onMap(x, y)) {
          const tile = this.map.getTile(x, y);
          if (getTileValue(tile) === Tiles.DIRT) {
            this.map.setTile(x, y, Tiles.RIVER);
          }
        }
      }
    }
  }

  /**
   * Generate lakes
   */
  private makeLakes(): void {
    const numLakes = this.random.getRandom(10);
    for (let i = 0; i < numLakes; i++) {
      const x = this.random.getRandom(WORLD_W - 10) + 5;
      const y = this.random.getRandom(WORLD_H - 10) + 5;
      this.makeSingleLake({ x, y });
    }
  }

  /**
   * Create a single lake
   */
  private makeSingleLake(pos: Position): void {
    const size = this.random.getRandom(5) + 5;
    for (let i = 0; i < size * size; i++) {
      const dx = this.random.getRandom(size * 2) - size;
      const dy = this.random.getRandom(size * 2) - size;
      if (dx * dx + dy * dy <= size * size) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.map.onMap(x, y)) {
          this.map.setTile(x, y, Tiles.RIVER);
        }
      }
    }
  }

  /**
   * Generate trees
   */
  private doTrees(): void {
    const amount = this.random.getRandom(50) + 50;
    for (let i = 0; i < amount; i++) {
      const x = this.random.getRandom(WORLD_W - 1);
      const y = this.random.getRandom(WORLD_H - 1);
      this.treeSplash(x, y);
    }
  }

  /**
   * Create a splash of trees
   */
  private treeSplash(x: number, y: number): void {
    const size = this.random.getRandom(10) + 5;
    for (let i = 0; i < size * 3; i++) {
      const dx = this.random.getRandom(size * 2) - size;
      const dy = this.random.getRandom(size * 2) - size;
      const tx = x + dx;
      const ty = y + dy;
      if (this.map.onMap(tx, ty)) {
        const tile = this.map.getTile(tx, ty);
        if (getTileValue(tile) === Tiles.DIRT) {
          this.map.setTile(tx, ty, Tiles.WOODS + TileBits.BLBNBIT);
        }
      }
    }
  }

  /**
   * Smooth river edges
   */
  private smoothRiver(): void {
    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = getTileValue(this.map.getTile(x, y));
        if (tile === Tiles.RIVER || (tile >= Tiles.FIRSTRIVEDGE && tile <= Tiles.LASTRIVEDGE)) {
          this.smoothWaterAt(x, y);
        }
      }
    }
  }

  /**
   * Smooth water at a position
   */
  private smoothWaterAt(x: number, y: number): void {
    let bitPattern = 0;

    // Check adjacent tiles
    const directions = [
      { dx: 0, dy: -1, bit: 1 },  // North
      { dx: 1, dy: 0, bit: 2 },   // East
      { dx: 0, dy: 1, bit: 4 },   // South
      { dx: -1, dy: 0, bit: 8 },  // West
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (this.map.onMap(nx, ny)) {
        const tile = getTileValue(this.map.getTile(nx, ny));
        if (tile === Tiles.DIRT || tile === Tiles.WOODS ||
            (tile >= Tiles.WOODS_LOW && tile <= Tiles.WOODS_HIGH)) {
          bitPattern |= dir.bit;
        }
      }
    }

    let newTile = Tiles.RIVER;
    if (bitPattern !== 0 && bitPattern !== 15) {
      newTile = Tiles.FIRSTRIVEDGE + bitPattern - 1;
      if (newTile > Tiles.LASTRIVEDGE) {
        newTile = Tiles.RIVER;
      }
    }

    this.map.setTile(x, y, newTile);
  }

  /**
   * Smooth tree edges
   */
  private smoothTrees(): void {
    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = getTileValue(this.map.getTile(x, y));
        if (tile >= Tiles.WOODS_LOW && tile <= Tiles.WOODS_HIGH) {
          this.smoothTreesAt(x, y);
        }
      }
    }
  }

  /**
   * Smooth trees at a position
   */
  private smoothTreesAt(x: number, y: number): void {
    let count = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.map.onMap(nx, ny)) {
          const tile = getTileValue(this.map.getTile(nx, ny));
          if (tile >= Tiles.WOODS_LOW && tile <= Tiles.WOODS_HIGH) {
            count++;
          }
        }
      }
    }

    if (count >= 3) {
      this.map.setTile(x, y, Tiles.WOODS + TileBits.BLBNBIT);
    } else if (count > 0) {
      this.map.setTile(x, y, Tiles.TREEBASE + count - 1 + TileBits.BLBNBIT);
    }
  }

  /**
   * Run one simulation frame
   */
  public simFrame(): void {
    if (this.simSpeed === SimSpeed.PAUSED) {
      return;
    }

    this.speedCycle = (this.speedCycle + 1) & 1023;

    if (this.simSpeed === SimSpeed.SLOW && (this.speedCycle % 5) !== 0) {
      return;
    }

    if (this.simSpeed === SimSpeed.MEDIUM && (this.speedCycle % 3) !== 0) {
      return;
    }

    this.simulate();
  }

  /**
   * Main simulation loop
   */
  private simulate(): void {
    this.phaseCycle &= 15;

    switch (this.phaseCycle) {
      case 0:
        this.simCycle = (this.simCycle + 1) & 1023;

        if (this.doInitialEval) {
          this.doInitialEval = false;
          this.cityEvaluation();
        }

        this.cityTime++;
        this.cityTaxAverage += this.cityTax;

        if ((this.simCycle & 1) === 0) {
          this.setValves();
        }

        this.clearCensus();
        break;

      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
        // Scan 1/8 of the map
        this.mapScan((this.phaseCycle - 1) * Math.floor(WORLD_W / 8),
                      this.phaseCycle * Math.floor(WORLD_W / 8));
        break;

      case 9:
        if (this.cityTime % CENSUS_FREQUENCY_10 === 0) {
          this.take10Census();
        }
        if (this.cityTime % CENSUS_FREQUENCY_120 === 0) {
          this.take120Census();
        }
        if (this.cityTime % TAX_FREQUENCY === 0) {
          this.collectTax();
          this.cityEvaluation();
        }
        break;

      case 10:
        if ((this.simCycle % 5) === 0) {
          this.decRateOfGrowthMap();
        }
        this.decTrafficMap();
        this.sendMessages();
        break;

      case 11:
        if ((this.simCycle % 9) === 0) {
          this.doPowerScan();
        }
        break;

      case 12:
        if ((this.simCycle % 17) === 0) {
          this.pollutionTerrainLandValueScan();
        }
        break;

      case 13:
        if ((this.simCycle % 19) === 0) {
          this.crimeScan();
        }
        break;

      case 14:
        if ((this.simCycle % 19) === 0) {
          this.populationDensityScan();
        }
        break;

      case 15:
        if ((this.simCycle % 21) === 0) {
          this.fireAnalysis();
        }
        this.doDisasters();
        break;
    }

    this.phaseCycle++;
    this.updateDate();
    this.updateFundEffects();
  }

  /**
   * Update the date
   */
  private updateDate(): void {
    this.cityMonth = Math.floor(this.cityTime / CITYTIMES_PER_MONTH) % 12;
    this.cityYear = this.startingYear + Math.floor(this.cityTime / CITYTIMES_PER_YEAR);
  }

  /**
   * Get formatted date string
   */
  public getDateString(): string {
    return `${MONTH_NAMES[this.cityMonth]} ${this.cityYear}`;
  }

  /**
   * Clear census counters
   */
  private clearCensus(): void {
    this.poweredZoneCount = 0;
    this.unpoweredZoneCount = 0;
    this.firePop = 0;
    this.roadTotal = 0;
    this.railTotal = 0;
    this.resPop = 0;
    this.comPop = 0;
    this.indPop = 0;
    this.resZonePop = 0;
    this.comZonePop = 0;
    this.indZonePop = 0;
    this.hospitalPop = 0;
    this.churchPop = 0;
    this.policeStationPop = 0;
    this.fireStationPop = 0;
    this.stadiumPop = 0;
    this.coalPowerPop = 0;
    this.nuclearPowerPop = 0;
    this.seaportPop = 0;
    this.airportPop = 0;
    this.powerGridMap.clear();
  }

  /**
   * Map scan - process zones in a horizontal strip
   */
  private mapScan(x1: number, x2: number): void {
    for (let x = x1; x < x2; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = this.map.getTile(x, y);
        const tileValue = getTileValue(tile);

        if (tileValue < Tiles.FLOOD) continue;

        // Fire
        if (tileValue < Tiles.ROADBASE) {
          this.doFire({ x, y }, tile);
          continue;
        }

        // Road
        if (tileValue < Tiles.POWERBASE) {
          this.doRoad({ x, y }, tile);
          continue;
        }

        // Power lines
        if (tileValue < Tiles.RAILBASE) {
          // Power lines don't need processing beyond connections
          continue;
        }

        // Rail
        if (tileValue < Tiles.RESBASE) {
          this.doRail({ x, y }, tile);
          continue;
        }

        // Zone center
        if (isZoneCenter(tile)) {
          this.doZone({ x, y }, tile);
        }
      }
    }
  }

  /**
   * Process a zone
   */
  private doZone(pos: Position, tile: number): void {
    const tileValue = getTileValue(tile);
    const zonePower = this.setZonePower(pos);

    if (zonePower) {
      this.poweredZoneCount++;
    } else {
      this.unpoweredZoneCount++;
    }

    // Seaport
    if (tileValue === Tiles.PORT) {
      this.seaportPop++;
      if ((this.cityTime & 15) === 0) {
        this.repairZone(pos, Tiles.PORTBASE, 4);
      }
      if (zonePower && this.random.getRandom(5) === 0) {
        this.generateShip();
      }
      return;
    }

    // Airport
    if (tileValue === Tiles.AIRPORT) {
      this.airportPop++;
      if ((this.cityTime & 7) === 0) {
        this.repairZone(pos, Tiles.AIRPORTBASE, 6);
      }
      if (zonePower) {
        if (this.random.getRandom(5) === 0) {
          this.generatePlane(pos);
        }
        if (this.random.getRandom(12) === 0) {
          this.generateCopter(pos);
        }
      }
      return;
    }

    // Coal power
    if (tileValue === Tiles.POWERPLANT) {
      this.coalPowerPop++;
      if ((this.cityTime & 7) === 0) {
        this.repairZone(pos, Tiles.COALBASE, 4);
      }
      this.pushPowerStack(pos);
      this.coalSmoke(pos);
      return;
    }

    // Nuclear power
    if (tileValue === Tiles.NUCLEAR) {
      this.nuclearPowerPop++;
      if ((this.cityTime & 7) === 0) {
        this.repairZone(pos, Tiles.NUCLEARBASE, 4);
      }
      this.pushPowerStack(pos);
      if (this.enableDisasters && this.random.getRandom(10000) === 0) {
        this.doMeltdown(pos);
      }
      return;
    }

    // Fire station
    if (tileValue === Tiles.FIRESTATION) {
      this.fireStationPop++;
      if ((this.cityTime & 7) === 0) {
        this.repairZone(pos, Tiles.FIRESTBASE, 3);
      }
      const effect = zonePower ? this.fireEffect : Math.floor(this.fireEffect / 2);
      this.fireStationMap.worldSet(pos.x, pos.y, effect);
      return;
    }

    // Police station
    if (tileValue === Tiles.POLICESTATION) {
      this.policeStationPop++;
      if ((this.cityTime & 7) === 0) {
        this.repairZone(pos, Tiles.POLICESTBASE, 3);
      }
      const effect = zonePower ? this.policeEffect : Math.floor(this.policeEffect / 2);
      this.policeStationMap.worldSet(pos.x, pos.y, effect);
      return;
    }

    // Stadium
    if (tileValue === Tiles.STADIUM || tileValue === Tiles.FULLSTADIUM) {
      this.stadiumPop++;
      if ((this.cityTime & 15) === 0) {
        this.repairZone(pos, Tiles.STADIUMBASE, 4);
      }
      return;
    }

    // Hospital
    if (tileValue === Tiles.HOSPITAL) {
      this.hospitalPop++;
      if ((this.cityTime & 15) === 0) {
        this.repairZone(pos, Tiles.HOSPITALBASE, 3);
      }
      return;
    }

    // Church
    if (tileValue === Tiles.CHURCH || (tileValue >= Tiles.CHURCH1 && tileValue <= Tiles.CHURCH7)) {
      this.churchPop++;
      if ((this.cityTime & 15) === 0) {
        this.repairZone(pos, Tiles.CHURCHBASE, 3);
      }
      return;
    }

    // Residential
    if (tileValue < Tiles.HOSPITAL) {
      this.doResidential(pos, zonePower);
      return;
    }

    // Commercial
    if (tileValue < Tiles.INDBASE) {
      this.doCommercial(pos, zonePower);
      return;
    }

    // Industrial
    if (tileValue < Tiles.PORTBASE) {
      this.doIndustrial(pos, zonePower);
      return;
    }
  }

  /**
   * Process residential zone
   */
  private doResidential(pos: Position, zonePower: boolean): void {
    this.resZonePop++;
    const tileValue = getTileValue(this.map.getTile(pos.x, pos.y));

    // Get zone population
    let zonePop = 0;
    if (tileValue === Tiles.FREEZ) {
      zonePop = 0;
    } else if (tileValue < Tiles.HOUSE) {
      zonePop = this.random.getRandom(8);
    } else if (tileValue < Tiles.RZB) {
      zonePop = (tileValue - Tiles.HOUSE) * 2;
    } else {
      zonePop = Math.floor((tileValue - Tiles.RZB) / 9) * 8 + 16;
    }

    this.resPop += zonePop;

    // Check for traffic
    const traffic = this.makeTraffic(pos, ZoneType.COMMERCIAL);

    if (traffic === -1) {
      this.doResOut(pos, zonePop);
      return;
    }

    // Evaluate zone
    let value = this.evalRes(pos, traffic);

    if (!zonePower) {
      value = -500;
    }

    if (value > 0) {
      this.doResIn(pos, zonePop, value);
    } else if (value < 0) {
      this.doResOut(pos, zonePop);
    }
  }

  /**
   * Residential zone growth
   */
  private doResIn(pos: Position, pop: number, value: number): void {
    if (pop < 40) {
      // Build house
      const maxPop = this.random.getRandom(8) + 1;
      this.resPlop(pos, Math.min(pop + 1, maxPop), value);
    }
    this.incRateOfGrowth(pos, 1);
  }

  /**
   * Residential zone decline
   */
  private doResOut(pos: Position, pop: number): void {
    if (pop > 0) {
      this.resPlop(pos, pop - 1, 0);
    }
    this.incRateOfGrowth(pos, -1);
  }

  /**
   * Plop residential zone
   */
  private resPlop(pos: Position, density: number, _value: number): void {
    let base: number;
    if (density === 0) {
      base = Tiles.FREEZ;
    } else if (density < 4) {
      base = Tiles.HOUSE + this.random.getRandom(3);
    } else {
      base = Tiles.RZB - 1 + Math.min(density, 16);
    }
    this.zonePlop(pos, base);
  }

  /**
   * Evaluate residential zone
   */
  private evalRes(pos: Position, traffic: number): number {
    if (traffic < 0) return -3000;

    let value = this.landValueMap.worldGet(pos.x, pos.y);
    value -= this.pollutionDensityMap.worldGet(pos.x, pos.y);

    if (this.crimeRateMap.worldGet(pos.x, pos.y) > 190) {
      value -= 50;
    }

    value += this.resValve / 16;
    value -= traffic;

    return value;
  }

  /**
   * Process commercial zone
   */
  private doCommercial(pos: Position, zonePower: boolean): void {
    this.comZonePop++;
    const tileValue = getTileValue(this.map.getTile(pos.x, pos.y));

    let zonePop = 0;
    if (tileValue === Tiles.COMCLR) {
      zonePop = 0;
    } else {
      zonePop = Math.floor((tileValue - Tiles.CZB) / 9) + 1;
    }

    this.comPop += zonePop;

    const traffic = this.makeTraffic(pos, ZoneType.INDUSTRIAL);

    if (traffic === -1) {
      this.doComOut(pos, zonePop);
      return;
    }

    let value = this.evalCom(pos, traffic);

    if (!zonePower) {
      value = -500;
    }

    if (value > 0) {
      this.doComIn(pos, zonePop, value);
    } else if (value < 0) {
      this.doComOut(pos, zonePop);
    }
  }

  /**
   * Commercial zone growth
   */
  private doComIn(pos: Position, pop: number, value: number): void {
    if (pop < 5) {
      this.comPlop(pos, pop + 1, value);
    }
    this.incRateOfGrowth(pos, 1);
  }

  /**
   * Commercial zone decline
   */
  private doComOut(pos: Position, pop: number): void {
    if (pop > 0) {
      this.comPlop(pos, pop - 1, 0);
    }
    this.incRateOfGrowth(pos, -1);
  }

  /**
   * Plop commercial zone
   */
  private comPlop(pos: Position, density: number, _value: number): void {
    let base: number;
    if (density === 0) {
      base = Tiles.COMCLR;
    } else {
      base = Tiles.CZB - 1 + density * 9;
    }
    this.zonePlop(pos, base);
  }

  /**
   * Evaluate commercial zone
   */
  private evalCom(pos: Position, traffic: number): number {
    if (traffic < 0) return -3000;

    let value = this.comRateMap.worldGet(pos.x, pos.y);
    value += this.landValueMap.worldGet(pos.x, pos.y);
    value -= this.pollutionDensityMap.worldGet(pos.x, pos.y);
    value += this.comValve / 16;
    value -= traffic;

    return value;
  }

  /**
   * Process industrial zone
   */
  private doIndustrial(pos: Position, zonePower: boolean): void {
    this.indZonePop++;
    const tileValue = getTileValue(this.map.getTile(pos.x, pos.y));

    let zonePop = 0;
    if (tileValue === Tiles.INDCLR) {
      zonePop = 0;
    } else {
      zonePop = Math.floor((tileValue - Tiles.IZB) / 9) + 1;
    }

    this.indPop += zonePop;

    const traffic = this.makeTraffic(pos, ZoneType.RESIDENTIAL);

    if (traffic === -1) {
      this.doIndOut(pos, zonePop);
      return;
    }

    let value = this.evalInd(traffic);

    if (!zonePower) {
      value = -500;
    }

    if (value > 0) {
      this.doIndIn(pos, zonePop, value);
    } else if (value < 0) {
      this.doIndOut(pos, zonePop);
    }
  }

  /**
   * Industrial zone growth
   */
  private doIndIn(pos: Position, pop: number, value: number): void {
    if (pop < 4) {
      this.indPlop(pos, pop + 1, value);
    }
    this.incRateOfGrowth(pos, 1);
  }

  /**
   * Industrial zone decline
   */
  private doIndOut(pos: Position, pop: number): void {
    if (pop > 0) {
      this.indPlop(pos, pop - 1, 0);
    }
    this.incRateOfGrowth(pos, -1);
  }

  /**
   * Plop industrial zone
   */
  private indPlop(pos: Position, density: number, _value: number): void {
    let base: number;
    if (density === 0) {
      base = Tiles.INDCLR;
    } else {
      base = Tiles.IZB - 1 + density * 9;
    }
    this.zonePlop(pos, base);
  }

  /**
   * Evaluate industrial zone
   */
  private evalInd(traffic: number): number {
    if (traffic < 0) return -1000;

    let value = this.indValve / 16;
    value -= traffic;

    return value;
  }

  /**
   * Plop a zone center
   */
  private zonePlop(pos: Position, base: number): void {
    // Clear the 3x3 area and set center
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.map.onMap(x, y)) {
          const offset = (dy + 1) * 3 + (dx + 1);
          let tile = base + offset;
          if (dx === 0 && dy === 0) {
            tile |= TileBits.ZONEBIT | TileBits.BULLBIT;
          } else {
            tile |= TileBits.BULLBIT;
          }
          this.map.setTile(x, y, tile);
        }
      }
    }
  }

  /**
   * Repair a zone
   */
  private repairZone(pos: Position, base: number, size: number): void {
    const offset = size === 3 ? 1 : (size === 4 ? 1 : 2);
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const x = pos.x - offset + dx;
        const y = pos.y - offset + dy;
        if (this.map.onMap(x, y)) {
          const tileValue = getTileValue(this.map.getTile(x, y));
          if (tileValue >= Tiles.RUBBLE && tileValue <= Tiles.LASTRUBBLE) {
            let tile = base + dy * size + dx;
            tile |= TileBits.CONDBIT | TileBits.BURNBIT;
            this.map.setTile(x, y, tile);
          }
        }
      }
    }
  }

  /**
   * Set zone power
   */
  private setZonePower(pos: Position): boolean {
    const hasPwr = this.powerGridMap.worldGet(pos.x, pos.y) !== 0;
    const tile = this.map.getTile(pos.x, pos.y);

    if (hasPwr) {
      this.map.setTile(pos.x, pos.y, tile | TileBits.PWRBIT);
    } else {
      this.map.setTile(pos.x, pos.y, tile & ~TileBits.PWRBIT);
    }

    return hasPwr;
  }

  /**
   * Process fire
   */
  private doFire(pos: Position, _tile: number): void {
    this.firePop++;

    // Spread fire
    if (this.random.getRandom(4) === 0) {
      const dir = this.random.getRandom(3);
      let nx = pos.x;
      let ny = pos.y;

      switch (dir) {
        case 0: ny--; break;
        case 1: nx++; break;
        case 2: ny++; break;
        case 3: nx--; break;
      }

      if (this.map.onMap(nx, ny)) {
        const adjTile = this.map.getTile(nx, ny);
        if ((adjTile & TileBits.BURNBIT) !== 0) {
          // Check fire station coverage
          const coverage = this.fireStationEffectMap.worldGet(nx, ny);
          if (coverage < 50 || this.random.getRandom(100) > coverage) {
            this.map.setTile(nx, ny, this.randomFire());
          }
        }
      }
    }

    // Fire may burn out
    if (this.random.getRandom(3) === 0) {
      this.map.setTile(pos.x, pos.y, this.randomRubble());
    }
  }

  /**
   * Generate random fire tile
   */
  private randomFire(): number {
    return (Tiles.FIRE + (this.random.getRandom16() & 7)) | TileBits.ANIMBIT;
  }

  /**
   * Generate random rubble tile
   */
  private randomRubble(): number {
    return (Tiles.RUBBLE + (this.random.getRandom16() & 3)) | TileBits.BULLBIT;
  }

  /**
   * Process road
   */
  private doRoad(pos: Position, tile: number): void {
    const tileValue = getTileValue(tile);

    // Count road
    this.roadTotal++;

    // Bridges count more
    if (tileValue >= Tiles.HBRIDGE && tileValue <= Tiles.VBRIDGE) {
      this.roadTotal += 3;
    }

    // High traffic roads count more
    if (tileValue >= Tiles.HTRFBASE) {
      this.roadTotal++;
    }

    // Deteriorate roads
    if (this.roadEffect < 30) {
      if (this.random.getRandom(511) === 0) {
        const newTile = this.random.getRandom(15) === 0 ?
                        this.randomRubble() :
                        (tileValue & TileBits.ALLBITS) | (tileValue - 1);
        this.map.setTile(pos.x, pos.y, newTile);
      }
    }
  }

  /**
   * Process rail
   */
  private doRail(pos: Position, _tile: number): void {
    this.railTotal++;

    // Generate trains occasionally
    if (this.random.getRandom(511) === 0) {
      this.generateTrain(pos);
    }
  }

  /**
   * Coal smoke animation
   */
  private coalSmoke(pos: Position): void {
    // Add smoke to chimneys
    const animations = [
      { dx: 1, dy: -1, base: Tiles.COALSMOKE1 },
      { dx: 2, dy: -1, base: Tiles.COALSMOKE2 },
      { dx: 1, dy: 0, base: Tiles.COALSMOKE3 },
      { dx: 2, dy: 0, base: Tiles.COALSMOKE4 },
    ];

    for (const anim of animations) {
      const x = pos.x + anim.dx;
      const y = pos.y + anim.dy;
      if (this.map.onMap(x, y)) {
        const frame = (this.cityTime >> 2) & 3;
        this.map.setTile(x, y, anim.base + frame | TileBits.ANIMBIT | TileBits.CONDBIT | TileBits.PWRBIT | TileBits.BURNBIT);
      }
    }
  }

  /**
   * Nuclear meltdown!
   */
  private doMeltdown(pos: Position): void {
    this.sendMessage('Nuclear meltdown!', pos.x, pos.y, true);

    // Destroy the plant and cause fires
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.map.onMap(x, y)) {
          const tile = this.map.getTile(x, y);
          if ((tile & TileBits.BURNBIT) !== 0 || getTileValue(tile) === Tiles.DIRT) {
            this.map.setTile(x, y, this.randomFire());
          }
        }
      }
    }

    // Add radiation
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.map.onMap(x, y)) {
          if (this.random.getRandom(5) === 0) {
            this.map.setTile(x, y, Tiles.RADTILE);
          }
        }
      }
    }

    this.makeExplosion(pos.x, pos.y);
  }

  /**
   * Make traffic from zone to destination
   */
  private makeTraffic(pos: Position, _dest: ZoneType): number {
    // Simplified traffic - just check if there's road access
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.map.onMap(x, y)) {
          const tile = getTileValue(this.map.getTile(x, y));
          if (tile >= Tiles.ROADBASE && tile <= Tiles.LASTROAD) {
            return this.random.getRandom(10);
          }
        }
      }
    }
    return -1;
  }

  /**
   * Increase rate of growth
   */
  private incRateOfGrowth(pos: Position, amount: number): void {
    const val = this.rateOfGrowthMap.worldGet(pos.x, pos.y);
    this.rateOfGrowthMap.worldSet(pos.x, pos.y, Math.max(-200, Math.min(200, val + amount * 4)));
  }

  /**
   * Decrease rate of growth map
   */
  private decRateOfGrowthMap(): void {
    for (let x = 0; x < this.rateOfGrowthMap.mapWidth; x++) {
      for (let y = 0; y < this.rateOfGrowthMap.mapHeight; y++) {
        let val = this.rateOfGrowthMap.get(x, y);
        if (val > 0) {
          val--;
        } else if (val < 0) {
          val++;
        }
        this.rateOfGrowthMap.set(x, y, val);
      }
    }
  }

  /**
   * Decrease traffic density map
   */
  private decTrafficMap(): void {
    for (let x = 0; x < this.trafficDensityMap.mapWidth; x++) {
      for (let y = 0; y < this.trafficDensityMap.mapHeight; y++) {
        let val = this.trafficDensityMap.get(x, y);
        if (val > 0) {
          val = Math.max(0, val - 24);
        }
        this.trafficDensityMap.set(x, y, val);
      }
    }
  }

  /**
   * Set valve levels based on supply and demand
   */
  private setValves(): void {
    const employment = (this.comPop + this.indPop) * 8;
    const migration = this.resPop - employment;

    // Calculate residential valve
    let resValve = migration / 16;
    if (resValve > RES_VALVE_RANGE) {
      resValve = RES_VALVE_RANGE;
    } else if (resValve < -RES_VALVE_RANGE) {
      resValve = -RES_VALVE_RANGE;
    }

    // Calculate commercial valve
    const laborBase = this.resPop / 8;
    let comValve = (laborBase - this.comPop) / 4;
    if (comValve > COM_VALVE_RANGE) {
      comValve = COM_VALVE_RANGE;
    } else if (comValve < -COM_VALVE_RANGE) {
      comValve = -COM_VALVE_RANGE;
    }

    // Calculate industrial valve
    let indValve = ((laborBase - this.indPop) / 4) + this.externalMarket;
    if (indValve > IND_VALVE_RANGE) {
      indValve = IND_VALVE_RANGE;
    } else if (indValve < -IND_VALVE_RANGE) {
      indValve = -IND_VALVE_RANGE;
    }

    // Apply
    this.resValve = Math.floor(resValve);
    this.comValve = Math.floor(comValve);
    this.indValve = Math.floor(indValve);

    this.valveFlag = true;
  }

  /**
   * Get demand values (normalized to -1 to 1)
   */
  public getDemands(): { res: number; com: number; ind: number } {
    return {
      res: this.resValve / RES_VALVE_RANGE,
      com: this.comValve / COM_VALVE_RANGE,
      ind: this.indValve / IND_VALVE_RANGE,
    };
  }

  /**
   * Power scan - propagate power through conductive tiles
   */
  private doPowerScan(): void {
    // Clear power grid
    this.powerGridMap.clear();
    this.powerStackPointer = 0;

    // Find all power plants and start power propagation
    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = getTileValue(this.map.getTile(x, y));
        if (tile === Tiles.NUCLEAR || tile === Tiles.POWERPLANT) {
          this.pushPowerStack({ x, y });
        }
      }
    }

    // Propagate power
    while (this.powerStackPointer > 0) {
      const pos = this.pullPowerStack();

      // Set power at this position
      this.powerGridMap.worldSet(pos.x, pos.y, 1);

      // Check adjacent tiles
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];

      for (const dir of directions) {
        const nx = pos.x + dir.dx;
        const ny = pos.y + dir.dy;

        if (this.map.onMap(nx, ny) && this.powerGridMap.worldGet(nx, ny) === 0) {
          const tile = this.map.getTile(nx, ny);
          if ((tile & TileBits.CONDBIT) !== 0) {
            this.pushPowerStack({ x: nx, y: ny });
          }
        }
      }
    }

    this.newPower = true;
  }

  /**
   * Push position onto power stack
   */
  private pushPowerStack(pos: Position): void {
    if (this.powerStackPointer < this.powerStack.length) {
      this.powerStack[this.powerStackPointer++] = pos;
    }
  }

  /**
   * Pull position from power stack
   */
  private pullPowerStack(): Position {
    return this.powerStack[--this.powerStackPointer];
  }

  /**
   * Population density scan
   */
  private populationDensityScan(): void {
    this.tempMap1.clear();

    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = this.map.getTile(x, y);
        if (isZoneCenter(tile)) {
          const tileValue = getTileValue(tile);
          let pop = 0;

          if (tileValue < Tiles.COMBASE) {
            // Residential
            pop = this.getResZonePop(tileValue);
          } else if (tileValue < Tiles.INDBASE) {
            // Commercial
            pop = this.getComZonePop(tileValue) * 8;
          } else if (tileValue < Tiles.PORTBASE) {
            // Industrial
            pop = this.getIndZonePop(tileValue) * 8;
          }

          this.tempMap1.worldSet(x, y, Math.min(255, pop));
        }
      }
    }

    // Smooth
    this.smoothMap(this.tempMap1, this.tempMap2);
    this.smoothMap(this.tempMap2, this.tempMap1);
    this.smoothMap(this.tempMap1, this.populationDensityMap);
  }

  /**
   * Get residential zone population
   */
  private getResZonePop(tile: number): number {
    if (tile === Tiles.FREEZ) return 0;
    if (tile < Tiles.HOUSE) return this.random.getRandom(8);
    if (tile < Tiles.RZB) return (tile - Tiles.HOUSE) * 2;
    return Math.floor((tile - Tiles.RZB) / 9) * 8 + 16;
  }

  /**
   * Get commercial zone population
   */
  private getComZonePop(tile: number): number {
    if (tile === Tiles.COMCLR) return 0;
    return Math.floor((tile - Tiles.CZB) / 9) + 1;
  }

  /**
   * Get industrial zone population
   */
  private getIndZonePop(tile: number): number {
    if (tile === Tiles.INDCLR) return 0;
    return Math.floor((tile - Tiles.IZB) / 9) + 1;
  }

  /**
   * Pollution, terrain, and land value scan
   */
  private pollutionTerrainLandValueScan(): void {
    // Calculate pollution
    this.tempMap1.clear();
    let maxPollution = 0;
    let maxX = 0;
    let maxY = 0;

    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        let pollution = 0;
        const tile = getTileValue(this.map.getTile(x, y));

        // Traffic pollution
        pollution += this.trafficDensityMap.worldGet(x, y);

        // Industrial pollution
        if (tile >= Tiles.IZB && tile < Tiles.PORTBASE) {
          pollution += 50;
        }

        // Power plant pollution
        if (tile === Tiles.POWERPLANT) {
          pollution += 100;
        }

        // Airport pollution
        if (tile === Tiles.AIRPORT) {
          pollution += 50;
        }

        // Seaport pollution
        if (tile === Tiles.PORT) {
          pollution += 30;
        }

        // Fire pollution
        if (tile >= Tiles.FIREBASE && tile <= Tiles.LASTFIRE) {
          pollution += 100;
        }

        if (pollution > maxPollution) {
          maxPollution = pollution;
          maxX = x;
          maxY = y;
        }

        this.tempMap1.worldSet(x, y, Math.min(255, pollution));
      }
    }

    this.pollutionMaxX = maxX;
    this.pollutionMaxY = maxY;

    // Smooth pollution
    this.smoothMap(this.tempMap1, this.tempMap2);
    this.smoothMap(this.tempMap2, this.pollutionDensityMap);

    // Calculate pollution average
    let totalPollution = 0;
    let count = 0;
    for (let x = 0; x < this.pollutionDensityMap.mapWidth; x++) {
      for (let y = 0; y < this.pollutionDensityMap.mapHeight; y++) {
        totalPollution += this.pollutionDensityMap.get(x, y);
        count++;
      }
    }
    this.pollutionAverage = count > 0 ? Math.floor(totalPollution / count) : 0;

    // Calculate land value
    this.calculateLandValue();
  }

  /**
   * Calculate land value
   */
  private calculateLandValue(): void {
    for (let x = 0; x < this.landValueMap.mapWidth; x++) {
      for (let y = 0; y < this.landValueMap.mapHeight; y++) {
        // Distance from city center
        const wx = x * 2 + 1;
        const wy = y * 2 + 1;
        const dist = Math.abs(wx - this.cityCenterX) + Math.abs(wy - this.cityCenterY);

        let value = 150 - Math.floor(dist / 2);

        // Pollution decreases land value
        value -= this.pollutionDensityMap.get(x, y);

        // Crime decreases land value
        value -= Math.floor(this.crimeRateMap.get(x, y) / 2);

        // Terrain increases value
        value += this.terrainDensityMap.get(Math.floor(x / 2), Math.floor(y / 2)) * 2;

        this.landValueMap.set(x, y, Math.max(0, Math.min(255, value)));
      }
    }

    // Calculate average
    let total = 0;
    let count = 0;
    for (let x = 0; x < this.landValueMap.mapWidth; x++) {
      for (let y = 0; y < this.landValueMap.mapHeight; y++) {
        total += this.landValueMap.get(x, y);
        count++;
      }
    }
    this.landValueAverage = count > 0 ? Math.floor(total / count) : 0;
  }

  /**
   * Crime scan
   */
  private crimeScan(): void {
    this.tempMap1.clear();
    let maxCrime = 0;

    for (let x = 0; x < this.crimeRateMap.mapWidth; x++) {
      for (let y = 0; y < this.crimeRateMap.mapHeight; y++) {
        // Base crime from population density
        let crime = this.populationDensityMap.get(x, y);

        // Land value reduces crime
        crime -= Math.floor(this.landValueMap.get(x, y) / 4);

        // Police coverage reduces crime
        const police = this.policeStationEffectMap.get(
          Math.floor(x / 4),
          Math.floor(y / 4)
        );
        crime = Math.floor(crime * (128 - Math.min(police, 127)) / 128);

        crime = Math.max(0, Math.min(255, crime));
        this.tempMap1.set(x, y, crime);

        if (crime > maxCrime) {
          maxCrime = crime;
          this._crimeMaxX = x * 2;
          this._crimeMaxY = y * 2;
        }
      }
    }

    // Smooth
    this.smoothMap(this.tempMap1, this.crimeRateMap);

    // Calculate average
    let total = 0;
    let count = 0;
    for (let x = 0; x < this.crimeRateMap.mapWidth; x++) {
      for (let y = 0; y < this.crimeRateMap.mapHeight; y++) {
        total += this.crimeRateMap.get(x, y);
        count++;
      }
    }
    this.crimeAverage = count > 0 ? Math.floor(total / count) : 0;
  }

  /**
   * Fire analysis - spread fire station effect
   */
  private fireAnalysis(): void {
    // Copy fire station map to effect map with spreading
    this.smoothMap8(this.fireStationMap, this.fireStationEffectMap);
    this.smoothMap8(this.fireStationEffectMap, this.fireStationMap);
    this.smoothMap8(this.fireStationMap, this.fireStationEffectMap);

    // Same for police
    this.smoothMap8(this.policeStationMap, this.policeStationEffectMap);
    this.smoothMap8(this.policeStationEffectMap, this.policeStationMap);
    this.smoothMap8(this.policeStationMap, this.policeStationEffectMap);

    // Calculate commercial rate
    this.computeComRateMap();
  }

  /**
   * Compute commercial rate map
   */
  private computeComRateMap(): void {
    for (let x = 0; x < this.comRateMap.mapWidth; x++) {
      for (let y = 0; y < this.comRateMap.mapHeight; y++) {
        // Based on distance from city center
        const wx = x * 8 + 4;
        const wy = y * 8 + 4;
        const dist = Math.abs(wx - this.cityCenterX) + Math.abs(wy - this.cityCenterY);
        this.comRateMap.set(x, y, Math.max(0, 64 - Math.floor(dist / 4)));
      }
    }
  }

  /**
   * Smooth a MapByte2
   */
  private smoothMap(src: MapByte2, dst: MapByte2): void {
    for (let x = 0; x < src.mapWidth; x++) {
      for (let y = 0; y < src.mapHeight; y++) {
        let sum = src.get(x, y) * 4;
        sum += src.get(x - 1, y);
        sum += src.get(x + 1, y);
        sum += src.get(x, y - 1);
        sum += src.get(x, y + 1);
        dst.set(x, y, Math.floor(sum / 8));
      }
    }
  }

  /**
   * Smooth a MapShort8
   */
  private smoothMap8(src: MapShort8, dst: MapShort8): void {
    for (let x = 0; x < src.mapWidth; x++) {
      for (let y = 0; y < src.mapHeight; y++) {
        let sum = src.get(x, y) * 4;
        sum += src.get(x - 1, y);
        sum += src.get(x + 1, y);
        sum += src.get(x, y - 1);
        sum += src.get(x, y + 1);
        dst.set(x, y, Math.floor(sum / 8));
      }
    }
  }

  /**
   * Take 10-year census (short-term history)
   */
  private take10Census(): void {
    // Shift history
    for (let i = HISTORY_LENGTH - 1; i > 0; i--) {
      this.resHist[i] = this.resHist[i - 1];
      this.comHist[i] = this.comHist[i - 1];
      this.indHist[i] = this.indHist[i - 1];
      this.crimeHist[i] = this.crimeHist[i - 1];
      this.pollutionHist[i] = this.pollutionHist[i - 1];
      this.moneyHist[i] = this.moneyHist[i - 1];
    }

    this.resHist[0] = this.resPop;
    this.comHist[0] = this.comPop;
    this.indHist[0] = this.indPop;
    this.crimeHist[0] = this.crimeAverage;
    this.pollutionHist[0] = this.pollutionAverage;
    this.moneyHist[0] = Math.min(32000, Math.max(-32000, this.cashFlow));

    // Find maximums for graph scaling
    this.resHist10Max = 0;
    this.comHist10Max = 0;
    this.indHist10Max = 0;

    for (let i = 0; i < 120; i++) {
      this.resHist10Max = Math.max(this.resHist10Max, this.resHist[i]);
      this.comHist10Max = Math.max(this.comHist10Max, this.comHist[i]);
      this.indHist10Max = Math.max(this.indHist10Max, this.indHist[i]);
    }

    this.censusChanged = true;
  }

  /**
   * Take 120-year census (long-term history)
   */
  private take120Census(): void {
    // Find maximums for 120-year scale
    this.resHist120Max = 0;
    this.comHist120Max = 0;
    this.indHist120Max = 0;

    for (let i = 0; i < HISTORY_LENGTH; i++) {
      this.resHist120Max = Math.max(this.resHist120Max, this.resHist[i]);
      this.comHist120Max = Math.max(this.comHist120Max, this.comHist[i]);
      this.indHist120Max = Math.max(this.indHist120Max, this.indHist[i]);
    }
  }

  /**
   * Collect taxes
   */
  private collectTax(): void {
    // Calculate tax income
    this.cashFlow = 0;
    this.taxFund = 0;

    const population = this.getPopulation();
    this.cityTaxAverage = Math.floor(this.cityTaxAverage / TAX_FREQUENCY);

    this.taxFund = Math.floor((population * this.landValueAverage / 120) * this.cityTaxAverage / 100);

    // Calculate road, police, fire maintenance costs
    this.roadFund = Math.floor((this.roadTotal + this.railTotal * 2) * this.gameLevel);
    this.policeFund = this.policeStationPop * 100;
    this.fireFund = this.fireStationPop * 100;

    // Calculate actual spending
    const total = this.roadFund + this.policeFund + this.fireFund;

    if (this.totalFunds + this.taxFund >= total) {
      this.roadSpend = this.roadFund;
      this.policeSpend = this.policeFund;
      this.fireSpend = this.fireFund;
    } else {
      // Not enough money - cut proportionally
      const ratio = (this.totalFunds + this.taxFund) / total;
      this.roadSpend = Math.floor(this.roadFund * ratio);
      this.policeSpend = Math.floor(this.policeFund * ratio);
      this.fireSpend = Math.floor(this.fireFund * ratio);
    }

    // Update funds
    this.cashFlow = this.taxFund - this.roadSpend - this.policeSpend - this.fireSpend;
    this.totalFunds += this.cashFlow;

    // Reset tax average
    this.cityTaxAverage = 0;

    this.mustUpdateFunds = true;
  }

  /**
   * Get total population
   */
  public getPopulation(): number {
    return Math.floor(this.resPop / 8) + this.comPop + this.indPop;
  }

  /**
   * Update fund effects
   */
  public updateFundEffects(): void {
    // Road effect
    if (this.roadFund > 0) {
      this.roadEffect = Math.floor((this.roadSpend / this.roadFund) * MAX_ROAD_EFFECT);
    } else {
      this.roadEffect = MAX_ROAD_EFFECT;
    }

    // Police effect
    if (this.policeFund > 0) {
      this.policeEffect = Math.floor((this.policeSpend / this.policeFund) * MAX_POLICE_STATION_EFFECT);
    } else {
      this.policeEffect = MAX_POLICE_STATION_EFFECT;
    }

    // Fire effect
    if (this.fireFund > 0) {
      this.fireEffect = Math.floor((this.fireSpend / this.fireFund) * MAX_FIRE_STATION_EFFECT);
    } else {
      this.fireEffect = MAX_FIRE_STATION_EFFECT;
    }
  }

  /**
   * City evaluation
   */
  private cityEvaluation(): void {
    // Calculate total population
    this.cityPop = this.getPopulation();
    this.cityPopDelta = this.cityPop - this.totalPopLast;
    this.totalPopLast = this.cityPop;

    // Determine city class
    this.cityClass = this.getCityClass(this.cityPop);

    // Calculate city score (0-1000)
    let score = 500;

    // Population growth bonus
    if (this.cityPopDelta > 0) {
      score += Math.min(100, Math.floor(this.cityPopDelta / 100));
    } else if (this.cityPopDelta < 0) {
      score += Math.max(-100, Math.floor(this.cityPopDelta / 100));
    }

    // Crime penalty
    score -= Math.floor(this.crimeAverage / 5);

    // Pollution penalty
    score -= Math.floor(this.pollutionAverage / 5);

    // Unemployment penalty
    const employment = (this.comPop + this.indPop) * 8;
    if (this.resPop > 0) {
      const unemployment = Math.max(0, (this.resPop - employment) / this.resPop);
      score -= Math.floor(unemployment * 100);
    }

    // Tax penalty
    if (this.cityTax > 10) {
      score -= (this.cityTax - 10) * 5;
    }

    // Unpowered zone penalty
    if (this.poweredZoneCount + this.unpoweredZoneCount > 0) {
      const unpoweredRatio = this.unpoweredZoneCount / (this.poweredZoneCount + this.unpoweredZoneCount);
      score -= Math.floor(unpoweredRatio * 100);
    }

    // Traffic penalty
    score -= Math.floor(this.trafficAverage / 4);

    // Clamp score
    this.cityScoreDelta = score - this.cityScore;
    this.cityScore = Math.max(0, Math.min(1000, score));

    // Calculate assessed value
    this.getAssessedValue();

    this.evalChanged = true;
  }

  /**
   * Get city class from population
   */
  private getCityClass(pop: number): CityClass {
    if (pop >= 500000) return CityClass.MEGALOPOLIS;
    if (pop >= 100000) return CityClass.METROPOLIS;
    if (pop >= 50000) return CityClass.CAPITAL;
    if (pop >= 10000) return CityClass.CITY;
    if (pop >= 2000) return CityClass.TOWN;
    return CityClass.VILLAGE;
  }

  /**
   * Calculate assessed value
   */
  private getAssessedValue(): void {
    let value = 0;

    value += this.roadTotal * 10;
    value += this.railTotal * 15;
    value += this.policeStationPop * 500;
    value += this.fireStationPop * 500;
    value += this.hospitalPop * 400;
    value += this.stadiumPop * 3000;
    value += this.seaportPop * 5000;
    value += this.airportPop * 10000;
    value += this.coalPowerPop * 3000;
    value += this.nuclearPowerPop * 6000;

    this.cityAssessedValue = value * 1000;
  }

  /**
   * Process disasters
   */
  private doDisasters(): void {
    if (!this.enableDisasters) return;

    // Random disaster chance
    if (this.random.getRandom(1000) === 0) {
      const disaster = this.random.getRandom(8);
      switch (disaster) {
        case 0:
        case 1:
          this.setFire();
          break;
        case 2:
        case 3:
          this.makeFlood();
          break;
        case 4:
          this.makeAirCrash();
          break;
        case 5:
          this.makeTornado();
          break;
        case 6:
          this.makeEarthquake();
          break;
        case 7:
          this.makeMonster();
          break;
      }
    }
  }

  /**
   * Start a fire
   */
  public setFire(): void {
    const x = this.random.getRandom(WORLD_W - 1);
    const y = this.random.getRandom(WORLD_H - 1);
    const tile = this.map.getTile(x, y);

    if ((tile & TileBits.BURNBIT) !== 0) {
      this.map.setTile(x, y, this.randomFire());
      this.sendMessage('Fire!', x, y, true);
    }
  }

  /**
   * Make a flood
   */
  public makeFlood(): void {
    for (let attempts = 0; attempts < 300; attempts++) {
      const x = this.random.getRandom(WORLD_W - 1);
      const y = this.random.getRandom(WORLD_H - 1);
      const tile = getTileValue(this.map.getTile(x, y));

      if (tile >= Tiles.WATER_LOW && tile <= Tiles.WATER_HIGH) {
        // Found water - flood adjacent land
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.map.onMap(nx, ny)) {
              const adjTile = this.map.getTile(nx, ny);
              if ((adjTile & TileBits.BULLBIT) !== 0) {
                this.map.setTile(nx, ny, Tiles.FLOOD);
              }
            }
          }
        }
        this.floodCount = 30;
        this.sendMessage('Flooding!', x, y, true);
        return;
      }
    }
  }

  /**
   * Make air crash
   */
  private makeAirCrash(): void {
    // Find plane sprite
    const plane = this.sprites.find(s => s.type === SpriteType.AIRPLANE || s.type === SpriteType.HELICOPTER);
    if (plane) {
      this.makeExplosion(Math.floor(plane.x / 16), Math.floor(plane.y / 16));
      this.sendMessage('Plane crash!', Math.floor(plane.x / 16), Math.floor(plane.y / 16), true);
    }
  }

  /**
   * Make a tornado
   */
  public makeTornado(): void {
    const x = this.random.getRandom(WORLD_W - 1);
    const y = this.random.getRandom(WORLD_H - 1);

    this.sprites.push({
      type: SpriteType.TORNADO,
      frame: 1,
      x: x * 16,
      y: y * 16,
      width: 32,
      height: 32,
      xOffset: 0,
      yOffset: 0,
      xHot: 0,
      yHot: 0,
      origX: x * 16,
      origY: y * 16,
      destX: this.random.getRandom(WORLD_W - 1) * 16,
      destY: this.random.getRandom(WORLD_H - 1) * 16,
      count: 200,
      soundCount: 0,
      dir: 0,
      newDir: 0,
      step: 0,
      flag: 0,
      control: 0,
      turn: 0,
      accel: 0,
      speed: 0,
    });

    this.sendMessage('Tornado!', x, y, true);
  }

  /**
   * Make an earthquake
   */
  public makeEarthquake(): void {
    const strength = this.random.getRandom(700) + 300;

    for (let i = 0; i < strength; i++) {
      const x = this.random.getRandom(WORLD_W - 1);
      const y = this.random.getRandom(WORLD_H - 1);
      const tile = this.map.getTile(x, y);

      if ((tile & TileBits.BULLBIT) !== 0) {
        if (this.random.getRandom(3) !== 0) {
          this.map.setTile(x, y, this.randomRubble());
        } else if ((tile & TileBits.BURNBIT) !== 0) {
          this.map.setTile(x, y, this.randomFire());
        }
      }
    }

    this.sendMessage('Earthquake!', WORLD_W / 2, WORLD_H / 2, true);
  }

  /**
   * Make a monster
   */
  public makeMonster(): void {
    const x = this.random.getRandom(WORLD_W - 1);
    const y = this.random.getRandom(WORLD_H - 1);

    this.sprites.push({
      type: SpriteType.MONSTER,
      frame: 1,
      x: x * 16,
      y: y * 16,
      width: 48,
      height: 48,
      xOffset: 0,
      yOffset: 0,
      xHot: 0,
      yHot: 0,
      origX: x * 16,
      origY: y * 16,
      destX: this.pollutionMaxX * 16,
      destY: this.pollutionMaxY * 16,
      count: 500,
      soundCount: 0,
      dir: this.random.getRandom(7),
      newDir: 0,
      step: 0,
      flag: 0,
      control: 0,
      turn: 0,
      accel: 0,
      speed: 0,
    });

    this.sendMessage('Monster!', x, y, true);
  }

  /**
   * Make an explosion
   */
  public makeExplosion(x: number, y: number): void {
    this.sprites.push({
      type: SpriteType.EXPLOSION,
      frame: 1,
      x: x * 16,
      y: y * 16,
      width: 32,
      height: 32,
      xOffset: 0,
      yOffset: 0,
      xHot: 0,
      yHot: 0,
      origX: x * 16,
      origY: y * 16,
      destX: x * 16,
      destY: y * 16,
      count: 6,
      soundCount: 0,
      dir: 0,
      newDir: 0,
      step: 0,
      flag: 0,
      control: 0,
      turn: 0,
      accel: 0,
      speed: 0,
    });

    // Destroy surrounding tiles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.map.onMap(nx, ny)) {
          const tile = this.map.getTile(nx, ny);
          if ((tile & TileBits.BULLBIT) !== 0) {
            this.map.setTile(nx, ny, this.randomRubble());
          }
        }
      }
    }
  }

  /**
   * Generate a train
   */
  private generateTrain(pos: Position): void {
    // Find end of track
    this.sprites.push({
      type: SpriteType.TRAIN,
      frame: 1,
      x: pos.x * 16,
      y: pos.y * 16,
      width: 32,
      height: 32,
      xOffset: 0,
      yOffset: 0,
      xHot: 0,
      yHot: 0,
      origX: pos.x * 16,
      origY: pos.y * 16,
      destX: 0,
      destY: 0,
      count: 25,
      soundCount: 0,
      dir: this.random.getRandom(3),
      newDir: 0,
      step: 0,
      flag: 0,
      control: 0,
      turn: 0,
      accel: 0,
      speed: 0,
    });
  }

  /**
   * Generate a ship
   */
  private generateShip(): void {
    // Find water edge
    for (let x = 0; x < WORLD_W; x++) {
      const tile = getTileValue(this.map.getTile(x, 0));
      if (tile >= Tiles.WATER_LOW && tile <= Tiles.WATER_HIGH) {
        this.sprites.push({
          type: SpriteType.SHIP,
          frame: 1,
          x: x * 16,
          y: 0,
          width: 48,
          height: 48,
          xOffset: 0,
          yOffset: 0,
          xHot: 0,
          yHot: 0,
          origX: x * 16,
          origY: 0,
          destX: (WORLD_W / 2) * 16,
          destY: (WORLD_H / 2) * 16,
          count: 100,
          soundCount: 0,
          dir: 2,
          newDir: 0,
          step: 0,
          flag: 0,
          control: 0,
          turn: 0,
          accel: 0,
          speed: 0,
        });
        return;
      }
    }
  }

  /**
   * Generate a plane
   */
  private generatePlane(pos: Position): void {
    this.sprites.push({
      type: SpriteType.AIRPLANE,
      frame: 1,
      x: pos.x * 16,
      y: pos.y * 16,
      width: 48,
      height: 48,
      xOffset: 0,
      yOffset: 0,
      xHot: 0,
      yHot: 0,
      origX: pos.x * 16,
      origY: pos.y * 16,
      destX: 0,
      destY: (WORLD_H / 2) * 16,
      count: 200,
      soundCount: 0,
      dir: 5,
      newDir: 0,
      step: 0,
      flag: 0,
      control: 0,
      turn: 0,
      accel: 0,
      speed: 4,
    });
  }

  /**
   * Generate a helicopter
   */
  private generateCopter(pos: Position): void {
    this.sprites.push({
      type: SpriteType.HELICOPTER,
      frame: 1,
      x: pos.x * 16,
      y: pos.y * 16,
      width: 32,
      height: 32,
      xOffset: 0,
      yOffset: 0,
      xHot: 0,
      yHot: 0,
      origX: pos.x * 16,
      origY: pos.y * 16,
      destX: this.random.getRandom(WORLD_W - 1) * 16,
      destY: this.random.getRandom(WORLD_H - 1) * 16,
      count: 150,
      soundCount: 0,
      dir: this.random.getRandom(7),
      newDir: 0,
      step: 0,
      flag: 0,
      control: 0,
      turn: 0,
      accel: 0,
      speed: 2,
    });
  }

  /**
   * Send game messages
   */
  private sendMessages(): void {
    // Check for various conditions
    if (this.unpoweredZoneCount > this.poweredZoneCount) {
      this.sendMessage('More zones need power!');
    }

    if (this.cityTax > 12) {
      this.sendMessage('Citizens demand lower taxes!');
    }

    if (this.roadEffect < 20) {
      this.sendMessage('Roads need funding!');
    }

    if (this.policeEffect < 500) {
      this.sendMessage('Police need funding!');
    }

    if (this.fireEffect < 500) {
      this.sendMessage('Fire department needs funding!');
    }

    if (this.trafficAverage > 150) {
      this.sendMessage('Traffic is very heavy!');
    }

    if (this.crimeAverage > 100) {
      this.sendMessage('Crime is very high!');
    }

    if (this.pollutionAverage > 100) {
      this.sendMessage('Pollution is very high!');
    }
  }

  /**
   * Send a message
   */
  private sendMessage(message: string, x?: number, y?: number, important?: boolean): void {
    if (this.onMessage) {
      this.onMessage(message, x, y, important);
    }
  }

  /**
   * Invalidate maps (increment serial number)
   */
  public invalidateMaps(): void {
    this.mapSerial++;
  }

  /**
   * Tool handler - apply a tool to the map
   */
  public doTool(tool: EditingTool, x: number, y: number): ToolResult {
    if (!this.map.onMap(x, y)) {
      return ToolResult.FAILED;
    }

    const cost = TOOL_COSTS[tool];
    if (cost > this.totalFunds) {
      return ToolResult.NO_MONEY;
    }

    let result = ToolResult.FAILED;

    switch (tool) {
      case EditingTool.BULLDOZER:
        result = this.doBulldozer(x, y);
        break;
      case EditingTool.ROAD:
        result = this.doRoadTool(x, y);
        break;
      case EditingTool.RAILROAD:
        result = this.doRailTool(x, y);
        break;
      case EditingTool.WIRE:
        result = this.doWireTool(x, y);
        break;
      case EditingTool.PARK:
        result = this.doParkTool(x, y);
        break;
      case EditingTool.RESIDENTIAL:
        result = this.doZoneTool(x, y, Tiles.FREEZ);
        break;
      case EditingTool.COMMERCIAL:
        result = this.doZoneTool(x, y, Tiles.COMCLR);
        break;
      case EditingTool.INDUSTRIAL:
        result = this.doZoneTool(x, y, Tiles.INDCLR);
        break;
      case EditingTool.FIRESTATION:
        result = this.doBuildingTool(x, y, Tiles.FIRESTBASE, 3);
        break;
      case EditingTool.POLICESTATION:
        result = this.doBuildingTool(x, y, Tiles.POLICESTBASE, 3);
        break;
      case EditingTool.STADIUM:
        result = this.doBuildingTool(x, y, Tiles.STADIUMBASE, 4);
        break;
      case EditingTool.SEAPORT:
        result = this.doBuildingTool(x, y, Tiles.PORTBASE, 4);
        break;
      case EditingTool.COALPOWER:
        result = this.doBuildingTool(x, y, Tiles.COALBASE, 4);
        break;
      case EditingTool.NUCLEARPOWER:
        result = this.doBuildingTool(x, y, Tiles.NUCLEARBASE, 4);
        break;
      case EditingTool.AIRPORT:
        result = this.doBuildingTool(x, y, Tiles.AIRPORTBASE, 6);
        break;
      case EditingTool.QUERY:
        // Query doesn't cost money and always succeeds
        return ToolResult.OK;
    }

    if (result === ToolResult.OK) {
      this.spend(cost);
      this.invalidateMaps();
    }

    return result;
  }

  /**
   * Spend money
   */
  public spend(amount: number): void {
    this.totalFunds -= amount;
    this.mustUpdateFunds = true;
  }

  /**
   * Bulldozer tool
   */
  private doBulldozer(x: number, y: number): ToolResult {
    const tile = this.map.getTile(x, y);
    const tileValue = getTileValue(tile);

    // Can't bulldoze water
    if (tileValue >= Tiles.WATER_LOW && tileValue <= Tiles.WATER_HIGH) {
      return ToolResult.FAILED;
    }

    // Already clear
    if (tileValue === Tiles.DIRT) {
      return ToolResult.FAILED;
    }

    // Check if bulldozable
    if ((tile & TileBits.BULLBIT) === 0) {
      return ToolResult.NEED_BULLDOZE;
    }

    this.map.setTile(x, y, Tiles.DIRT);
    return ToolResult.OK;
  }

  /**
   * Road tool
   */
  private doRoadTool(x: number, y: number): ToolResult {
    const tile = this.map.getTile(x, y);
    const tileValue = getTileValue(tile);

    // Already a road
    if (tileValue >= Tiles.ROADBASE && tileValue <= Tiles.LASTROAD) {
      return ToolResult.FAILED;
    }

    // Must be empty or bulldozable
    if (tileValue !== Tiles.DIRT && (tile & TileBits.BULLBIT) === 0) {
      return ToolResult.NEED_BULLDOZE;
    }

    // Auto-bulldoze if enabled
    if (tileValue !== Tiles.DIRT && this.autoBulldoze) {
      this.map.setTile(x, y, Tiles.DIRT);
    }

    // Place road
    this.map.setTile(x, y, Tiles.ROADS | TileBits.BULLBIT | TileBits.BURNBIT);
    this.fixZone(x, y);

    return ToolResult.OK;
  }

  /**
   * Rail tool
   */
  private doRailTool(x: number, y: number): ToolResult {
    const tile = this.map.getTile(x, y);
    const tileValue = getTileValue(tile);

    // Already a rail
    if (tileValue >= Tiles.RAILBASE && tileValue <= Tiles.LASTRAIL) {
      return ToolResult.FAILED;
    }

    // Must be empty or bulldozable
    if (tileValue !== Tiles.DIRT && (tile & TileBits.BULLBIT) === 0) {
      return ToolResult.NEED_BULLDOZE;
    }

    // Auto-bulldoze if enabled
    if (tileValue !== Tiles.DIRT && this.autoBulldoze) {
      this.map.setTile(x, y, Tiles.DIRT);
    }

    // Place rail
    this.map.setTile(x, y, Tiles.LHRAIL | TileBits.BULLBIT | TileBits.BURNBIT);
    this.fixZone(x, y);

    return ToolResult.OK;
  }

  /**
   * Wire/power line tool
   */
  private doWireTool(x: number, y: number): ToolResult {
    const tile = this.map.getTile(x, y);
    const tileValue = getTileValue(tile);

    // Already a power line
    if (tileValue >= Tiles.POWERBASE && tileValue <= Tiles.LASTPOWER) {
      return ToolResult.FAILED;
    }

    // Must be empty or bulldozable
    if (tileValue !== Tiles.DIRT && (tile & TileBits.BULLBIT) === 0) {
      return ToolResult.NEED_BULLDOZE;
    }

    // Auto-bulldoze if enabled
    if (tileValue !== Tiles.DIRT && this.autoBulldoze) {
      this.map.setTile(x, y, Tiles.DIRT);
    }

    // Place power line
    this.map.setTile(x, y, Tiles.LHPOWER | TileBits.BULLBIT | TileBits.BURNBIT | TileBits.CONDBIT);
    this.fixZone(x, y);

    return ToolResult.OK;
  }

  /**
   * Park tool
   */
  private doParkTool(x: number, y: number): ToolResult {
    const tile = this.map.getTile(x, y);
    const tileValue = getTileValue(tile);

    // Must be empty
    if (tileValue !== Tiles.DIRT) {
      if ((tile & TileBits.BULLBIT) === 0) {
        return ToolResult.NEED_BULLDOZE;
      }
      if (this.autoBulldoze) {
        this.map.setTile(x, y, Tiles.DIRT);
      } else {
        return ToolResult.NEED_BULLDOZE;
      }
    }

    // Place park (fountain or trees)
    const parkTile = this.random.getRandom(4) === 0 ?
                     Tiles.FOUNTAIN :
                     (Tiles.WOODS + this.random.getRandom(4));
    this.map.setTile(x, y, parkTile | TileBits.BULLBIT | TileBits.BURNBIT);

    return ToolResult.OK;
  }

  /**
   * Zone tool (3x3)
   */
  private doZoneTool(x: number, y: number, centerTile: number): ToolResult {
    const size = 3;
    const offset = 1;

    // Check area is clear
    for (let dx = -offset; dx < size - offset; dx++) {
      for (let dy = -offset; dy < size - offset; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.map.onMap(nx, ny)) {
          return ToolResult.FAILED;
        }
        const tile = this.map.getTile(nx, ny);
        const tileValue = getTileValue(tile);
        if (tileValue !== Tiles.DIRT) {
          if ((tile & TileBits.BULLBIT) === 0) {
            return ToolResult.NEED_BULLDOZE;
          }
        }
      }
    }

    // Clear the area
    for (let dx = -offset; dx < size - offset; dx++) {
      for (let dy = -offset; dy < size - offset; dy++) {
        this.map.setTile(x + dx, y + dy, Tiles.DIRT);
      }
    }

    // Place the zone
    this.zonePlop({ x, y }, centerTile);

    return ToolResult.OK;
  }

  /**
   * Building tool (variable size)
   */
  private doBuildingTool(x: number, y: number, baseTile: number, size: number): ToolResult {
    const offset = Math.floor(size / 2);

    // Check area is clear
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        const nx = x - offset + dx;
        const ny = y - offset + dy;
        if (!this.map.onMap(nx, ny)) {
          return ToolResult.FAILED;
        }
        const tile = this.map.getTile(nx, ny);
        const tileValue = getTileValue(tile);
        if (tileValue !== Tiles.DIRT) {
          if ((tile & TileBits.BULLBIT) === 0) {
            return ToolResult.NEED_BULLDOZE;
          }
        }
      }
    }

    // Place the building
    let tileOffset = 0;
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const nx = x - offset + dx;
        const ny = y - offset + dy;
        let tile = baseTile + tileOffset;

        // Center tile gets zone bit
        if (dx === offset && dy === offset) {
          tile |= TileBits.ZONEBIT | TileBits.CONDBIT | TileBits.PWRBIT | TileBits.BULLBIT;
        } else {
          tile |= TileBits.CONDBIT | TileBits.BURNBIT;
        }

        this.map.setTile(nx, ny, tile);
        tileOffset++;
      }
    }

    return ToolResult.OK;
  }

  /**
   * Fix zone connections (roads, rails, power)
   */
  private fixZone(x: number, y: number): void {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (this.map.onMap(nx, ny)) {
        this.fixSingle(nx, ny);
      }
    }
    this.fixSingle(x, y);
  }

  /**
   * Fix a single tile's connections
   */
  private fixSingle(x: number, y: number): void {
    const tile = this.map.getTile(x, y);
    const tileValue = getTileValue(tile);

    // Fix road connections
    if (tileValue >= Tiles.ROADS && tileValue <= Tiles.INTERSECTION) {
      let roadPattern = 0;
      if (this.isRoadAt(x, y - 1)) roadPattern |= 1;
      if (this.isRoadAt(x + 1, y)) roadPattern |= 2;
      if (this.isRoadAt(x, y + 1)) roadPattern |= 4;
      if (this.isRoadAt(x - 1, y)) roadPattern |= 8;

      const roadTiles = [
        Tiles.ROADS, Tiles.ROADS2, Tiles.ROADS, Tiles.ROADS3,
        Tiles.ROADS2, Tiles.ROADS4, Tiles.ROADS5, Tiles.ROADS6,
        Tiles.ROADS, Tiles.ROADS7, Tiles.ROADS2, Tiles.ROADS8,
        Tiles.ROADS9, Tiles.ROADS10, Tiles.ROADS5, Tiles.INTERSECTION,
      ];

      this.map.setTile(x, y, roadTiles[roadPattern] | TileBits.BULLBIT | TileBits.BURNBIT);
    }

    // Fix rail connections
    if (tileValue >= Tiles.LHRAIL && tileValue <= Tiles.LVRAIL10) {
      let railPattern = 0;
      if (this.isRailAt(x, y - 1)) railPattern |= 1;
      if (this.isRailAt(x + 1, y)) railPattern |= 2;
      if (this.isRailAt(x, y + 1)) railPattern |= 4;
      if (this.isRailAt(x - 1, y)) railPattern |= 8;

      const railTiles = [
        Tiles.LHRAIL, Tiles.LVRAIL, Tiles.LHRAIL, Tiles.LVRAIL2,
        Tiles.LVRAIL, Tiles.LVRAIL3, Tiles.LVRAIL4, Tiles.LVRAIL5,
        Tiles.LHRAIL, Tiles.LVRAIL6, Tiles.LVRAIL, Tiles.LVRAIL7,
        Tiles.LVRAIL8, Tiles.LVRAIL9, Tiles.LVRAIL4, Tiles.LVRAIL10,
      ];

      this.map.setTile(x, y, railTiles[railPattern] | TileBits.BULLBIT | TileBits.BURNBIT);
    }

    // Fix power line connections
    if (tileValue >= Tiles.LHPOWER && tileValue <= Tiles.LVPOWER10) {
      let powerPattern = 0;
      if (this.isPowerAt(x, y - 1)) powerPattern |= 1;
      if (this.isPowerAt(x + 1, y)) powerPattern |= 2;
      if (this.isPowerAt(x, y + 1)) powerPattern |= 4;
      if (this.isPowerAt(x - 1, y)) powerPattern |= 8;

      const powerTiles = [
        Tiles.LHPOWER, Tiles.LVPOWER, Tiles.LHPOWER, Tiles.LVPOWER2,
        Tiles.LVPOWER, Tiles.LVPOWER3, Tiles.LVPOWER4, Tiles.LVPOWER5,
        Tiles.LHPOWER, Tiles.LVPOWER6, Tiles.LVPOWER, Tiles.LVPOWER7,
        Tiles.LVPOWER8, Tiles.LVPOWER9, Tiles.LVPOWER4, Tiles.LVPOWER10,
      ];

      this.map.setTile(x, y, powerTiles[powerPattern] | TileBits.BULLBIT | TileBits.BURNBIT | TileBits.CONDBIT);
    }
  }

  /**
   * Check if tile is road or connects to roads
   */
  private isRoadAt(x: number, y: number): boolean {
    if (!this.map.onMap(x, y)) return false;
    const tile = getTileValue(this.map.getTile(x, y));
    return tile >= Tiles.ROADBASE && tile <= Tiles.LASTROAD;
  }

  /**
   * Check if tile is rail
   */
  private isRailAt(x: number, y: number): boolean {
    if (!this.map.onMap(x, y)) return false;
    const tile = getTileValue(this.map.getTile(x, y));
    return tile >= Tiles.RAILBASE && tile <= Tiles.LASTRAIL;
  }

  /**
   * Check if tile is power or conductive
   */
  private isPowerAt(x: number, y: number): boolean {
    if (!this.map.onMap(x, y)) return false;
    const tile = this.map.getTile(x, y);
    const tileValue = getTileValue(tile);
    // Power lines or conductive tiles
    return (tileValue >= Tiles.POWERBASE && tileValue <= Tiles.LASTPOWER) ||
           ((tile & TileBits.CONDBIT) !== 0);
  }

  /**
   * Get city statistics
   */
  public getStats(): CityStats {
    return {
      totalPop: this.getPopulation(),
      resPop: this.resPop,
      comPop: this.comPop,
      indPop: this.indPop,
      resZonePop: this.resZonePop,
      comZonePop: this.comZonePop,
      indZonePop: this.indZonePop,
      hospitalPop: this.hospitalPop,
      churchPop: this.churchPop,
      policeStationPop: this.policeStationPop,
      fireStationPop: this.fireStationPop,
      stadiumPop: this.stadiumPop,
      coalPowerPop: this.coalPowerPop,
      nuclearPowerPop: this.nuclearPowerPop,
      seaportPop: this.seaportPop,
      airportPop: this.airportPop,
      crimeAverage: this.crimeAverage,
      pollutionAverage: this.pollutionAverage,
      landValueAverage: this.landValueAverage,
      cityScore: this.cityScore,
      cityClass: this.cityClass,
    };
  }

  /**
   * Get budget data
   */
  public getBudget(): BudgetData {
    return {
      totalFunds: this.totalFunds,
      taxFund: this.taxFund,
      roadFund: this.roadFund,
      policeFund: this.policeFund,
      fireFund: this.fireFund,
      roadSpend: this.roadSpend,
      policeSpend: this.policeSpend,
      fireSpend: this.fireSpend,
      roadPercent: this.roadPercent,
      policePercent: this.policePercent,
      firePercent: this.firePercent,
      roadEffect: this.roadEffect,
      policeEffect: this.policeEffect,
      fireEffect: this.fireEffect,
      cityTax: this.cityTax,
    };
  }

  /**
   * Set city tax rate
   */
  public setCityTax(tax: number): void {
    this.cityTax = Math.max(0, Math.min(20, tax));
  }

  /**
   * Set simulation speed
   */
  public setSpeed(speed: SimSpeed): void {
    this.simSpeed = speed;
    this.simPaused = speed === SimSpeed.PAUSED;
  }

  /**
   * Set game level
   */
  public setGameLevel(level: GameLevel): void {
    this.gameLevel = level;

    // Adjust starting funds based on level
    switch (level) {
      case GameLevel.EASY:
        this.totalFunds = 20000;
        break;
      case GameLevel.MEDIUM:
        this.totalFunds = 10000;
        break;
      case GameLevel.HARD:
        this.totalFunds = 5000;
        break;
    }
  }

  /**
   * Start a new game
   */
  public newGame(seed?: number): void {
    this.generateMap(seed);
    this.cityTime = 0;
    this.cityYear = this.startingYear;
    this.cityMonth = 0;
    this.totalFunds = 20000;
    this.cityTax = DEFAULT_CITY_TAX;
    this.cityScore = 500;
    this.sprites = [];

    // Reset all counters
    this.clearCensus();
    this.censusChanged = true;
    this.doInitialEval = true;

    // Initial power scan
    this.doPowerScan();
  }
}
