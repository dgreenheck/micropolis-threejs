/**
 * Game UI Controller
 * Handles the HTML UI elements and user interaction
 */

import { Micropolis } from '../simulation/Micropolis';
import { Renderer } from '../renderer/Renderer';
import { EditingTool, SimSpeed } from '../core/types';
import { WORLD_W, WORLD_H } from '../core/constants';
import { getTileValue } from '../core/tiles';

export class GameUI {
  private simulation: Micropolis;
  private renderer: Renderer;
  private currentTool: EditingTool = EditingTool.BULLDOZER;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  // Reserved for toast notifications
  private _messageQueue: Array<{ text: string; time: number }> = [];

  // Tool button mapping
  private toolMapping: Record<string, EditingTool> = {
    'residential': EditingTool.RESIDENTIAL,
    'commercial': EditingTool.COMMERCIAL,
    'industrial': EditingTool.INDUSTRIAL,
    'road': EditingTool.ROAD,
    'rail': EditingTool.RAILROAD,
    'wire': EditingTool.WIRE,
    'police': EditingTool.POLICESTATION,
    'fire': EditingTool.FIRESTATION,
    'stadium': EditingTool.STADIUM,
    'seaport': EditingTool.SEAPORT,
    'airport': EditingTool.AIRPORT,
    'coal': EditingTool.COALPOWER,
    'nuclear': EditingTool.NUCLEARPOWER,
    'park': EditingTool.PARK,
    'bulldozer': EditingTool.BULLDOZER,
    'query': EditingTool.QUERY,
  };

  constructor(simulation: Micropolis, renderer: Renderer) {
    this.simulation = simulation;
    this.renderer = renderer;

    // Get minimap canvas
    this.minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.minimapCanvas.width = 240;
    this.minimapCanvas.height = 200;

    // Setup callbacks
    this.simulation.onMessage = this.onMessage.bind(this);
    this.simulation.onUpdateUI = this.updateUI.bind(this);

    // Setup UI handlers
    this.setupToolbarHandlers();
    this.setupToolHandlers();
    this.setupCanvasHandlers();

    // Initial UI update
    this.updateUI();
  }

  /**
   * Setup toolbar button handlers
   */
  private setupToolbarHandlers(): void {
    // New city
    document.getElementById('btn-new')?.addEventListener('click', () => {
      if (confirm('Start a new city? All progress will be lost.')) {
        this.simulation.newGame();
        this.renderer.focusOn(WORLD_W / 2, WORLD_H / 2);
        this.updateUI();
      }
    });

    // Speed buttons
    document.getElementById('btn-pause')?.addEventListener('click', () => {
      this.simulation.setSpeed(SimSpeed.PAUSED);
      this.updateSpeedButtons();
    });

    document.getElementById('btn-slow')?.addEventListener('click', () => {
      this.simulation.setSpeed(SimSpeed.SLOW);
      this.updateSpeedButtons();
    });

    document.getElementById('btn-medium')?.addEventListener('click', () => {
      this.simulation.setSpeed(SimSpeed.MEDIUM);
      this.updateSpeedButtons();
    });

    document.getElementById('btn-fast')?.addEventListener('click', () => {
      this.simulation.setSpeed(SimSpeed.FAST);
      this.updateSpeedButtons();
    });

    // Budget
    document.getElementById('btn-budget')?.addEventListener('click', () => {
      this.showBudgetDialog();
    });

    // Disasters
    document.getElementById('btn-disasters')?.addEventListener('click', () => {
      this.showDisastersMenu();
    });
  }

