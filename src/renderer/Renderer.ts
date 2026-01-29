/**
 * Three.js 3D Renderer for Micropolis
 */

import * as THREE from 'three';
import { WORLD_W, WORLD_H } from '../core/constants';
import { Tiles, getTileValue, isZoneCenter } from '../core/tiles';
import { Micropolis } from '../simulation/Micropolis';
import { getAssetLoader, AssetLoader } from '../assets/AssetLoader';
import { getModelForTile, getZoneSize, ModelAsset } from '../assets/AssetManifest';

// Tile size in 3D units
const TILE_SIZE = 1.0;

// Retro color palette (more saturated, cleaner colors)
const COLORS = {
  DIRT: 0x8B6914,
  GRASS: 0x228B22,
  WATER: 0x0066CC,
  TREES: 0x006600,
  ROAD: 0x333333,
  RAIL: 0x555555,
  POWER: 0xFFCC00,
  RESIDENTIAL: 0x00CC00,
  COMMERCIAL: 0x0066FF,
  INDUSTRIAL: 0xCCCC00,
  FIRE: 0xFF3300,
  RUBBLE: 0x665544,
  POLLUTION: 0x666600,
  POWERED: 0xFFFFFF,
  UNPOWERED: 0x333333,
  SPECIAL: 0xCC00CC,
  GRID: 0x444444,
  CURSOR: 0x00FFFF,
};

