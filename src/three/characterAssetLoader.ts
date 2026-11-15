import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { PieceColor, PieceType } from '../types/chess';

export type CharacterModelKey = `${PieceColor}_${PieceType}`;

export interface ExternalModelRegistry {
  [key: string]: string | undefined;
}

/**
 * Optional GLTF/GLB model URL registry.
 * Populate with URLs (e.g. { w_k: '/models/white_king.glb' }) to override procedural characters
 * with external GLB human models without modifying the chess engine or scene controller.
 */
export const EXTERNAL_CHARACTER_MODELS: ExternalModelRegistry = {};

export class CharacterGLTFProvider {
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<GLTF | null>>();

  public hasModel(color: PieceColor, type: PieceType): boolean {
    const key: CharacterModelKey = `${color}_${type}`;
    return Boolean(EXTERNAL_CHARACTER_MODELS[key]);
  }

  public loadCharacterModel(color: PieceColor, type: PieceType): Promise<GLTF | null> {
    const key: CharacterModelKey = `${color}_${type}`;
    const rawUrl = EXTERNAL_CHARACTER_MODELS[key];
    if (!rawUrl) return Promise.resolve(null);
    const url = rawUrl.startsWith('/') ? `.${rawUrl}` : rawUrl;

    if (!this.cache.has(url)) {
      const promise = new Promise<GLTF | null>((resolve) => {
        this.loader.load(
          url,
          (gltf) => {
            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            // Normalize scale to ~1.45 units tall and ground at y=0
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const targetHeight = type === 'k' ? 1.75 : type === 'q' ? 1.65 : type === 'p' ? 1.25 : 1.5;
            if (size.y > 0.001) {
              const s = targetHeight / size.y;
              gltf.scene.scale.setScalar(s);
            }
            const scaledBox = new THREE.Box3().setFromObject(gltf.scene);
            gltf.scene.position.y -= scaledBox.min.y;
            resolve(gltf);
          },
          undefined,
          () => resolve(null)
        );
      });
      this.cache.set(url, promise);
    }

    return this.cache.get(url)!;
  }

  public dispose() {
    this.cache.clear();
  }
}
