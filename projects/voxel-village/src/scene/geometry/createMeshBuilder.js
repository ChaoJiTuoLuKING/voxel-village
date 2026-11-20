import * as T from 'three';

export function createMeshBuilder(scene) {
  const geo = new T.BoxGeometry(1, 1, 1);
  const FACES = [
    {
      n: [1, 0, 0],
      v: [
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, 0.5, 0.5],
        [0.5, -0.5, 0.5],
      ],
      u: 1,
      vv: 2,
    },
    {
      n: [-1, 0, 0],
      v: [
        [-0.5, -0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, 0.5, -0.5],
        [-0.5, -0.5, -0.5],
      ],
      u: 1,
      vv: 2,
    },
    {
      n: [0, 1, 0],
      v: [
        [-0.5, 0.5, -0.5],
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, -0.5],
      ],
      u: 0,
      vv: 2,
    },
    {
      n: [0, -1, 0],
      v: [
        [-0.5, -0.5, 0.5],
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
      ],
      u: 0,
      vv: 2,
    },
    {
      n: [0, 0, 1],
      v: [
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, -0.5, 0.5],
      ],
      u: 0,
      vv: 1,
    },
    {
      n: [0, 0, -1],
      v: [
        [-0.5, -0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, -0.5, -0.5],
      ],
      u: 0,
      vv: 1,
    },
  ];
  function builder() {
    return { p: [], n: [], c: [], ix: [] };
  }
  const colorCache = new Map();
  function linear(c) {
    if (!colorCache.has(c)) colorCache.set(c, new T.Color(c));
    return colorCache.get(c);
  }
  function quad(b, verts, n, c, ao = [1, 1, 1, 1]) {
    const start = b.p.length / 3,
      C = linear(c);
    for (let k = 0; k < 4; k++) {
      b.p.push(...verts[k]);
      b.n.push(...n);
      b.c.push(C.r * ao[k], C.g * ao[k], C.b * ao[k]);
    }
    b.ix.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  function finish(b, mat) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(b.c, 3));
    g.setIndex(b.ix);
    g.computeBoundingSphere();
    const m = new T.Mesh(g, mat || new T.MeshLambertMaterial({ vertexColors: true }));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    b.p.length = b.n.length = b.c.length = b.ix.length = 0;
    return m;
  }
  function instDetails(list, mat) {
    const mesh = new T.InstancedMesh(geo, mat, list.length),
      matrix = new T.Matrix4();
    list.forEach((e, i) => {
      matrix.makeScale(e[3], e[4], e[5]);
      matrix.setPosition(e[0], e[1], e[2]);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, linear(e[6]));
    });
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  return { geo, FACES, builder, quad, finish, linear, instDetails };
}
