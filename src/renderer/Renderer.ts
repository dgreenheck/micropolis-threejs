/**
 * Three.js 3D Renderer for Micropolis
 */

import * as THREE from 'three';
import { WORLD_W, WORLD_H } from '../core/constants';
import { Tiles, getTileValue, isZoneCenter } from '../core/tiles';
import { Micropolis } from '../simulation/Micropolis';

// Tile size in 3D units
const TILE_SIZE = 1.0;

// Colors for different tile types
const COLORS = {
  DIRT: 0x8B7355,
  GRASS: 0x228B22,
  WATER: 0x1E90FF,
  TREES: 0x006400,
  ROAD: 0x404040,
  RAIL: 0x696969,
  POWER: 0xFFD700,
  RESIDENTIAL: 0x00FF00,
  COMMERCIAL: 0x0000FF,
  INDUSTRIAL: 0xFFFF00,
  FIRE: 0xFF4500,
  RUBBLE: 0x8B4513,
  POLLUTION: 0x808000,
  POWERED: 0xFFFFFF,
  UNPOWERED: 0x444444,
  SPECIAL: 0xFF00FF,
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
    this.scene.fog = new THREE.Fog(0x1a1a2e, 100, 200);

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

    // Setup
    this.setupLights();
    this.setupMaterials();
    this.setupInputHandlers();
    this.resize();

    // Initial terrain build
    this.rebuildTerrain();
  }

  /**
   * Setup lighting
   */
  private setupLights(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);

    // Hemisphere light for sky color
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.3);
    this.scene.add(hemi);
  }

  /**
   * Setup materials
   */
  private setupMaterials(): void {
    // Ground material
    this.materials.set('ground', new THREE.MeshStandardMaterial({
      color: COLORS.DIRT,
      roughness: 0.9,
      metalness: 0.0,
    }));

    // Water material
    this.materials.set('water', new THREE.MeshStandardMaterial({
      color: COLORS.WATER,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    }));

    // Tree material
    this.materials.set('tree', new THREE.MeshStandardMaterial({
      color: COLORS.TREES,
      roughness: 0.8,
      metalness: 0.0,
    }));

    // Road material
    this.materials.set('road', new THREE.MeshStandardMaterial({
      color: COLORS.ROAD,
      roughness: 0.7,
      metalness: 0.0,
    }));

    // Rail material
    this.materials.set('rail', new THREE.MeshStandardMaterial({
      color: COLORS.RAIL,
      roughness: 0.5,
      metalness: 0.3,
    }));

    // Power line material
    this.materials.set('power', new THREE.MeshStandardMaterial({
      color: COLORS.POWER,
      roughness: 0.3,
      metalness: 0.8,
      emissive: COLORS.POWER,
      emissiveIntensity: 0.2,
    }));

    // Residential material
    this.materials.set('residential', new THREE.MeshStandardMaterial({
      color: COLORS.RESIDENTIAL,
      roughness: 0.6,
      metalness: 0.1,
    }));

    // Commercial material
    this.materials.set('commercial', new THREE.MeshStandardMaterial({
      color: COLORS.COMMERCIAL,
      roughness: 0.4,
      metalness: 0.2,
    }));

    // Industrial material
    this.materials.set('industrial', new THREE.MeshStandardMaterial({
      color: COLORS.INDUSTRIAL,
      roughness: 0.5,
      metalness: 0.4,
    }));

    // Special building material
    this.materials.set('special', new THREE.MeshStandardMaterial({
      color: COLORS.SPECIAL,
      roughness: 0.5,
      metalness: 0.2,
    }));

    // Fire material
    this.materials.set('fire', new THREE.MeshStandardMaterial({
      color: COLORS.FIRE,
      emissive: COLORS.FIRE,
      emissiveIntensity: 0.8,
      roughness: 0.9,
      metalness: 0.0,
    }));

    // Rubble material
    this.materials.set('rubble', new THREE.MeshStandardMaterial({
      color: COLORS.RUBBLE,
      roughness: 0.9,
      metalness: 0.0,
    }));
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
  } | null {
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
      };
    }

    // Fire station
    if (tile === Tiles.FIRESTATION) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.FIRE,
        material: 'special',
      };
    }

    // Police station
    if (tile === Tiles.POLICESTATION) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.POLICE,
        material: 'special',
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
      };
    }

    // Church
    if (tile === Tiles.CHURCH || (tile >= Tiles.CHURCH1 && tile <= Tiles.CHURCH7)) {
      return {
        pos: new THREE.Vector3(x, 0, y),
        size: 3,
        height: BUILDING_HEIGHTS.CHURCH,
        material: 'special',
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
  }): void {
    const width = (info.size - 0.2) * TILE_SIZE;
    const geometry = new THREE.BoxGeometry(width, info.height, width);
    geometry.translate(0, info.height / 2, 0);

    const mesh = new THREE.Mesh(geometry, this.materials.get(info.material));
    mesh.position.set(info.pos.x + 0.5, 0, info.pos.z + 0.5);
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
   * Dispose of renderer resources
   */
  public dispose(): void {
    this.renderer.dispose();
    this.materials.forEach(m => m.dispose());
  }
}
