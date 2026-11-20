import {
  Material,
  Texture,
  type Object3D,
  type BufferGeometry,
  type WebGLRenderTarget,
} from 'three';

/** Shared geometries/materials/textures are released exactly once per scene. */
export function disposeObjectTree(root: Object3D) {
  const seen = new Set<object>();
  const release = (value: { dispose(): void }) => {
    if (!seen.has(value)) {
      seen.add(value);
      value.dispose();
    }
  };
  const texture = (value: unknown) => {
    if (value instanceof Texture) release(value);
    else if (Array.isArray(value)) value.forEach(texture);
  };
  const material = (value: Material) => {
    Object.values(value).forEach(texture);
    if ('uniforms' in value) {
      Object.values(value.uniforms as Record<string, { value: unknown }>).forEach((u) =>
        texture(u.value),
      );
    }
    release(value);
  };
  root.traverse((object) => {
    const mesh = object as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
      isInstancedMesh?: boolean;
      dispose?: () => void;
      shadow?: { map: WebGLRenderTarget | null; mapPass: WebGLRenderTarget | null };
    };
    if (mesh.isInstancedMesh) mesh.dispose?.();
    if (mesh.geometry) release(mesh.geometry);
    if (mesh.material)
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material);
    if (mesh.shadow?.map) release(mesh.shadow.map);
    if (mesh.shadow?.mapPass) release(mesh.shadow.mapPass);
  });
  const scene = root as Object3D & { background?: unknown; environment?: unknown };
  texture(scene.background);
  texture(scene.environment);
  root.clear();
}
