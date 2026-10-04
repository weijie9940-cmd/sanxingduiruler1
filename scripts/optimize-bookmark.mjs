/**
 * Build optimized copies of public/bookmark.glb.
 * Run with: npm install @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp && node scripts/optimize-bookmark.mjs
 * Those packages are not runtime dependencies.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { statSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const SRC = "/workspace/public/bookmark.glb";

const LEVELS = {
  full: {
    out: "/workspace/public/bookmark.full.glb",
    ratio: 0.34,
    error: 0.012,
    minVerts: 96,
    resize: [1024, 3200],
    quality: 86,
    nearLossless: true,
  },
  preview: {
    out: "/workspace/public/bookmark.preview.glb",
    ratio: 0.12,
    error: 0.028,
    minVerts: 48,
    resize: [512, 1600],
    quality: 68,
    nearLossless: false,
  },
};

function materialHasTexture(material) {
  if (!material) return false;
  return Boolean(
    material.getBaseColorTexture() ||
      material.getEmissiveTexture() ||
      material.getNormalTexture() ||
      material.getOcclusionTexture() ||
      material.getMetallicRoughnessTexture(),
  );
}

function countLongStrands(indices, vertexCount) {
  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  const find = (x) => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  };
  const verts = new Int32Array(vertexCount);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
    const rc = find(c);
    const ru = find(a);
    if (ru !== rc) parent[rc] = ru;
    verts[find(a)] += 1;
  }
  const tally = new Map();
  for (let i = 0; i < indices.length; i++) {
    const root = find(indices[i]);
    tally.set(root, (tally.get(root) || 0) + 1);
  }
  let long = 0;
  for (const count of tally.values()) if (count >= 60) long += 1;
  return { components: tally.size, long };
}

function groupsOf(indices, vertexCount) {
  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  const find = (x) => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  };
  for (let i = 0; i < indices.length; i += 3) {
    const ra = find(indices[i]);
    const rb = find(indices[i + 1]);
    if (ra !== rb) parent[rb] = ra;
    const rc = find(indices[i + 2]);
    const ru = find(indices[i]);
    if (ru !== rc) parent[rc] = ru;
  }
  const groups = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const root = find(indices[i]);
    let list = groups.get(root);
    if (!list) {
      list = [];
      groups.set(root, list);
    }
    list.push(indices[i], indices[i + 1], indices[i + 2]);
  }
  return [...groups.values()];
}

function simplifyStrand(indexList, positions, normals, level) {
  const used = new Map();
  const localIdx = [];
  const localPos = [];
  const localNrm = [];
  for (const vi of indexList) {
    let id = used.get(vi);
    if (id === undefined) {
      id = used.size;
      used.set(vi, id);
      localPos.push(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]);
      if (normals) localNrm.push(normals[vi * 3], normals[vi * 3 + 1], normals[vi * 3 + 2]);
    }
    localIdx.push(id);
  }
  const srcIdx = Uint32Array.from(localIdx);
  const srcPos = Float32Array.from(localPos);
  const srcNrm = normals ? Float32Array.from(localNrm) : null;
  if (used.size < level.minVerts) {
    return { indices: srcIdx, positions: srcPos, normals: srcNrm };
  }
  const target = Math.max(48, Math.round((srcIdx.length * level.ratio) / 3) * 3);
  if (target >= srcIdx.length) {
    return { indices: srcIdx, positions: srcPos, normals: srcNrm };
  }
  let simplified;
  let error = 0;
  try {
    const result = MeshoptSimplifier.simplify(srcIdx, srcPos, 3, target, level.error, ["LockBorder"]);
    simplified = result[0];
    error = result[1];
  } catch {
    return { indices: srcIdx, positions: srcPos, normals: srcNrm };
  }
  if (simplified.length < 12 || error > level.error * 1.05) {
    return { indices: srcIdx, positions: srcPos, normals: srcNrm };
  }
  const packed = new Uint32Array(simplified);
  const [remap, unique] = MeshoptSimplifier.compactMesh(packed);
  const missing = 4294967295;
  const newPos = new Float32Array(unique * 3);
  const newNrm = srcNrm ? new Float32Array(unique * 3) : null;
  for (let old = 0; old < remap.length; old++) {
    const next = remap[old];
    if (next === missing) continue;
    newPos[next * 3] = srcPos[old * 3];
    newPos[next * 3 + 1] = srcPos[old * 3 + 1];
    newPos[next * 3 + 2] = srcPos[old * 3 + 2];
    if (newNrm && srcNrm) {
      newNrm[next * 3] = srcNrm[old * 3];
      newNrm[next * 3 + 1] = srcNrm[old * 3 + 1];
      newNrm[next * 3 + 2] = srcNrm[old * 3 + 2];
    }
  }
  return { indices: packed, positions: newPos, normals: newNrm, error };
}

function rewriteFibers(doc, prim, level) {
  const posAcc = prim.getAttribute("POSITION");
  const indexAcc = prim.getIndices();
  if (!posAcc || !indexAcc) return null;
  const positions = posAcc.getArray();
  const normals = prim.getAttribute("NORMAL")?.getArray() ?? null;
  const indices = indexAcc.getArray();
  const before = countLongStrands(indices, positions.length / 3);
  const groups = groupsOf(indices, positions.length / 3);
  const chunks = [];
  let maxError = 0;
  for (const group of groups) {
    const strand = simplifyStrand(group, positions, normals, level);
    if (strand.error) maxError = Math.max(maxError, strand.error);
    chunks.push(strand);
  }
  let vertexCount = 0;
  let indexCount = 0;
  for (const chunk of chunks) {
    vertexCount += chunk.positions.length / 3;
    indexCount += chunk.indices.length;
  }
  const newPos = new Float32Array(vertexCount * 3);
  const newNrm = normals ? new Float32Array(vertexCount * 3) : null;
  const newIdx = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  let vOf = 0;
  let iOf = 0;
  for (const chunk of chunks) {
    newPos.set(chunk.positions, vOf * 3);
    if (newNrm && chunk.normals) newNrm.set(chunk.normals, vOf * 3);
    for (let i = 0; i < chunk.indices.length; i++) newIdx[iOf + i] = chunk.indices[i] + vOf;
    vOf += chunk.positions.length / 3;
    iOf += chunk.indices.length;
  }
  const after = countLongStrands(newIdx, vertexCount);
  if (before.long > 0 && after.long < before.long - 1) {
    throw new Error(`strand count dropped ${before.long} -> ${after.long}`);
  }
  const buffer = doc.getRoot().listBuffers()[0];
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(newPos)
    .setBuffer(buffer);
  prim.setAttribute("POSITION", position);
  if (newNrm) {
    const normal = doc.createAccessor().setType("VEC3").setArray(newNrm).setBuffer(buffer);
    prim.setAttribute("NORMAL", normal);
  }
  const index = doc.createAccessor().setType("SCALAR").setArray(newIdx).setBuffer(buffer);
  prim.setIndices(index);
  prim.setAttribute("TEXCOORD_0", null);
  prim.setAttribute("TEXCOORD_1", null);
  return {
    before,
    after,
    tris: Math.round(indexCount / 3),
    verts: vertexCount,
    maxError,
  };
}

async function build(levelName) {
  const level = LEVELS[levelName];
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
  const doc = await io.read(SRC);
  const fiberMeshes = new Set();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const label = `${node.getName() || ""} ${mesh.getName() || ""}`;
    if (label.includes("Tassel_Fiber")) fiberMeshes.add(mesh);
  }
  const reports = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (!materialHasTexture(prim.getMaterial())) {
        prim.setAttribute("TEXCOORD_0", null);
        prim.setAttribute("TEXCOORD_1", null);
      }
      if (fiberMeshes.has(mesh)) {
        const report = rewriteFibers(doc, prim, level);
        if (report) reports.push({ mesh: mesh.getName(), ...report });
      }
    }
  }
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: level.resize,
      quality: level.quality,
      nearLossless: level.nearLossless,
      effort: 45,
    }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );
  await io.write(level.out, doc);
  const check = await io.read(level.out);
  const names = check
    .getRoot()
    .listNodes()
    .map((node) => node.getName());
  const textures = check.getRoot().listTextures().map((tex) => ({
    name: tex.getName(),
    mime: tex.getMimeType(),
    bytes: tex.getImage()?.byteLength ?? 0,
  }));
  let tris = 0;
  for (const mesh of check.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) tris += (prim.getIndices()?.getCount() ?? 0) / 3;
  }
  const bytes = statSync(level.out).size;
  console.log(
    JSON.stringify(
      {
        level: levelName,
        bytes,
        mb: +(bytes / (1024 * 1024)).toFixed(2),
        extensions: check.getRoot().listExtensionsUsed().map((ext) => ext.extensionName),
        nodes: names.length,
        fiberNode: names.filter((name) => name.includes("Tassel_Fiber") || name.startsWith("Ruler") || name.startsWith("Cord")),
        textures,
        tris: Math.round(tris),
        strands: reports,
      },
      null,
      2,
    ),
  );
}

const original = await readFile(SRC);
console.log("original", original.byteLength, createHash("sha256").update(original).digest("hex"));
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
await build("preview");
await build("full");
const after = await readFile(SRC);
console.log("original-after", after.byteLength, createHash("sha256").update(after).digest("hex"));