  /**
   * Setup tool button handlers
   */
  private setupToolHandlers(): void {
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const toolName = btn.getAttribute('data-tool');
        if (toolName && toolName in this.toolMapping) {
          this.setTool(this.toolMapping[toolName]);
          this.updateToolButtons();
        }
      });
    });
  }

  /**
   * Setup canvas click handler for tool usage
   */
  private setupCanvasHandlers(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    let isMouseDown = false;
    let lastTileX = -1;
    let lastTileY = -1;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        isMouseDown = true;
        this.handleToolClick();
      }
    });

    canvas.addEventListener('mousemove', () => {
      if (isMouseDown) {
        const tile = this.renderer.getTileAtMouse();
        if (tile && (tile.x !== lastTileX || tile.y !== lastTileY)) {
          lastTileX = tile.x;
          lastTileY = tile.y;
          this.handleToolClick();
        }
      }
    });

    canvas.addEventListener('mouseup', () => {
      isMouseDown = false;
      lastTileX = -1;
      lastTileY = -1;
    });

    canvas.addEventListener('mouseleave', () => {
      isMouseDown = false;
    });

    // Minimap click
    this.minimapCanvas.addEventListener('click', (e) => {
      const rect = this.minimapCanvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / rect.width * WORLD_W);
      const y = Math.floor((e.clientY - rect.top) / rect.height * WORLD_H);
      this.renderer.focusOn(x, y);
    });
  }

  /**
   * Handle tool click at current mouse position
   */
  private handleToolClick(): void {
    const tile = this.renderer.getTileAtMouse();
    if (!tile) return;

    if (this.currentTool === EditingTool.QUERY) {
      this.showTileInfo(tile.x, tile.y);
      return;
    }

    const result = this.simulation.doTool(this.currentTool, tile.x, tile.y);

    if (result === -2) { // NO_MONEY
      this.showMessage('Insufficient funds!');
    } else if (result === -1) { // NEED_BULLDOZE
      this.showMessage('Must bulldoze first!');
    }

    this.updateUI();
  }

  /**
   * Set current tool
   */
  public setTool(tool: EditingTool): void {
    this.currentTool = tool;
    this.updateToolButtons();

    // Update info panel with tool info
    const toolNames: Record<number, string> = {
      [EditingTool.RESIDENTIAL]: 'Residential Zone ($100)',
      [EditingTool.COMMERCIAL]: 'Commercial Zone ($100)',
      [EditingTool.INDUSTRIAL]: 'Industrial Zone ($100)',
      [EditingTool.ROAD]: 'Road ($10)',
      [EditingTool.RAILROAD]: 'Railroad ($20)',
      [EditingTool.WIRE]: 'Power Line ($5)',
      [EditingTool.POLICESTATION]: 'Police Station ($500)',
      [EditingTool.FIRESTATION]: 'Fire Station ($500)',
      [EditingTool.STADIUM]: 'Stadium ($5,000)',
      [EditingTool.SEAPORT]: 'Seaport ($3,000)',
      [EditingTool.AIRPORT]: 'Airport ($10,000)',
      [EditingTool.COALPOWER]: 'Coal Power Plant ($3,000)',
      [EditingTool.NUCLEARPOWER]: 'Nuclear Power Plant ($5,000)',
      [EditingTool.PARK]: 'Park ($10)',
      [EditingTool.BULLDOZER]: 'Bulldozer ($1)',
      [EditingTool.QUERY]: 'Query (Free)',
    };

    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      infoPanel.innerHTML = `<strong>Tool:</strong> ${toolNames[tool] || 'Unknown'}`;
    }
  }

  /**
   * Update tool button states
   */
  private updateToolButtons(): void {
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
      const toolName = btn.getAttribute('data-tool');
      if (toolName && this.toolMapping[toolName] === this.currentTool) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Update speed button states
   */
  private updateSpeedButtons(): void {
    const speeds = ['pause', 'slow', 'medium', 'fast'];
    const currentSpeed = this.simulation.simSpeed;

    speeds.forEach((speed, index) => {
      const btn = document.getElementById(`btn-${speed}`);
      if (btn) {
        if (index === currentSpeed) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  /**
   * Show tile info
   */
  private showTileInfo(x: number, y: number): void {
    const tile = this.simulation.map.getTile(x, y);
    const tileValue = getTileValue(tile);

    const pollution = this.simulation.pollutionDensityMap.worldGet(x, y);
    const crime = this.simulation.crimeRateMap.worldGet(x, y);
    const landValue = this.simulation.landValueMap.worldGet(x, y);
    const traffic = this.simulation.trafficDensityMap.worldGet(x, y);
    const population = this.simulation.populationDensityMap.worldGet(x, y);

    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      infoPanel.innerHTML = `
        <strong>Position:</strong> (${x}, ${y})<br>
        <strong>Tile:</strong> ${tileValue}<br>
        <strong>Population:</strong> ${population}<br>
        <strong>Land Value:</strong> ${landValue}<br>
        <strong>Crime:</strong> ${crime}<br>
        <strong>Pollution:</strong> ${pollution}<br>
        <strong>Traffic:</strong> ${traffic}
      `;
    }
  }

  /**
   * Update all UI elements
   */
  public updateUI(): void {
    // Update status bar
    document.getElementById('status-date')!.textContent = this.simulation.getDateString();
    document.getElementById('status-funds')!.textContent = `$${this.simulation.totalFunds.toLocaleString()}`;
    document.getElementById('status-population')!.textContent = this.simulation.getPopulation().toLocaleString();

    const demands = this.simulation.getDemands();
    document.getElementById('status-res')!.textContent = this.formatDemand(demands.res);
    document.getElementById('status-com')!.textContent = this.formatDemand(demands.com);
    document.getElementById('status-ind')!.textContent = this.formatDemand(demands.ind);
    document.getElementById('status-score')!.textContent = this.simulation.cityScore.toString();

    // Update minimap
    this.updateMinimap();
  }

  /**
   * Format demand value
   */
  private formatDemand(value: number): string {
    if (value > 0.1) return '+';
    if (value < -0.1) return '-';
    return '=';
  }

  /**
   * Update minimap
   */
  private updateMinimap(): void {
    const ctx = this.minimapCtx;
    const scaleX = this.minimapCanvas.width / WORLD_W;
    const scaleY = this.minimapCanvas.height / WORLD_H;

    // Clear
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

    // Draw tiles
    for (let x = 0; x < WORLD_W; x++) {
      for (let y = 0; y < WORLD_H; y++) {
        const tile = getTileValue(this.simulation.map.getTile(x, y));
        let color: string;

        if (tile === 0) {
          color = '#8B7355'; // Dirt
        } else if (tile >= 2 && tile <= 20) {
          color = '#1E90FF'; // Water
        } else if (tile >= 21 && tile <= 43) {
          color = '#006400'; // Trees
        } else if (tile >= 64 && tile <= 206) {
          color = '#404040'; // Roads
        } else if (tile >= 208 && tile <= 222) {
          color = '#FFD700'; // Power
        } else if (tile >= 224 && tile <= 238) {
          color = '#696969'; // Rail
        } else if (tile >= 240 && tile < 423) {
          color = '#00FF00'; // Residential
        } else if (tile >= 423 && tile < 612) {
          color = '#0000FF'; // Commercial
        } else if (tile >= 612 && tile < 693) {
          color = '#FFFF00'; // Industrial
        } else if (tile >= 56 && tile <= 63) {
          color = '#FF4500'; // Fire
        } else {
          color = '#FF00FF'; // Special
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(x * scaleX),
          Math.floor(y * scaleY),
          Math.ceil(scaleX),
          Math.ceil(scaleY)
        );
      }
    }
  }

  /**
   * Show a message to the user
   */
  private showMessage(text: string): void {
    console.log(`[Message] ${text}`);
    // Could add a toast notification system here
  }

  /**
   * Message callback from simulation
   */
  private onMessage(message: string, x?: number, y?: number, important?: boolean): void {
    this.showMessage(message);

    if (important && x !== undefined && y !== undefined) {
      // Auto-goto for important messages
      if (this.simulation.autoGoto) {
        this.renderer.focusOn(x, y);
      }
    }
  }

  /**
   * Show budget dialog
   */
  private showBudgetDialog(): void {
    const budget = this.simulation.getBudget();

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #16213e;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #0f3460;
      color: #eee;
      z-index: 1000;
      min-width: 300px;
    `;

    dialog.innerHTML = `
      <h2 style="margin-top: 0;">City Budget</h2>
      <p><strong>Funds:</strong> $${budget.totalFunds.toLocaleString()}</p>
      <p><strong>Tax Income:</strong> $${budget.taxFund.toLocaleString()}</p>
      <hr style="border-color: #0f3460;">
      <p><strong>Road Maintenance:</strong> $${budget.roadSpend.toLocaleString()} / $${budget.roadFund.toLocaleString()}</p>
      <p><strong>Police:</strong> $${budget.policeSpend.toLocaleString()} / $${budget.policeFund.toLocaleString()}</p>
      <p><strong>Fire Dept:</strong> $${budget.fireSpend.toLocaleString()} / $${budget.fireFund.toLocaleString()}</p>
      <hr style="border-color: #0f3460;">
      <label>Tax Rate: <input type="range" id="tax-slider" min="0" max="20" value="${budget.cityTax}">
        <span id="tax-value">${budget.cityTax}%</span>
      </label>
      <br><br>
      <button id="budget-close" style="padding: 8px 16px; background: #e94560; border: none; color: white; cursor: pointer; border-radius: 4px;">Close</button>
    `;

    document.body.appendChild(dialog);

    // Tax slider handler
    const slider = document.getElementById('tax-slider') as HTMLInputElement;
    const taxValue = document.getElementById('tax-value')!;
    slider.addEventListener('input', () => {
      taxValue.textContent = `${slider.value}%`;
      this.simulation.setCityTax(parseInt(slider.value));
    });

    // Close button
    document.getElementById('budget-close')!.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  /**
   * Show disasters menu
   */
  private showDisastersMenu(): void {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #16213e;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #0f3460;
      color: #eee;
      z-index: 1000;
      min-width: 200px;
    `;

    dialog.innerHTML = `
      <h2 style="margin-top: 0;">Disasters</h2>
      <button class="disaster-btn" data-disaster="fire">Fire</button>
      <button class="disaster-btn" data-disaster="flood">Flood</button>
      <button class="disaster-btn" data-disaster="tornado">Tornado</button>
      <button class="disaster-btn" data-disaster="earthquake">Earthquake</button>
      <button class="disaster-btn" data-disaster="monster">Monster</button>
      <br><br>
      <label><input type="checkbox" id="disasters-enabled" ${this.simulation.enableDisasters ? 'checked' : ''}> Enable Random Disasters</label>
      <br><br>
      <button id="disasters-close" style="padding: 8px 16px; background: #e94560; border: none; color: white; cursor: pointer; border-radius: 4px;">Close</button>
    `;

    // Style disaster buttons
    const style = document.createElement('style');
    style.textContent = `
      .disaster-btn {
        display: block;
        width: 100%;
        padding: 8px;
        margin: 5px 0;
        background: #0f3460;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 4px;
      }
      .disaster-btn:hover {
        background: #e94560;
      }
    `;
    dialog.appendChild(style);

    document.body.appendChild(dialog);

    // Disaster button handlers
    const disasterButtons = dialog.querySelectorAll('.disaster-btn');
    disasterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const disaster = btn.getAttribute('data-disaster');
        switch (disaster) {
          case 'fire':
            this.simulation.setFire();
            break;
          case 'flood':
            this.simulation.makeFlood();
            break;
          case 'tornado':
            this.simulation.makeTornado();
            break;
          case 'earthquake':
            this.simulation.makeEarthquake();
            break;
          case 'monster':
            this.simulation.makeMonster();
            break;
        }
        document.body.removeChild(dialog);
      });
    });

    // Enable checkbox
    const checkbox = document.getElementById('disasters-enabled') as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      this.simulation.enableDisasters = checkbox.checked;
    });

    // Close button
    document.getElementById('disasters-close')!.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }
}
