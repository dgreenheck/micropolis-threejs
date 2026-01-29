/**
 * Micropolis - Three.js Edition
 * Main Entry Point
 *
 * A TypeScript/Three.js port of Micropolis (the open-source SimCity)
 * Original game by Will Wright, released under GPL by EA
 */

import { Micropolis } from './simulation/Micropolis';
import { Renderer } from './renderer/Renderer';
import { GameUI } from './ui/GameUI';
import { WORLD_W, WORLD_H } from './core/constants';

// Game state
let simulation: Micropolis;
let renderer: Renderer;
let ui: GameUI;
let lastTime = 0;
let accumulator = 0;
const TICK_RATE = 1000 / 30; // 30 ticks per second for simulation

/**
 * Update loading progress display
 */
function updateLoadingProgress(message: string, progress?: number): void {
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    if (progress !== undefined) {
      loadingText.textContent = `${message} (${Math.round(progress * 100)}%)`;
    } else {
      loadingText.textContent = message;
    }
  }
}

/**
 * Initialize the game
 */
async function init(): Promise<void> {
  console.log('Initializing Micropolis...');
  updateLoadingProgress('Initializing...');

  // Get the canvas
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Could not find game canvas');
  }

  // Create simulation
  updateLoadingProgress('Creating simulation...');
  simulation = new Micropolis();

  // Generate initial map
  console.log('Generating map...');
  updateLoadingProgress('Generating map...');
  simulation.newGame(Date.now());

  // Create renderer
  console.log('Creating renderer...');
  updateLoadingProgress('Creating renderer...');
  renderer = new Renderer(canvas, simulation);

  // Load 3D assets
  console.log('Loading 3D models...');
  updateLoadingProgress('Loading 3D models...', 0);
  try {
    await renderer.loadAssets((loaded, total) => {
      updateLoadingProgress('Loading 3D models...', loaded / total);
    });
    console.log('3D models loaded successfully');
  } catch (error) {
    console.warn('Failed to load some 3D models, using fallback geometry:', error);
  }

  // Create UI
  console.log('Setting up UI...');
  updateLoadingProgress('Setting up UI...');
  ui = new GameUI(simulation, renderer);

  // Focus camera on center of map
  renderer.focusOn(WORLD_W / 2, WORLD_H / 2);

  // Hide loading screen
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }

  console.log('Micropolis initialized!');

  // Start game loop
  requestAnimationFrame(gameLoop);
}

/**
 * Main game loop
 */
function gameLoop(time: number): void {
  // Calculate delta time
  const deltaTime = time - lastTime;
  lastTime = time;

  // Accumulate time for fixed timestep simulation
  accumulator += deltaTime;

  // Run simulation at fixed timestep
  while (accumulator >= TICK_RATE) {
    simulation.simFrame();
    accumulator -= TICK_RATE;
  }

  // Update renderer
  renderer.update();

  // Update UI (throttled to every few frames)
  if (simulation.censusChanged || simulation.mustUpdateFunds || simulation.evalChanged) {
    ui.updateUI();
    simulation.censusChanged = false;
    simulation.mustUpdateFunds = false;
    simulation.evalChanged = false;
  }

  // Render
  renderer.render();

  // Continue loop
  requestAnimationFrame(gameLoop);
}

/**
 * Handle errors
 */
function handleError(error: Error): void {
  console.error('Error:', error);

  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loading-text');

  if (loading && loadingText) {
    loadingText.textContent = `Error: ${error.message}`;
    loadingText.style.color = '#e94560';
    loading.classList.remove('hidden');
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch(handleError);
  });
} else {
  init().catch(handleError);
}

// Export for debugging
(window as unknown as { micropolis: Micropolis }).micropolis = simulation!;