// Building heights based on zone development
const BUILDING_HEIGHTS = {
  RES_BASE: 0.2,
  RES_MAX: 2.0,
  COM_BASE: 0.3,
  COM_MAX: 3.0,
  IND_BASE: 0.4,
  IND_MAX: 1.5,
  POWER_PLANT: 2.5,
  STADIUM: 1.0,
  AIRPORT: 0.5,
  SEAPORT: 0.8,
  POLICE: 0.8,
  FIRE: 0.8,
  HOSPITAL: 1.2,
  CHURCH: 1.5,
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private simulation: Micropolis;

  // Terrain mesh
  private terrainMesh: THREE.InstancedMesh | null = null;
  private buildingMeshes: THREE.Group;
  private waterMesh: THREE.Mesh | null = null;
  private spriteMeshes: THREE.Group;

  // Grid and cursor
  private gridMesh: THREE.LineSegments | null = null;
  private cursorMesh: THREE.Mesh | null = null;
  private cursorOutline: THREE.LineSegments | null = null;
  private currentTileX: number = -1;
  private currentTileY: number = -1;
  private cursorSize: number = 1; // Size in tiles for current tool

  // Camera controls
  private cameraTarget: THREE.Vector3;
  private cameraAngle: number = Math.PI / 4;
  private cameraPitch: number = Math.PI / 4;
  private cameraDistance: number = 80;

  // Input state
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private keys: Set<string> = new Set();

  // Materials
  private materials: Map<string, THREE.Material> = new Map();

  // Last map serial for detecting changes
  private lastMapSerial: number = -1;

  // Asset loader for GLTF models
  private assetLoader: AssetLoader;
  private modelsLoaded: boolean = false;

  // Raycaster for mouse picking
  private raycaster: THREE.Raycaster;
  private mousePos: THREE.Vector2;

  constructor(canvas: HTMLCanvasElement, simulation: Micropolis) {
    this.canvas = canvas;
    this.simulation = simulation;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a1a2e);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    this.scene.fog = new THREE.Fog(0x87CEEB, 150, 300);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
    this.cameraTarget = new THREE.Vector3(WORLD_W / 2, 0, WORLD_H / 2);
    this.updateCamera();

    // Create groups
    this.buildingMeshes = new THREE.Group();
    this.scene.add(this.buildingMeshes);
    this.spriteMeshes = new THREE.Group();
    this.scene.add(this.spriteMeshes);

    // Create raycaster
    this.raycaster = new THREE.Raycaster();
    this.mousePos = new THREE.Vector2();

    // Asset loader
    this.assetLoader = getAssetLoader();

    // Setup
    this.setupLights();
    this.setupMaterials();
    this.setupGrid();
    this.setupCursor();
    this.setupInputHandlers();
    this.resize();

    // Initial terrain build
    this.rebuildTerrain();
  }

  /**
   * Setup lighting - bright and even for retro look
   */
  private setupLights(): void {
    // Bright ambient light for flat retro look
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    // Directional light (sun) - softer shadows
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 250;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);

    // Hemisphere light for subtle sky/ground variation
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.2);
    this.scene.add(hemi);
  }

  /**
   * Setup materials - flat Lambert materials for retro look
   */
  private setupMaterials(): void {
    // Ground material - grass green
    this.materials.set('ground', new THREE.MeshLambertMaterial({
      color: 0x55AA55,
    }));

    // Water material
    this.materials.set('water', new THREE.MeshLambertMaterial({
      color: COLORS.WATER,
      transparent: true,
      opacity: 0.85,
    }));

    // Tree material
    this.materials.set('tree', new THREE.MeshLambertMaterial({
      color: COLORS.TREES,
    }));

    // Road material
    this.materials.set('road', new THREE.MeshLambertMaterial({
      color: COLORS.ROAD,
    }));

    // Rail material
    this.materials.set('rail', new THREE.MeshLambertMaterial({
      color: COLORS.RAIL,
    }));

    // Power line material
    this.materials.set('power', new THREE.MeshLambertMaterial({
      color: COLORS.POWER,
      emissive: COLORS.POWER,
      emissiveIntensity: 0.3,
    }));

    // Residential material - green tint
    this.materials.set('residential', new THREE.MeshLambertMaterial({
      color: COLORS.RESIDENTIAL,
    }));

    // Commercial material - blue tint
    this.materials.set('commercial', new THREE.MeshLambertMaterial({
      color: COLORS.COMMERCIAL,
    }));

    // Industrial material - yellow tint
    this.materials.set('industrial', new THREE.MeshLambertMaterial({
      color: COLORS.INDUSTRIAL,
    }));

    // Special building material - purple/magenta
    this.materials.set('special', new THREE.MeshLambertMaterial({
      color: COLORS.SPECIAL,
    }));

    // Fire material
    this.materials.set('fire', new THREE.MeshLambertMaterial({
      color: COLORS.FIRE,
      emissive: COLORS.FIRE,
      emissiveIntensity: 1.0,
    }));

    // Rubble material
    this.materials.set('rubble', new THREE.MeshLambertMaterial({
      color: COLORS.RUBBLE,
    }));
  }

  /**
   * Setup the tile grid overlay
   */
  private setupGrid(): void {
    const gridLines: number[] = [];

    // Vertical lines
    for (let x = 0; x <= WORLD_W; x++) {
      gridLines.push(x * TILE_SIZE, 0.05, 0);
      gridLines.push(x * TILE_SIZE, 0.05, WORLD_H * TILE_SIZE);
    }

    // Horizontal lines
    for (let y = 0; y <= WORLD_H; y++) {
      gridLines.push(0, 0.05, y * TILE_SIZE);
      gridLines.push(WORLD_W * TILE_SIZE, 0.05, y * TILE_SIZE);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(gridLines, 3));

    const material = new THREE.LineBasicMaterial({
      color: COLORS.GRID,
      transparent: true,
      opacity: 0.3,
    });

    this.gridMesh = new THREE.LineSegments(geometry, material);
    this.scene.add(this.gridMesh);
  }

  /**
   * Setup the placement cursor
   */
  private setupCursor(): void {
    // Cursor fill (semi-transparent)
    const cursorGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    cursorGeometry.rotateX(-Math.PI / 2);

    const cursorMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.CURSOR,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    this.cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.cursorMesh.position.set(-100, 0.1, -100); // Start off-screen
    this.scene.add(this.cursorMesh);

    // Cursor outline
    const outlineGeometry = new THREE.BufferGeometry();
    const outlineVerts = [
      0, 0, 0,
      TILE_SIZE, 0, 0,
      TILE_SIZE, 0, 0,
      TILE_SIZE, 0, TILE_SIZE,
      TILE_SIZE, 0, TILE_SIZE,
      0, 0, TILE_SIZE,
      0, 0, TILE_SIZE,
      0, 0, 0,
    ];
    outlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(outlineVerts, 3));

    const outlineMaterial = new THREE.LineBasicMaterial({
      color: COLORS.CURSOR,
      linewidth: 2,
    });

    this.cursorOutline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
    this.cursorOutline.position.set(-100, 0.15, -100);
    this.scene.add(this.cursorOutline);
  }

  /**
   * Update cursor position and size
   */
  private updateCursor(): void {
    const tile = this.getTileAtMouse();

    if (tile) {
      this.currentTileX = tile.x;
      this.currentTileY = tile.y;

      // Update cursor fill
      if (this.cursorMesh) {
        const size = this.cursorSize;
        this.cursorMesh.scale.set(size, 1, size);
        this.cursorMesh.position.set(
          tile.x * TILE_SIZE + (size * TILE_SIZE) / 2,
          0.1,
          tile.y * TILE_SIZE + (size * TILE_SIZE) / 2
        );
      }

      // Update cursor outline
      if (this.cursorOutline) {
        const size = this.cursorSize;
        const verts = [
          0, 0, 0,
          size * TILE_SIZE, 0, 0,
          size * TILE_SIZE, 0, 0,
          size * TILE_SIZE, 0, size * TILE_SIZE,
          size * TILE_SIZE, 0, size * TILE_SIZE,
          0, 0, size * TILE_SIZE,
          0, 0, size * TILE_SIZE,
          0, 0, 0,
        ];
        this.cursorOutline.geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        this.cursorOutline.position.set(tile.x * TILE_SIZE, 0.15, tile.y * TILE_SIZE);
      }
    } else {
      // Hide cursor when off-map
      if (this.cursorMesh) {
        this.cursorMesh.position.set(-100, 0.1, -100);
      }
      if (this.cursorOutline) {
        this.cursorOutline.position.set(-100, 0.15, -100);
      }
      this.currentTileX = -1;
      this.currentTileY = -1;
    }
  }

  /**
   * Set the cursor size for current tool
   */
  public setCursorSize(size: number): void {
    this.cursorSize = size;
  }

  /**
   * Get current tile under cursor
   */
  public getCurrentTile(): { x: number; y: number } | null {
    if (this.currentTileX >= 0 && this.currentTileY >= 0) {
      return { x: this.currentTileX, y: this.currentTileY };
    }
    return null;
  }

  /**
   * Setup input handlers
   */
  private setupInputHandlers(): void {
    // Mouse handlers
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard handlers
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Resize handler
    window.addEventListener('resize', this.resize.bind(this));
  }

  /**
   * Mouse down handler
   */
  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2 || e.button === 1) {
      // Right or middle mouse - camera drag
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  /**
   * Mouse move handler
   */
  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      if (e.shiftKey) {
        // Pan camera
        const panSpeed = 0.5;
        const forward = new THREE.Vector3(
          Math.sin(this.cameraAngle),
          0,
          Math.cos(this.cameraAngle)
        );
        const right = new THREE.Vector3(
          Math.cos(this.cameraAngle),
          0,
          -Math.sin(this.cameraAngle)
        );

        this.cameraTarget.addScaledVector(right, -dx * panSpeed);
        this.cameraTarget.addScaledVector(forward, -dy * panSpeed);
      } else {
        // Rotate camera
        this.cameraAngle -= dx * 0.01;
        this.cameraPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1,
          this.cameraPitch + dy * 0.01));
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCamera();
    }

    // Update mouse position for raycasting
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Mouse up handler
   */
  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
  }

  /**
   * Wheel handler
   */
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.cameraDistance = Math.max(20, Math.min(200,
      this.cameraDistance + e.deltaY * 0.1));
    this.updateCamera();
  }

  /**
   * Key down handler
   */
  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
  }

  /**
   * Key up handler
   */
  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  /**
   * Update camera position
   */
  private updateCamera(): void {
    const x = this.cameraTarget.x + Math.sin(this.cameraAngle) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const y = this.cameraTarget.y + Math.sin(this.cameraPitch) * this.cameraDistance;
    const z = this.cameraTarget.z + Math.cos(this.cameraAngle) * Math.cos(this.cameraPitch) * this.cameraDistance;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  /**
   * Handle keyboard input for camera movement
   */
  private handleInput(): void {
    const moveSpeed = 1;
    const forward = new THREE.Vector3(
      Math.sin(this.cameraAngle),
      0,
      Math.cos(this.cameraAngle)
    );
    const right = new THREE.Vector3(
      Math.cos(this.cameraAngle),
      0,
      -Math.sin(this.cameraAngle)
    );

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      this.cameraTarget.addScaledVector(forward, moveSpeed);
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      this.cameraTarget.addScaledVector(forward, -moveSpeed);
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.cameraTarget.addScaledVector(right, -moveSpeed);
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.cameraTarget.addScaledVector(right, moveSpeed);
    }

    // Clamp camera target to map bounds
    this.cameraTarget.x = Math.max(0, Math.min(WORLD_W, this.cameraTarget.x));
    this.cameraTarget.z = Math.max(0, Math.min(WORLD_H, this.cameraTarget.z));

    if (this.keys.size > 0) {
      this.updateCamera();
    }
  }

  /**
   * Resize handler
   */
  public resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.canvas.width = width;
    this.canvas.height = height;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Rebuild terrain mesh
   */
  private rebuildTerrain(): void {
    // Remove old terrain
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
    }
    if (this.waterMesh) {
      this.scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
    }

    // Clear buildings
    while (this.buildingMeshes.children.length > 0) {
      const child = this.buildingMeshes.children[0];
      this.buildingMeshes.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(WORLD_W * TILE_SIZE, WORLD_H * TILE_SIZE);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeometry, this.materials.get('ground'));
    groundMesh.position.set(WORLD_W * TILE_SIZE / 2, -0.01, WORLD_H * TILE_SIZE / 2);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Build water mesh
    this.buildWaterMesh();

    // Build terrain features and buildings
    this.buildTerrainFeatures();
  }

  /**
   * Build water mesh from map
   */
  private buildWaterMesh(): void {
    const waterTiles: THREE.Vector3[] = [];

    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = getTileValue(this.simulation.map.getTile(x, y));
        if (tile >= Tiles.WATER_LOW && tile <= Tiles.WATER_HIGH) {
          waterTiles.push(new THREE.Vector3(x, 0, y));
        }
      }
    }

    if (waterTiles.length > 0) {
      const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      geometry.rotateX(-Math.PI / 2);

      const mesh = new THREE.InstancedMesh(
        geometry,
        this.materials.get('water'),
        waterTiles.length
      );

      const matrix = new THREE.Matrix4();
      waterTiles.forEach((pos, i) => {
        matrix.setPosition(pos.x + 0.5, 0.02, pos.z + 0.5);
        mesh.setMatrixAt(i, matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      this.waterMesh = mesh;
      this.scene.add(mesh);
    }
  }

  /**
   * Build terrain features and buildings
   */
  private buildTerrainFeatures(): void {
    // Collect tiles by type for instanced rendering
    const trees: THREE.Vector3[] = [];
    const roads: THREE.Vector3[] = [];
    const rails: THREE.Vector3[] = [];
    const powerLines: THREE.Vector3[] = [];
    const fires: THREE.Vector3[] = [];
    const rubble: THREE.Vector3[] = [];

    // Zones and buildings
    const buildings: Array<{
      pos: THREE.Vector3;
      size: number;
      height: number;
      material: string;
    }> = [];

    // Track processed zone centers
    const processed = new Set<string>();

    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = this.simulation.map.getTile(x, y);
        const tileValue = getTileValue(tile);

        // Skip water and dirt
        if (tileValue === Tiles.DIRT) continue;
        if (tileValue >= Tiles.WATER_LOW && tileValue <= Tiles.WATER_HIGH) continue;

        // Trees
        if (tileValue >= Tiles.WOODS_LOW && tileValue <= Tiles.WOODS_HIGH) {
          trees.push(new THREE.Vector3(x, 0, y));
          continue;
        }

        // Fire
        if (tileValue >= Tiles.FIREBASE && tileValue <= Tiles.LASTFIRE) {
          fires.push(new THREE.Vector3(x, 0, y));
          continue;
        }

        // Rubble
        if (tileValue >= Tiles.RUBBLE && tileValue <= Tiles.LASTRUBBLE) {
          rubble.push(new THREE.Vector3(x, 0, y));
          continue;
        }

        // Roads
        if (tileValue >= Tiles.ROADBASE && tileValue <= Tiles.LASTROAD) {
          roads.push(new THREE.Vector3(x, 0, y));
          continue;
        }

        // Rails
        if (tileValue >= Tiles.RAILBASE && tileValue <= Tiles.LASTRAIL) {
          rails.push(new THREE.Vector3(x, 0, y));
          continue;
        }

        // Power lines
        if (tileValue >= Tiles.POWERBASE && tileValue <= Tiles.LASTPOWER) {
          powerLines.push(new THREE.Vector3(x, 0, y));
          continue;
        }

        // Zone centers - build 3D buildings
        if (isZoneCenter(tile)) {
          const key = `${x},${y}`;
          if (processed.has(key)) continue;
          processed.add(key);

          const building = this.getBuildingInfo(tileValue, x, y);
          if (building) {
            buildings.push(building);
          }
        }
      }
    }

    // Create instanced meshes for terrain features

    // Trees
    if (trees.length > 0) {
      this.createInstancedTrees(trees);
    }

    // Roads
    if (roads.length > 0) {
      this.createInstancedFlat(roads, 'road', 0.03);
    }

    // Rails
    if (rails.length > 0) {
      this.createInstancedFlat(rails, 'rail', 0.04);
    }

    // Power lines
    if (powerLines.length > 0) {
      this.createInstancedPowerLines(powerLines);
    }

    // Fires
    if (fires.length > 0) {
      this.createInstancedFires(fires);
    }

    // Rubble
    if (rubble.length > 0) {
      this.createInstancedFlat(rubble, 'rubble', 0.1);
    }

    // Buildings
    buildings.forEach(b => this.createBuilding(b));
  }

  /**
   * Get building info from tile
   */
  private getBuildingInfo(tile: number, x: number, y: number): {
    pos: THREE.Vector3;
    size: number;
    height: number;
    material: string;
    modelAsset?: ModelAsset;
  } | null {
    // Try to get a GLTF model for this tile
    const modelAsset = this.modelsLoaded ? getModelForTile(tile) : null;

    // Residential
    if (tile >= Tiles.RESBASE && tile < Tiles.COMBASE) {
      const density = tile < Tiles.HOUSE ? 0 :
                     tile < Tiles.RZB ? (tile - Tiles.HOUSE) / 12 :
                     Math.min(1, (tile - Tiles.RZB) / 150);
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.RES_BASE + density * (BUILDING_HEIGHTS.RES_MAX - BUILDING_HEIGHTS.RES_BASE),
        material: 'residential',
        modelAsset: modelAsset || undefined,
      };
    }

    // Commercial
    if (tile >= Tiles.COMBASE && tile < Tiles.INDBASE) {
      const density = tile === Tiles.COMCLR ? 0 : Math.min(1, (tile - Tiles.CZB) / 175);
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.COM_BASE + density * (BUILDING_HEIGHTS.COM_MAX - BUILDING_HEIGHTS.COM_BASE),
        material: 'commercial',
        modelAsset: modelAsset || undefined,
      };
    }

    // Industrial
    if (tile >= Tiles.INDBASE && tile < Tiles.PORTBASE) {
      const density = tile === Tiles.INDCLR ? 0 : Math.min(1, (tile - Tiles.IZB) / 80);
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.IND_BASE + density * (BUILDING_HEIGHTS.IND_MAX - BUILDING_HEIGHTS.IND_BASE),
        material: 'industrial',
        modelAsset: modelAsset || undefined,
      };
    }

    // Seaport
    if (tile === Tiles.PORT) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 4,
        height: BUILDING_HEIGHTS.SEAPORT,
        material: 'special',
      };
    }

    // Airport
    if (tile === Tiles.AIRPORT) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 6,
        height: BUILDING_HEIGHTS.AIRPORT,
        material: 'special',
      };
    }

    // Power plants
    if (tile === Tiles.POWERPLANT || tile === Tiles.NUCLEAR) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 4,
        height: BUILDING_HEIGHTS.POWER_PLANT,
        material: 'industrial',
        modelAsset: tile === Tiles.POWERPLANT ? modelAsset || undefined : undefined,
      };
    }

    // Fire station
    if (tile === Tiles.FIRESTATION) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.FIRE,
        material: 'special',
        modelAsset: modelAsset || undefined,
      };
    }

    // Police station
    if (tile === Tiles.POLICESTATION) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.POLICE,
        material: 'special',
        modelAsset: modelAsset || undefined,
      };
    }

    // Stadium
    if (tile === Tiles.STADIUM || tile === Tiles.FULLSTADIUM) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 4,
        height: BUILDING_HEIGHTS.STADIUM,
        material: 'special',
      };
    }

    // Hospital
    if (tile === Tiles.HOSPITAL) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.HOSPITAL,
        material: 'special',
        modelAsset: modelAsset || undefined,
      };
    }

    // Church
    if (tile === Tiles.CHURCH || (tile >= Tiles.CHURCH1 && tile <= Tiles.CHURCH7)) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.CHURCH,
        material: 'special',
        modelAsset: modelAsset || undefined,
      };
    }

    return null;
  }

  /**
   * Create instanced trees
   */
  private createInstancedTrees(positions: THREE.Vector3[]): void {
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 6);
    trunkGeometry.translate(0, 0.25, 0);

    // Foliage
    const foliageGeometry = new THREE.ConeGeometry(0.4, 0.8, 6);
    foliageGeometry.translate(0, 0.8, 0);

    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });

    // Create merged geometry for efficiency
    positions.forEach(pos => {
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(pos.x + 0.5, 0, pos.z + 0.5);
      trunk.castShadow = true;
      this.buildingMeshes.add(trunk);

      const foliage = new THREE.Mesh(foliageGeometry, this.materials.get('tree'));
      foliage.position.set(pos.x + 0.5, 0, pos.z + 0.5);
      foliage.castShadow = true;
      this.buildingMeshes.add(foliage);
    });
  }

  /**
   * Create instanced flat tiles (roads, rails)
   */
  private createInstancedFlat(positions: THREE.Vector3[], material: string, height: number): void {
    const geometry = new THREE.BoxGeometry(TILE_SIZE * 0.95, height, TILE_SIZE * 0.95);
    geometry.translate(0, height / 2, 0);

    const mesh = new THREE.InstancedMesh(
      geometry,
      this.materials.get(material),
      positions.length
    );

    const matrix = new THREE.Matrix4();
    positions.forEach((pos, i) => {
      matrix.setPosition(pos.x + 0.5, 0, pos.z + 0.5);
      mesh.setMatrixAt(i, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.buildingMeshes.add(mesh);
  }

  /**
   * Create instanced power lines
   */
  private createInstancedPowerLines(positions: THREE.Vector3[]): void {
    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.8, 6);
    poleGeometry.translate(0, 0.4, 0);

    positions.forEach(pos => {
      const pole = new THREE.Mesh(poleGeometry, this.materials.get('power'));
      pole.position.set(pos.x + 0.5, 0, pos.z + 0.5);
      pole.castShadow = true;
      this.buildingMeshes.add(pole);
    });
  }

  /**
   * Create instanced fire effects
   */
  private createInstancedFires(positions: THREE.Vector3[]): void {
    const fireGeometry = new THREE.ConeGeometry(0.3, 0.6, 6);
    fireGeometry.translate(0, 0.3, 0);

    positions.forEach(pos => {
      const fire = new THREE.Mesh(fireGeometry, this.materials.get('fire'));
      fire.position.set(pos.x + 0.5, 0, pos.z + 0.5);
      // Add some randomness
      fire.scale.set(
        0.8 + Math.random() * 0.4,
        0.8 + Math.random() * 0.4,
        0.8 + Math.random() * 0.4
      );
      this.buildingMeshes.add(fire);
    });
  }

  /**
   * Create a building mesh
   */
  private createBuilding(info: {
    pos: THREE.Vector3;
    size: number;
    height: number;
    material: string;
    modelAsset?: ModelAsset;
  }): void {
    // Try to use GLTF model if available
    if (info.modelAsset) {
      const modelInstance = this.assetLoader.getModelInstance(info.modelAsset);
      if (modelInstance) {
        // Get bounding box for scaling
        const bbox = this.assetLoader.getBoundingBox(info.modelAsset.path);
        if (bbox) {
          const modelSize = new THREE.Vector3();
          bbox.getSize(modelSize);

          // Scale model to fit zone size
          const targetSize = (info.size - 0.2) * TILE_SIZE;
          const maxDim = Math.max(modelSize.x, modelSize.z);
          const scaleFactor = maxDim > 0 ? targetSize / maxDim : 1;

          modelInstance.scale.multiplyScalar(scaleFactor);
        }

        // Position at tile center
        modelInstance.position.set(
          info.pos.x + info.size / 2,
          0,
          info.pos.z + info.size / 2
        );

        // Enable shadows for all meshes in the model
        modelInstance.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.buildingMeshes.add(modelInstance);
        return;
      }
    }

    // Fallback to procedural geometry
    const width = (info.size - 0.2) * TILE_SIZE;
    const geometry = new THREE.BoxGeometry(width, info.height, width);
    geometry.translate(0, info.height / 2, 0);

    const mesh = new THREE.Mesh(geometry, this.materials.get(info.material));
    mesh.position.set(info.pos.x + info.size / 2, 0, info.pos.z + info.size / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.buildingMeshes.add(mesh);
  }

  /**
   * Get tile position from screen coordinates
   */
  public getTileAtMouse(): { x: number; y: number } | null {
    this.raycaster.setFromCamera(this.mousePos, this.camera);

    // Create a plane at y=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(plane, intersection)) {
      const x = Math.floor(intersection.x);
      const y = Math.floor(intersection.z);

      if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
        return { x, y };
      }
    }

    return null;
  }

  /**
   * Update the scene
   */
  public update(): void {
    // Handle keyboard input
    this.handleInput();

    // Update cursor position
    this.updateCursor();

    // Check if map changed
    if (this.simulation.mapSerial !== this.lastMapSerial) {
      this.rebuildTerrain();
      this.lastMapSerial = this.simulation.mapSerial;
    }

    // Update sprites
    this.updateSprites();

    // Animate water
    if (this.waterMesh) {
      const material = this.waterMesh.material as THREE.MeshStandardMaterial;
      material.opacity = 0.7 + Math.sin(Date.now() * 0.002) * 0.1;
    }
  }

  /**
   * Update sprite meshes
   */
  private updateSprites(): void {
    // Clear old sprites
    while (this.spriteMeshes.children.length > 0) {
      const child = this.spriteMeshes.children[0];
      this.spriteMeshes.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }

    // Add current sprites
    for (const sprite of this.simulation.sprites) {
      if (sprite.frame === 0) continue;

      let color: number;
      let size: number;
      let height: number;

      switch (sprite.type) {
        case 1: // Train
          color = 0x8B4513;
          size = 0.8;
          height = 0.3;
          break;
        case 2: // Helicopter
          color = 0xFF0000;
          size = 0.5;
          height = 3;
          break;
        case 3: // Airplane
          color = 0xFFFFFF;
          size = 1.0;
          height = 5;
          break;
        case 4: // Ship
          color = 0x0000FF;
          size = 1.5;
          height = 0.2;
          break;
        case 5: // Monster
          color = 0x00FF00;
          size = 2;
          height = 1;
          break;
        case 6: // Tornado
          color = 0x808080;
          size = 1;
          height = 3;
          break;
        case 7: // Explosion
          color = 0xFF4500;
          size = 1.5;
          height = 0.5;
          break;
        case 8: // Bus
          color = 0xFFFF00;
          size = 0.6;
          height = 0.2;
          break;
        default:
          continue;
      }

      const geometry = new THREE.BoxGeometry(size, size * 0.5, size);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(
        sprite.x / 16 + 0.5,
        height,
        sprite.y / 16 + 0.5
      );

      this.spriteMeshes.add(mesh);
    }
  }

  /**
   * Render the scene
   */
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Focus camera on position
   */
  public focusOn(x: number, y: number): void {
    this.cameraTarget.set(x, 0, y);
    this.updateCamera();
  }

  /**
   * Load all 3D model assets
   * @param onProgress Optional progress callback
   */
  public async loadAssets(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    await this.assetLoader.preloadAll(onProgress);
    this.modelsLoaded = true;
    // Rebuild terrain to use loaded models
    this.rebuildTerrain();
  }

  /**
   * Check if models are loaded
   */
  public areModelsLoaded(): boolean {
    return this.modelsLoaded;
  }

  /**
   * Dispose of renderer resources
   */
  public dispose(): void {
    this.renderer.dispose();
    this.materials.forEach(m => m.dispose());
  }
}
