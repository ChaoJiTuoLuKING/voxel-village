import { expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Scene,
  ShaderMaterial,
  Texture,
} from 'three';
import { disposeObjectTree } from './dispose';

it('releases shared meshes, shader textures and instance buffers once', () => {
  const scene = new Scene(),
    geometry = new BoxGeometry(),
    texture = new Texture();
  const material = new MeshBasicMaterial({ map: texture });
  const shader = new ShaderMaterial({ uniforms: { texture: { value: texture } } });
  const instances = new InstancedMesh(geometry, material, 2);
  scene.add(new Mesh(geometry, material), new Mesh(geometry, shader), instances);
  const resources = [geometry, texture, material, shader, instances].map((resource) =>
    vi.spyOn(resource, 'dispose'),
  );
  disposeObjectTree(scene);
  disposeObjectTree(scene);
  for (const resource of resources) expect(resource).toHaveBeenCalledOnce();
  expect(scene.children).toHaveLength(0);
});
