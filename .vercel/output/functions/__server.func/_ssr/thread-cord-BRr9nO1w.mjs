import { a as BufferGeometry, c as Mesh, l as Vector3, o as Float32BufferAttribute, s as MathUtils } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/thread-cord-BRr9nO1w.js
var UP = new Vector3(0, 1, 0);
var RIGHT = new Vector3(1, 0, 0);
function findMesh(root, prefix) {
	let found = null;
	root.traverse((child) => {
		const mesh = child;
		if (!found && mesh.isMesh && mesh.name.startsWith(prefix)) found = mesh;
	});
	return found;
}
function worldPoints(mesh) {
	const position = mesh.geometry.getAttribute("position");
	const points = [];
	for (let i = 0; i < position.count; i += 1) points.push(mesh.localToWorld(new Vector3().fromBufferAttribute(position, i)));
	return points;
}
function detectHole(mesh) {
	const points = worldPoints(mesh);
	if (points.length < 40) return null;
	let yMin = Infinity;
	let yMax = -Infinity;
	let xMin = Infinity;
	let xMax = -Infinity;
	let zMin = Infinity;
	let zMax = -Infinity;
	for (const point of points) {
		yMin = Math.min(yMin, point.y);
		yMax = Math.max(yMax, point.y);
		xMin = Math.min(xMin, point.x);
		xMax = Math.max(xMax, point.x);
		zMin = Math.min(zMin, point.z);
		zMax = Math.max(zMax, point.z);
	}
	const thick = yMax - yMin;
	if (thick < 4e-4 || thick > .01) return null;
	const inset = points.filter((point) => point.y > yMin + thick * .18 && point.y < yMax - thick * .12 && point.x > xMin + .004 && point.x < xMax - .004 && point.z > zMin + .0015 && point.z < zMax - .004);
	if (inset.length < 24) return null;
	const center = new Vector3();
	for (const point of inset) center.add(point);
	center.multiplyScalar(1 / inset.length);
	const radii = inset.map((point) => Math.hypot(point.x - center.x, point.z - center.z)).sort((a, b) => a - b);
	const radius = radii[Math.floor(radii.length * .2)] ?? 0;
	if (radius < 45e-5 || radius > .003) return null;
	let frontY = Infinity;
	let backY = -Infinity;
	for (const point of points) {
		if (Math.hypot(point.x - center.x, point.z - center.z) > radius * 1.8) continue;
		frontY = Math.min(frontY, point.y);
		backY = Math.max(backY, point.y);
	}
	if (!Number.isFinite(frontY) || backY - frontY < thick * .5) return null;
	const edgeZ = Math.abs(center.z - zMin) <= Math.abs(center.z - zMax) ? zMin : zMax;
	return {
		x: center.x,
		z: center.z,
		radius,
		frontY,
		backY,
		edgeZ,
		outward: Math.sign(edgeZ - center.z) || -1
	};
}
function buildCurve(hole) {
	const x = hole.x;
	const front = hole.frontY;
	const back = hole.backY;
	const mid = (front + back) * .5;
	const lip = new Vector3(x, back + 42e-5, hole.z + hole.outward * 35e-5);
	return {
		keys: [
			{
				u: 0,
				point: lip.clone(),
				scale: 1
			},
			{
				u: .16,
				point: new Vector3(x, back + 8e-5, hole.z),
				scale: .62
			},
			{
				u: .34,
				point: new Vector3(x, back - 12e-5, hole.z),
				scale: .46
			},
			{
				u: .55,
				point: new Vector3(x, mid, hole.z),
				scale: .4
			},
			{
				u: .76,
				point: new Vector3(x, front + 12e-5, hole.z),
				scale: .46
			},
			{
				u: .9,
				point: new Vector3(x, front - 5e-5, hole.z),
				scale: .58
			},
			{
				u: 1,
				point: new Vector3(x, front - 38e-5, hole.z),
				scale: .7
			}
		],
		lip
	};
}
function sampleCurve(keys, u) {
	const t = MathUtils.clamp(u, 0, 1);
	let index = 1;
	while (index < keys.length - 1 && keys[index].u < t) index += 1;
	const a = keys[index - 1];
	const b = keys[index];
	const span = Math.max(b.u - a.u, 1e-5);
	const k = (t - a.u) / span;
	return {
		point: a.point.clone().lerp(b.point, k),
		scale: MathUtils.lerp(a.scale, b.scale, k)
	};
}
function buildFrames(keys) {
	const steps = 48;
	const points = [];
	for (let i = 0; i <= steps; i += 1) points.push(sampleCurve(keys, i / steps).point);
	const normals = [];
	const binormals = [];
	let normal = new Vector3();
	let binormal = new Vector3();
	for (let i = 0; i <= steps; i += 1) {
		const next = points[Math.min(steps, i + 1)];
		const prev = points[Math.max(0, i - 1)];
		const tangent = next.clone().sub(prev).normalize();
		if (i === 0) {
			normal.copy(RIGHT).addScaledVector(tangent, -RIGHT.dot(tangent));
			if (normal.lengthSq() < 1e-8) normal.copy(UP);
			normal.normalize();
			binormal.crossVectors(tangent, normal).normalize();
		} else {
			const oldTangent = points[i].clone().sub(points[i - 1]).normalize();
			const axis = new Vector3().crossVectors(oldTangent, tangent);
			const sin = MathUtils.clamp(axis.length(), 0, 1);
			if (sin > 1e-5) {
				axis.multiplyScalar(1 / sin);
				const angle = Math.asin(sin);
				normal.applyAxisAngle(axis, angle);
				binormal.applyAxisAngle(axis, angle);
			}
			normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
			binormal.crossVectors(tangent, normal).normalize();
			normal.crossVectors(binormal, tangent).normalize();
		}
		normals.push(normal.clone());
		binormals.push(binormal.clone());
	}
	return {
		steps,
		normals,
		binormals
	};
}
function frameAt(frames, u) {
	const scaled = MathUtils.clamp(u, 0, 1) * frames.steps;
	const index = Math.min(frames.steps - 1, Math.floor(scaled));
	const blend = scaled - index;
	return {
		normal: frames.normals[index].clone().lerp(frames.normals[index + 1], blend).normalize(),
		binormal: frames.binormals[index].clone().lerp(frames.binormals[index + 1], blend).normalize()
	};
}
function centerline(points) {
	const bins = /* @__PURE__ */ new Map();
	for (const point of points) {
		const key = Math.round(point.z * 500);
		const list = bins.get(key);
		if (list) list.push(point);
		else bins.set(key, [point]);
	}
	const samples = [...bins.keys()].sort((a, b) => a - b).map((key) => {
		const list = bins.get(key);
		const center = new Vector3();
		for (const point of list) center.add(point);
		center.multiplyScalar(1 / list.length);
		return center;
	});
	return (z) => {
		let best = samples[0];
		let distance = Infinity;
		for (const sample of samples) {
			const delta = Math.abs(sample.z - z);
			if (delta < distance) {
				distance = delta;
				best = sample;
			}
		}
		return best;
	};
}
function readAttributes(geometry) {
	const attributes = [];
	for (const name of Object.keys(geometry.attributes)) {
		if (name === "normal" || name === "tangent") continue;
		const attribute = geometry.getAttribute(name);
		if (!attribute) continue;
		attributes.push({
			name,
			itemSize: attribute.itemSize,
			array: attribute.array
		});
	}
	return attributes;
}
function threadMesh(mesh, root, zCut, zTip, zBlend, keys, frames, centerAt, lip) {
	const source = mesh.geometry;
	const index = source.getIndex();
	const position = source.getAttribute("position");
	if (!index || !position) return;
	const attributes = readAttributes(source);
	const locals = [];
	const worlds = [];
	const high = [];
	for (let i = 0; i < position.count; i += 1) {
		const local = new Vector3().fromBufferAttribute(position, i);
		locals.push(local);
		const world = mesh.localToWorld(local.clone());
		worlds.push(world);
		high.push(world.z >= zCut);
	}
	const span = Math.max(zTip - zCut, 1e-5);
	const lipFrame = frameAt(frames, 0);
	const placed = worlds.map((world) => {
		const center = centerAt(world.z);
		const dx = world.x - center.x;
		const dy = world.y - center.y;
		if (world.z >= zCut) {
			const u = MathUtils.clamp((world.z - zCut) / span, 0, 1);
			const sample = sampleCurve(keys, u);
			const { normal, binormal } = frameAt(frames, u);
			return sample.point.clone().addScaledVector(normal, dx * sample.scale).addScaledVector(binormal, dy * sample.scale);
		}
		if (world.z <= zBlend) return world;
		const t = MathUtils.smoothstep((world.z - zBlend) / Math.max(zCut - zBlend, 1e-5), 0, 1);
		const aimed = lip.clone().addScaledVector(lipFrame.normal, dx).addScaledVector(lipFrame.binormal, dy);
		return world.clone().lerp(aimed, t);
	});
	const pinnedPositions = [];
	const pinnedUvs = attributes.map(() => []);
	const pinnedIndex = [];
	const hangPositions = [];
	const hangUvs = attributes.map(() => []);
	const hangIndex = [];
	const pinnedMap = /* @__PURE__ */ new Map();
	const hangMap = /* @__PURE__ */ new Map();
	const pushVertex = (side, vertex, local, world) => {
		const cache = side === "pin" ? pinnedMap : hangMap;
		const cached = cache.get(vertex);
		if (cached !== void 0 && vertex >= 0) return cached;
		const positions = side === "pin" ? pinnedPositions : hangPositions;
		const uvs = side === "pin" ? pinnedUvs : hangUvs;
		const id = positions.length / 3;
		const point = side === "pin" ? world : mesh.worldToLocal(world.clone());
		positions.push(point.x, point.y, point.z);
		attributes.forEach((attribute, attributeIndex) => {
			if (attribute.name === "position") return;
			const values = uvs[attributeIndex];
			if (vertex >= 0) for (let k = 0; k < attribute.itemSize; k += 1) values.push(attribute.array[vertex * attribute.itemSize + k]);
		});
		if (vertex >= 0) cache.set(vertex, id);
		return id;
	};
	const pushInterpolated = (side, a, b, t, world, local) => {
		const positions = side === "pin" ? pinnedPositions : hangPositions;
		const uvs = side === "pin" ? pinnedUvs : hangUvs;
		const id = positions.length / 3;
		const point = side === "pin" ? world : local;
		positions.push(point.x, point.y, point.z);
		attributes.forEach((attribute, attributeIndex) => {
			if (attribute.name === "position") return;
			const values = uvs[attributeIndex];
			for (let k = 0; k < attribute.itemSize; k += 1) {
				const start = attribute.array[a * attribute.itemSize + k];
				const end = attribute.array[b * attribute.itemSize + k];
				values.push(start + (end - start) * t);
			}
		});
		return id;
	};
	const emit = (side, ids) => {
		const target = side === "pin" ? pinnedIndex : hangIndex;
		for (let i = 1; i < ids.length - 1; i += 1) target.push(ids[0], ids[i], ids[i + 1]);
	};
	const polygon = (wantHigh, corners) => {
		const ids = [];
		for (let i = 0; i < corners.length; i += 1) {
			const current = corners[i];
			const next = corners[(i + 1) % corners.length];
			const currentIn = high[current] === wantHigh;
			const nextIn = high[next] === wantHigh;
			if (currentIn) {
				const local = locals[current];
				const world = placed[current];
				ids.push(pushVertex(wantHigh ? "pin" : "hang", current, local, world));
			}
			if (currentIn !== nextIn) {
				const delta = worlds[next].z - worlds[current].z;
				const t = Math.abs(delta) < 1e-8 ? 0 : (zCut - worlds[current].z) / delta;
				const clamped = MathUtils.clamp(t, 0, 1);
				const world = placed[current].clone().lerp(placed[next], clamped);
				const local = mesh.worldToLocal(world.clone());
				ids.push(pushInterpolated(wantHigh ? "pin" : "hang", current, next, clamped, world, local));
			}
		}
		if (ids.length >= 3) emit(wantHigh ? "pin" : "hang", ids);
	};
	for (let i = 0; i < index.count; i += 3) {
		const corners = [
			index.getX(i),
			index.getX(i + 1),
			index.getX(i + 2)
		];
		const count = corners.reduce((sum, corner) => sum + (high[corner] ? 1 : 0), 0);
		if (count === 3) polygon(true, corners);
		else if (count === 0) polygon(false, corners);
		else {
			polygon(true, corners);
			polygon(false, corners);
		}
	}
	const makeGeometry = (positions, uvs, indices) => {
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
		attributes.forEach((attribute, attributeIndex) => {
			if (attribute.name === "position") return;
			const values = uvs[attributeIndex];
			if (values.length === positions.length / 3 * attribute.itemSize) geometry.setAttribute(attribute.name, new Float32BufferAttribute(values, attribute.itemSize));
		});
		geometry.setIndex(indices);
		geometry.computeVertexNormals();
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();
		geometry.userData.owned = true;
		return geometry;
	};
	if (hangPositions.length > 0 && hangIndex.length > 0) mesh.geometry = makeGeometry(hangPositions, hangUvs, hangIndex);
	if (pinnedPositions.length === 0 || pinnedIndex.length === 0) return;
	const pinned = new Mesh(makeGeometry(pinnedPositions, pinnedUvs, pinnedIndex), mesh.material);
	pinned.name = "HoleThread";
	pinned.castShadow = mesh.castShadow;
	pinned.receiveShadow = mesh.receiveShadow;
	root.add(pinned);
}
function threadHangingCord(root) {
	root.updateWorldMatrix(true, true);
	const ruler = findMesh(root, "Ruler");
	const ropes = [findMesh(root, "Cord •"), findMesh(root, "Cord_Braid")].filter((mesh) => !!mesh);
	if (!ruler || ropes.length === 0) return false;
	const hole = detectHole(ruler);
	if (!hole) return false;
	const samples = ropes.flatMap((mesh) => worldPoints(mesh));
	let zTip = -Infinity;
	for (const point of samples) zTip = Math.max(zTip, point.z);
	const zCut = zTip - .0042;
	if (!(zTip > zCut + .002)) return false;
	const zBlend = zCut - .007;
	const centerAt = centerline(samples);
	const { keys, lip } = buildCurve(hole);
	const frames = buildFrames(keys);
	for (const mesh of ropes) threadMesh(mesh, root, zCut, zTip, zBlend, keys, frames, centerAt, lip);
	root.userData.cordJoint = lip;
	console.info("[书签尺] 挂绳已穿过挂孔", {
		radius: Number(hole.radius.toFixed(4)),
		depth: Number((hole.backY - hole.frontY).toFixed(4))
	});
	return true;
}
//#endregion
export { threadHangingCord };
