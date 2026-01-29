/**
 * Asset Loader - Loads and caches GLTF models
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ALL_MODEL_PATHS, ModelAsset } from './AssetManifest';

/**
 * Cached model data
 */
interface CachedModel {
  scene: THREE.Group;
  boundingBox: THREE.Box3;
}

/**
 * AssetLoader class - handles loading and caching of 3D models
 */
export class AssetLoader {
  private loader: GLTFLoader;
  private modelCache: Map<string, CachedModel> = new Map();
  private loadingPromises: Map<string, Promise<CachedModel | null>> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Preload all models
   * @param onProgress Optional progress callback (loaded, total)
   */
  async preloadAll(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const total = ALL_MODEL_PATHS.length;
    let loaded = 0;

    const promises = ALL_MODEL_PATHS.map(async (path) => {
      await this.loadModel(path);
      loaded++;
      if (onProgress) {
        onProgress(loaded, total);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Load a single model
   * @param path Path to the model file
   * @returns The cached model data, or null if loading failed
   */
  async loadModel(path: string): Promise<CachedModel | null> {
    // Check if already cached
    if (this.modelCache.has(path)) {
      return this.modelCache.get(path)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!;
    }

    // Start loading
    const loadPromise = this.doLoadModel(path);
    this.loadingPromises.set(path, loadPromise);

    const result = await loadPromise;
    this.loadingPromises.delete(path);

    return result;
  }

  /**
   * Internal model loading
   */
  private async doLoadModel(path: string): Promise<CachedModel | null> {
    try {
      const gltf = await this.loadGLTF(path);

      // Calculate bounding box
      const boundingBox = new THREE.Box3().setFromObject(gltf.scene);

      // Store in cache
      const cached: CachedModel = {
        scene: gltf.scene,
        boundingBox,
      };

      this.modelCache.set(path, cached);
      return cached;
    } catch (error) {
      console.warn(`Failed to load model: ${path}`, error);
      return null;
    }
  }

  /**
   * Load GLTF file using promises
   */
  private loadGLTF(path: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });
  }

  /**
   * Get a clone of a cached model for instancing
   * @param asset The model asset definition
   * @returns A new clone of the model, or null if not loaded
   */
  getModelInstance(asset: ModelAsset): THREE.Group | null {
    const cached = this.modelCache.get(asset.path);
    if (!cached) {
      return null;
    }

    // Clone the scene
    const clone = cached.scene.clone(true);

    // Apply scale
    if (asset.scale !== undefined) {
      clone.scale.setScalar(asset.scale);
    }

    // Apply rotation
    if (asset.rotation !== undefined) {
      clone.rotation.y = asset.rotation;
    }

    return clone;
  }

  /**
   * Get the bounding box of a cached model
   * @param path Path to the model
   * @returns The bounding box, or null if not loaded
   */
  getBoundingBox(path: string): THREE.Box3 | null {
    const cached = this.modelCache.get(path);
    return cached ? cached.boundingBox.clone() : null;
  }

  /**
   * Check if a model is loaded
   * @param path Path to the model
   */
  isLoaded(path: string): boolean {
    return this.modelCache.has(path);
  }

  /**
   * Get the number of loaded models
   */
  getLoadedCount(): number {
    return this.modelCache.size;
  }

  /**
   * Clear all cached models
   */
  clear(): void {
    // Dispose of geometries and materials
    this.modelCache.forEach((cached) => {
      cached.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    });

    this.modelCache.clear();
  }
}

// Singleton instance
let assetLoaderInstance: AssetLoader | null = null;

/**
 * Get the global asset loader instance
 */
export function getAssetLoader(): AssetLoader {
  if (!assetLoaderInstance) {
    assetLoaderInstance = new AssetLoader();
  }
  return assetLoaderInstance;
}
