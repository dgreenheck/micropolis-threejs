# Micropolis - Three.js Edition

A TypeScript/Three.js port of [Micropolis](https://github.com/SimHacker/micropolis), the open-source version of the original SimCity from 1989.

## Features

- **Full City Simulation**: Complete SimCity simulation engine ported to TypeScript
  - Residential, Commercial, and Industrial zones
  - Power grid simulation
  - Traffic simulation
  - Crime and pollution modeling
  - Population dynamics
  - City evaluation and scoring

- **3D Rendering**: Real-time 3D visualization using Three.js
  - Terrain with water, trees, and roads
  - 3D buildings that grow with zone development
  - Animated sprites for vehicles and disasters
  - Dynamic lighting and shadows

- **Interactive Controls**:
  - Orbit camera with pan, zoom, and rotate
  - All original building tools (zones, roads, power, etc.)
  - Budget management
  - Disaster triggers (fire, flood, tornado, earthquake, monster)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/micropolis-threejs.git
cd micropolis-threejs

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will open at http://localhost:3000

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Controls

### Camera
- **Right-click + drag**: Rotate camera
- **Shift + Right-click + drag**: Pan camera
- **Mouse wheel**: Zoom in/out
- **WASD / Arrow keys**: Move camera

### Tools
Click the tool buttons in the sidebar to select a tool, then click on the map to use it.

| Tool | Description | Cost |
|------|-------------|------|
| Residential | Place residential zones (3x3) | $100 |
| Commercial | Place commercial zones (3x3) | $100 |
| Industrial | Place industrial zones (3x3) | $100 |
| Road | Build roads | $10 |
| Rail | Build rail lines | $20 |
| Power | Build power lines | $5 |
| Police | Build police station (3x3) | $500 |
| Fire | Build fire station (3x3) | $500 |
| Stadium | Build stadium (4x4) | $5,000 |
| Coal | Build coal power plant (4x4) | $3,000 |
| Nuclear | Build nuclear power plant (4x4) | $5,000 |
| Seaport | Build seaport (4x4) | $3,000 |
| Airport | Build airport (6x6) | $10,000 |
| Park | Build park | $10 |
| Bulldozer | Clear tiles | $1 |
| Query | View tile information | Free |

### Speed Controls
- **Pause**: Stop simulation
- **Slow**: Slow simulation speed
- **Medium**: Normal simulation speed
- **Fast**: Fast simulation speed

## Project Structure

```
micropolis-threejs/
├── src/
│   ├── core/           # Core types, constants, and tile definitions
│   │   ├── constants.ts
│   │   ├── tiles.ts
│   │   ├── types.ts
│   │   └── map.ts
│   ├── simulation/     # City simulation engine
│   │   └── Micropolis.ts
│   ├── renderer/       # Three.js 3D renderer
│   │   └── Renderer.ts
│   ├── ui/             # User interface
│   │   └── GameUI.ts
│   ├── utils/          # Utility functions
│   │   └── random.ts
│   └── main.ts         # Entry point
├── index.html
├── package.json
└── tsconfig.json
```

## Original 3D Models

The original Micropolis repository includes 3D building models in Blender format. To use them:

1. Download the models from: https://github.com/SimHacker/micropolis/tree/master/micropolis-graphics/buildings_3d
2. Export each model to GLTF format using Blender
3. Place the exported models in `public/models/`

## Simulation Details

The simulation follows the original SimCity logic:

### Zone Development
- Zones require road access to develop
- Zones require power to function at full capacity
- Population density affects zone growth
- Land value, crime, and pollution affect desirability

### Power Grid
- Power plants generate electricity
- Power is transmitted through power lines and conductive buildings
- Zones without power have reduced productivity

### Economy
- Tax rate affects city income and resident satisfaction
- Maintenance costs for roads, police, and fire departments
- City score based on various factors

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE.txt](LICENSE.txt) file for details.

The original Micropolis was released under GPL by Electronic Arts. This port maintains that license.

## Credits

- Original SimCity by Will Wright
- Original Micropolis code by Electronic Arts
- Three.js port implementation

## Related Projects

- [Micropolis](https://github.com/SimHacker/micropolis) - Original open-source release
- [micropolisJS](https://github.com/graememcc/micropolisJS) - JavaScript port
