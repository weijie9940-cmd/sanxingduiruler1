import { i as __toESM } from "../_runtime.mjs";
import { G as require_jsx_runtime, K as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as Maximize, n as RotateCcw, r as Minimize2 } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bookmark-stage-Dlll7Vu6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PREVIEW_MODEL_URL = `/bookmark.preview.glb?v=2`;
var FULL_MODEL_URL = `/bookmark.full.glb?v=2`;
var SHOWCASE_URL = "https://present-beacon-ewjc.here.now/";
var CACHE_NAME = "bookmark-models-v2";
var memory = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Map();
function emit(url, progress) {
	const set = listeners.get(url);
	if (!set) return;
	for (const listener of set) listener(progress);
}
function asError(error) {
	return error instanceof Error ? error : /* @__PURE__ */ new Error("未知错误");
}
function stageError(stage, error) {
	const message = asError(error).message;
	if (message.startsWith("下载：") || message.startsWith("解码：")) return new Error(message);
	return /* @__PURE__ */ new Error(`${stage}：${message}`);
}
function withTimeout(promise, timeoutMs, message) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
		promise.then((value) => {
			clearTimeout(timer);
			resolve(value);
		}, (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}
function absoluteUrl(url) {
	if (typeof window === "undefined") return url;
	return new URL(url, window.location.href).href;
}
async function readCache(url) {
	if (typeof caches === "undefined") return null;
	try {
		const hit = await (await caches.open(CACHE_NAME)).match(absoluteUrl(url));
		if (!hit) return null;
		const buffer = await hit.arrayBuffer();
		return buffer.byteLength > 20 ? buffer : null;
	} catch {
		return null;
	}
}
async function writeCache(url, buffer) {
	if (typeof caches === "undefined") return;
	try {
		await (await caches.open(CACHE_NAME)).put(absoluteUrl(url), new Response(buffer.slice(0), { headers: {
			"Content-Type": "model/gltf-binary",
			"Content-Length": String(buffer.byteLength)
		} }));
	} catch {}
}
async function invalidateModels(url) {
	if (url) memory.delete(url);
	else memory.clear();
	if (typeof caches === "undefined") return;
	try {
		const cache = await caches.open(CACHE_NAME);
		if (url) {
			await cache.delete(absoluteUrl(url));
			return;
		}
		const keys = await cache.keys();
		await Promise.all(keys.map((key) => cache.delete(key)));
	} catch {}
}
async function fetchBuffer(url, timeoutMs, onProgress) {
	const cached = await readCache(url);
	if (cached) {
		onProgress({
			phase: "download",
			loaded: cached.byteLength,
			total: cached.byteLength,
			source: "cache"
		});
		return {
			buffer: cached,
			source: "cache"
		};
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	let lastByte = Date.now();
	const stall = setInterval(() => {
		if (Date.now() - lastByte > 15e3) controller.abort();
	}, 1e3);
	try {
		let response;
		try {
			response = await fetch(url, {
				signal: controller.signal,
				cache: "no-store"
			});
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") throw new Error("下载超时，或连接长时间没有数据");
			throw new Error("网络或跨域被拒绝");
		}
		if (!response.ok || !response.body) {
			const message = response.status === 404 ? "找不到模型文件（HTTP 404）" : `服务器返回 HTTP ${response.status}`;
			console.error("[书签尺] 下载失败", {
				url,
				status: response.status,
				message
			});
			throw new Error(message);
		}
		const total = Number(response.headers.get("content-length") || 0);
		const reader = response.body.getReader();
		const chunks = [];
		let loaded = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			chunks.push(value);
			loaded += value.byteLength;
			lastByte = Date.now();
			onProgress({
				phase: "download",
				loaded,
				total,
				source: "network"
			});
		}
		const bytes = new Uint8Array(loaded);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		if (bytes.byteLength < 20) throw new Error("文件过小，不是完整模型");
		if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "glTF") throw new Error("文件内容不是 GLB 模型");
		const buffer = bytes.buffer;
		await writeCache(url, buffer);
		return {
			buffer,
			source: "network"
		};
	} finally {
		clearTimeout(timer);
		clearInterval(stall);
	}
}
var parserPromise = null;
function getParser() {
	if (!parserPromise) parserPromise = (async () => {
		const [{ GLTFLoader }, decoderMod] = await Promise.all([import("../_libs/three.mjs").then((n) => n.t), import("../_libs/three.mjs").then((n) => n.n)]);
		const decoder = decoderMod.MeshoptDecoder;
		if (!decoder?.supported) {
			console.error("[书签尺] 解码器不可用", "MeshoptDecoder.supported = false");
			throw new Error("当前浏览器无法解码压缩网格");
		}
		await decoder.ready;
		return (buffer) => new Promise((resolve, reject) => {
			const loader = new GLTFLoader();
			loader.setMeshoptDecoder(decoder);
			loader.parse(buffer, "", (gltf) => resolve(gltf), (error) => reject(error instanceof Error ? error : new Error(String(error))));
		});
	})().catch((error) => {
		parserPromise = null;
		throw error;
	});
	return parserPromise;
}
async function loadFresh(url, timeoutMs) {
	let fetched;
	try {
		fetched = await fetchBuffer(url, timeoutMs, (progress) => emit(url, progress));
	} catch (error) {
		console.error("[书签尺] 下载失败", {
			url,
			message: asError(error).message
		});
		throw stageError("下载", error);
	}
	console.info("[书签尺] 文件已取到", {
		url,
		bytes: fetched.buffer.byteLength,
		source: fetched.source
	});
	emit(url, {
		phase: "decode",
		loaded: fetched.buffer.byteLength,
		total: fetched.buffer.byteLength,
		source: fetched.source
	});
	await new Promise((resolve) => setTimeout(resolve, 0));
	try {
		return {
			gltf: await withTimeout((await getParser())(fetched.buffer), timeoutMs, "解码超时，模型没有解开"),
			bytes: fetched.buffer.byteLength,
			source: fetched.source
		};
	} catch (error) {
		console.error("[书签尺] 解码失败", {
			url,
			message: asError(error).message
		});
		throw stageError("解码", error);
	}
}
function loadGltf(url, onProgress, timeoutMs) {
	let set = listeners.get(url);
	if (!set) {
		set = /* @__PURE__ */ new Set();
		listeners.set(url, set);
	}
	set.add(onProgress);
	if (!memory.get(url)) {
		const promise = loadFresh(url, timeoutMs);
		const entry = {
			promise,
			ready: false
		};
		memory.set(url, entry);
		promise.then(() => {
			entry.ready = true;
		}, () => {
			if (memory.get(url)?.promise === promise) memory.delete(url);
		});
	}
	const entry = memory.get(url);
	const alreadyReady = entry.ready;
	return entry.promise.then((model) => {
		if (alreadyReady) {
			onProgress({
				phase: "decode",
				loaded: model.bytes,
				total: model.bytes,
				source: "cache"
			});
			return {
				...model,
				source: "cache"
			};
		}
		return model;
	}).finally(() => {
		set?.delete(onProgress);
	});
}
var VIEW_ANGLES = {
	home: {
		az: 164,
		el: 5
	},
	front: {
		az: 180,
		el: 2
	},
	back: {
		az: 0,
		el: 2
	},
	side: {
		az: 108,
		el: 4
	},
	tassel: {
		az: 172,
		el: 12
	}
};
var LIGHTS = [
	{
		id: "standard",
		label: "标准展示",
		key: {
			color: 16774118,
			intensity: 1.72,
			x: 1.25,
			y: 2.05,
			z: 1.7
		},
		fill: {
			color: 14147818,
			intensity: .46,
			x: -2.15,
			y: 1.05,
			z: -1.85
		},
		rim: {
			color: 16775408,
			intensity: .66,
			x: -.45,
			y: 2.35,
			z: -2.55
		},
		graze: {
			color: 16773604,
			intensity: .34,
			x: 2.7,
			y: .22,
			z: .45
		},
		exposure: 1,
		env: .58
	},
	{
		id: "soft",
		label: "柔和棚拍",
		key: {
			color: 16774894,
			intensity: 1.28,
			x: .45,
			y: 1.7,
			z: 2.25
		},
		fill: {
			color: 15199992,
			intensity: 1.05,
			x: -1.55,
			y: 1.15,
			z: 1.65
		},
		rim: {
			color: 16775410,
			intensity: .36,
			x: -.2,
			y: 2.1,
			z: -2.2
		},
		graze: {
			color: 16774120,
			intensity: .16,
			x: 1.8,
			y: .45,
			z: .9
		},
		exposure: 1.02,
		env: .86
	},
	{
		id: "warm",
		label: "暖金质感",
		key: {
			color: 16758122,
			intensity: 1.58,
			x: 1.35,
			y: 1.85,
			z: 1.65
		},
		fill: {
			color: 15778970,
			intensity: .48,
			x: -1.45,
			y: .85,
			z: 1.25
		},
		rim: {
			color: 16765092,
			intensity: .3,
			x: -.35,
			y: 2.15,
			z: -2.35
		},
		graze: {
			color: 16752986,
			intensity: .22,
			x: 2.2,
			y: .4,
			z: .55
		},
		exposure: .9,
		env: .36
	},
	{
		id: "cool",
		label: "冷色釉彩",
		key: {
			color: 16771016,
			intensity: 1.46,
			x: 1.2,
			y: 1.9,
			z: 1.75
		},
		fill: {
			color: 5218006,
			intensity: 1.22,
			x: -1.25,
			y: .95,
			z: 1.75
		},
		rim: {
			color: 8304356,
			intensity: .85,
			x: -.45,
			y: 2.35,
			z: -1.55
		},
		graze: {
			color: 14149364,
			intensity: .18,
			x: 2.15,
			y: .4,
			z: .85
		},
		exposure: 1,
		env: .34
	},
	{
		id: "drama",
		label: "戏剧聚光",
		key: {
			color: 16773602,
			intensity: 2.45,
			x: 2.35,
			y: 2.55,
			z: .85
		},
		fill: {
			color: 14016234,
			intensity: .42,
			x: -1.15,
			y: .75,
			z: 1.55
		},
		rim: {
			color: 16774894,
			intensity: .9,
			x: -.95,
			y: 2.65,
			z: -1.7
		},
		graze: {
			color: 16769216,
			intensity: .62,
			x: 2.85,
			y: .7,
			z: .2
		},
		exposure: .92,
		env: .32
	}
];
var LIGHT_BY_ID = {
	standard: LIGHTS[0],
	soft: LIGHTS[1],
	warm: LIGHTS[2],
	cool: LIGHTS[3],
	drama: LIGHTS[4]
};
function formatMb(bytes) {
	return `${(bytes / 1048576).toFixed(1)} MB`;
}
function BookmarkStage() {
	const viewRef = (0, import_react.useRef)(null);
	const stageRef = (0, import_react.useRef)(null);
	const apiRef = (0, import_react.useRef)(null);
	const [status, setStatus] = (0, import_react.useState)("loading");
	const [phase, setPhase] = (0, import_react.useState)("scene");
	const [loaded, setLoaded] = (0, import_react.useState)(0);
	const [total, setTotal] = (0, import_react.useState)(0);
	const [errorText, setErrorText] = (0, import_react.useState)("");
	const [upgradeError, setUpgradeError] = (0, import_react.useState)("");
	const [tier, setTier] = (0, import_react.useState)("");
	const [source, setSource] = (0, import_react.useState)("");
	const [view, setView] = (0, import_react.useState)("home");
	const [spin, setSpin] = (0, import_react.useState)(false);
	const [running, setRunning] = (0, import_react.useState)(true);
	const [light, setLight] = (0, import_react.useState)("standard");
	const [immersive, setImmersive] = (0, import_react.useState)(false);
	const [nativeFs, setNativeFs] = (0, import_react.useState)(false);
	const [attempt, setAttempt] = (0, import_react.useState)(0);
	const shownRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		const view = viewRef.current;
		if (!view) return;
		shownRef.current = false;
		setStatus("loading");
		setPhase("download");
		setLoaded(0);
		setTotal(0);
		setErrorText("");
		setUpgradeError("");
		setLight("standard");
		const canvas = document.createElement("canvas");
		canvas.setAttribute("aria-label", "三星堆装饰书签尺三维模型");
		canvas.dataset.light = "standard";
		const vignette = view.querySelector(".vignette");
		if (vignette?.nextSibling) view.insertBefore(canvas, vignette.nextSibling);
		else view.appendChild(canvas);
		let alive = true;
		let detachInput = () => {};
		let fiberTimer = 0;
		let watchdog = 0;
		let releaseModel = () => {};
		let renderer = null;
		let dispose = () => {
			alive = false;
			window.clearTimeout(fiberTimer);
			window.clearTimeout(watchdog);
			renderer?.setAnimationLoop(null);
			renderer?.dispose();
			canvas.remove();
		};
		const giveUp = (message) => {
			if (!alive || shownRef.current) return;
			setErrorText(message);
			setPhase("ready");
			setStatus("error");
		};
		const stall = window.setTimeout(() => {
			giveUp("加载超时，没有进入可查看的画面。");
		}, 28e3);
		const boot = async () => {
			const THREE = await import("../_libs/three.mjs").then((n) => n.i);
			const [{ OrbitControls }, { threadHangingCord }] = await Promise.all([import("../_libs/three.mjs").then((n) => n.r), import("./thread-cord-BRr9nO1w.mjs")]);
			if (!alive) return;
			const phone = window.matchMedia("(max-width: 900px)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 1100;
			try {
				renderer = new THREE.WebGLRenderer({
					canvas,
					antialias: !phone,
					alpha: true,
					powerPreference: phone ? "default" : "high-performance",
					failIfMajorPerformanceCaveat: false
				});
			} catch (error) {
				console.error("[书签尺] WebGL 创建失败", error);
				if (!alive) return;
				giveUp(error instanceof Error ? error.message : "WebGL 不可用");
				return;
			}
			if (!renderer.getContext()) {
				console.error("[书签尺] WebGL 创建失败", "getContext() 返回空");
				giveUp("当前环境无法创建三维画面。");
				renderer.dispose();
				return;
			}
			console.info("[书签尺] WebGL 已创建", { phone });
			const gpu = renderer;
			const previewLoad = loadGltf(PREVIEW_MODEL_URL, (event) => {
				if (!alive) return;
				setSource(event.source);
				canvas.dataset.source = event.source;
				setLoaded(event.loaded);
				setTotal(event.total);
				setPhase(event.phase);
				canvas.dataset.phase = event.phase;
			}, 25e3);
			const onLost = (event) => {
				event.preventDefault();
				console.error("[书签尺] WebGL 上下文丢失");
				if (!alive) return;
				shownRef.current = false;
				giveUp("画面中断了，请再试一次。");
			};
			canvas.addEventListener("webglcontextlost", onLost);
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1;
			renderer.setClearColor(0, 0);
			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera(30, 1, .008, 40);
			camera.near = .001;
			camera.far = 80;
			camera.position.set(0, .2, 1.2);
			const controls = new OrbitControls(camera, canvas);
			controls.enableDamping = true;
			controls.dampingFactor = .08;
			controls.enablePan = true;
			controls.screenSpacePanning = true;
			controls.panSpeed = .95;
			controls.rotateSpeed = .72;
			controls.zoomSpeed = 1.15;
			controls.autoRotate = false;
			controls.autoRotateSpeed = .85;
			controls.minPolarAngle = .01;
			controls.maxPolarAngle = Math.PI - .01;
			controls.minAzimuthAngle = -Infinity;
			controls.maxAzimuthAngle = Infinity;
			controls.enableRotate = false;
			controls.mouseButtons.LEFT = null;
			controls.touches.ONE = null;
			controls.touches.TWO = 2;
			controls.target.set(0, 0, 0);
			canvas.style.cursor = "grab";
			let pmrem = null;
			let env = null;
			let envNow = .58;
			const mountStudio = () => {
				if (!alive || env) return;
				const generator = new THREE.PMREMGenerator(gpu);
				pmrem = generator;
				const studio = new THREE.Scene();
				const disposables = [];
				const keep = (resource) => {
					disposables.push(resource);
					return resource;
				};
				const shell = new THREE.Mesh(keep(new THREE.SphereGeometry(16, 24, 16)), keep(new THREE.MeshBasicMaterial({
					color: 1183758,
					side: THREE.BackSide
				})));
				studio.add(shell);
				const bounce = new THREE.Mesh(keep(new THREE.CircleGeometry(9, 20)), keep(new THREE.MeshBasicMaterial({ color: 2761243 })));
				bounce.rotation.x = -Math.PI / 2;
				bounce.position.y = -5.5;
				studio.add(bounce);
				const softbox = (color, intensity, width, height, x, y, z) => {
					const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(width, height)), keep(new THREE.MeshStandardMaterial({
						color: 0,
						emissive: color,
						emissiveIntensity: intensity,
						roughness: 1,
						metalness: 0,
						side: THREE.DoubleSide
					})));
					mesh.position.set(x, y, z);
					mesh.lookAt(0, .2, 0);
					studio.add(mesh);
				};
				softbox(16773860, 12, 8.4, 5.6, 3.6, 6.8, 6.2);
				softbox(14016232, 4.6, 6.4, 4.4, -6.2, 3.2, -5.4);
				softbox(16774892, 8, 2.6, 7.6, -1.4, 6.2, -8.2);
				softbox(16181980, 4, 7.2, 1.8, 8.2, .35, .8);
				softbox(12964059, 2.6, 5.2, 2.2, -7.4, .15, 2.6);
				env = generator.fromScene(studio, .11, .08, 40, { size: 256 });
				scene.environment = env.texture;
				scene.environmentIntensity = envNow;
				for (const resource of disposables) resource.dispose();
				studio.clear();
			};
			const key = new THREE.DirectionalLight(16774118, 1.72);
			key.position.set(1.25, 2.05, 1.7);
			scene.add(key);
			const fill = new THREE.DirectionalLight(14147818, .46);
			fill.position.set(-2.15, 1.05, -1.85);
			scene.add(fill);
			const rim = new THREE.DirectionalLight(16775408, .66);
			rim.position.set(-.45, 2.35, -2.55);
			scene.add(rim);
			const graze = new THREE.DirectionalLight(16773604, .34);
			graze.position.set(2.7, .22, .45);
			scene.add(graze);
			scene.environmentIntensity = envNow;
			const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			const makeRig = (lamp) => ({
				lamp,
				color: lamp.color.clone(),
				pos: lamp.position.clone(),
				tColor: lamp.color.clone(),
				tPos: lamp.position.clone(),
				intensity: lamp.intensity,
				tIntensity: lamp.intensity
			});
			const rigs = [
				makeRig(key),
				makeRig(fill),
				makeRig(rim),
				makeRig(graze)
			];
			const lampKeys = [
				"key",
				"fill",
				"rim",
				"graze"
			];
			let exposureNow = 1;
			let targetExposure = 1;
			let targetEnv = .58;
			let blending = false;
			const commitLight = () => {
				for (const rig of rigs) {
					rig.color.copy(rig.tColor);
					rig.lamp.color.copy(rig.color);
					rig.intensity = rig.tIntensity;
					rig.lamp.intensity = rig.intensity;
					rig.pos.copy(rig.tPos);
					rig.lamp.position.copy(rig.pos);
				}
				exposureNow = targetExposure;
				gpu.toneMappingExposure = exposureNow;
				envNow = targetEnv;
				scene.environmentIntensity = envNow;
			};
			const seekLight = (id, instant) => {
				const look = LIGHT_BY_ID[id];
				if (!look) return;
				canvas.dataset.light = id;
				lampKeys.forEach((name, index) => {
					const spec = look[name];
					const rig = rigs[index];
					rig.tColor.setHex(spec.color);
					rig.tIntensity = spec.intensity;
					rig.tPos.set(spec.x, spec.y, spec.z);
				});
				targetExposure = look.exposure;
				targetEnv = look.env;
				if (instant || reduceMotion) {
					commitLight();
					blending = false;
					return;
				}
				blending = true;
			};
			const blendLight = (dt) => {
				if (!blending) return;
				const rate = 1 - Math.exp(-dt / .22);
				let pending = false;
				for (const rig of rigs) {
					rig.color.lerp(rig.tColor, rate);
					rig.lamp.color.copy(rig.color);
					rig.intensity += (rig.tIntensity - rig.intensity) * rate;
					rig.lamp.intensity = rig.intensity;
					rig.pos.lerp(rig.tPos, rate);
					rig.lamp.position.copy(rig.pos);
					if (Math.abs(rig.intensity - rig.tIntensity) > .012) pending = true;
					if (rig.pos.distanceToSquared(rig.tPos) > 1e-5) pending = true;
					const color = rig.color;
					const target = rig.tColor;
					if (Math.abs(color.r - target.r) + Math.abs(color.g - target.g) + Math.abs(color.b - target.b) > .02) pending = true;
				}
				exposureNow += (targetExposure - exposureNow) * rate;
				gpu.toneMappingExposure = exposureNow;
				envNow += (targetEnv - envNow) * rate;
				scene.environmentIntensity = envNow;
				if (pending || Math.abs(exposureNow - targetExposure) > .012 || Math.abs(envNow - targetEnv) > .012) return;
				commitLight();
				blending = false;
			};
			let lastTick = performance.now();
			const box = new THREE.Box3();
			const center = new THREE.Vector3();
			const dir = new THREE.Vector3();
			const xAxis = new THREE.Vector3();
			const yAxis = new THREE.Vector3();
			const zAxis = new THREE.Vector3();
			const offset = new THREE.Vector3();
			const corner = new THREE.Vector3();
			const fromPos = new THREE.Vector3();
			const toPos = new THREE.Vector3();
			let fitted = false;
			let userMoved = false;
			let anim = null;
			let spinOn = false;
			let panLimit = .35;
			const restCenter = new THREE.Vector3();
			let running = !reduceMotion;
			let accumulator = 0;
			const GUIDES = 12;
			const guides = Array.from({ length: GUIDES }, () => ({ a: 0 }));
			const guideData = new Float32Array(GUIDES);
			const angleUniform = { value: 0 };
			const guideUniform = { value: guideData };
			let rulerSpin = null;
			let activePivot = null;
			let holeAnchor = null;
			let hanger = null;
			let tasselRoot = null;
			const restQuat = new THREE.Quaternion();
			const hangDir = new THREE.Vector3(0, -1, 0);
			const holeNow = new THREE.Vector3();
			const holePrev = new THREE.Vector3();
			const holeVel = new THREE.Vector3();
			const desired = new THREE.Vector3(0, -1, 0);
			const down = new THREE.Vector3(0, -1, 0);
			const qAim = new THREE.Quaternion();
			const qFrom = new THREE.Quaternion();
			const qTo = new THREE.Quaternion();
			const qYaw = new THREE.Quaternion();
			const qPitch = new THREE.Quaternion();
			const camRight = new THREE.Vector3();
			const worldUp = new THREE.Vector3(0, 1, 0);
			const holeLocal = new THREE.Vector3();
			let holeReady = false;
			let rotAnim = null;
			let dragging = false;
			const pointers = /* @__PURE__ */ new Set();
			const inertia = {
				x: 0,
				y: 0
			};
			let lastX = 0;
			let lastY = 0;
			const soft = [];
			const tumble = (dx, dy) => {
				if (!rulerSpin) return;
				camera.updateMatrixWorld();
				camRight.setFromMatrixColumn(camera.matrixWorld, 2);
				if (camRight.lengthSq() < 1e-8) camRight.set(0, 0, 1);
				camRight.normalize();
				qYaw.setFromAxisAngle(worldUp, -dx * .0062);
				qPitch.setFromAxisAngle(camRight, dy * .0062);
				rulerSpin.quaternion.premultiply(qPitch).premultiply(qYaw);
			};
			const orientTarget = (name) => {
				qTo.identity();
				if (name === "back") qTo.setFromAxisAngle(worldUp, Math.PI);
				else if (name === "side") qTo.setFromAxisAngle(worldUp, Math.PI / 2);
			};
			const orientTo = (name, instant) => {
				orientTarget(name);
				if (!rulerSpin) return;
				if (instant || reduceMotion) {
					rulerSpin.quaternion.copy(qTo);
					rotAnim = null;
					return;
				}
				qFrom.copy(rulerSpin.quaternion);
				rotAnim = {
					t: 0,
					dur: .78
				};
			};
			const onPointerDown = (event) => {
				pointers.add(event.pointerId);
				if (event.pointerType !== "touch" && event.button !== 0) return;
				if (pointers.size > 1) {
					dragging = false;
					inertia.x = 0;
					inertia.y = 0;
					return;
				}
				dragging = true;
				inertia.x = 0;
				inertia.y = 0;
				lastX = event.clientX;
				lastY = event.clientY;
				rotAnim = null;
				anim = null;
				userMoved = true;
				spinOn = false;
				canvas.style.cursor = "grabbing";
				if (alive) {
					setView("free");
					setSpin(false);
				}
			};
			const onPointerMove = (event) => {
				if (!dragging || pointers.size > 1) return;
				const dx = event.clientX - lastX;
				const dy = event.clientY - lastY;
				lastX = event.clientX;
				lastY = event.clientY;
				if (!dx && !dy) return;
				tumble(dx, dy);
				inertia.x = dx;
				inertia.y = dy;
			};
			const endDrag = (event) => {
				pointers.delete(event.pointerId);
				if (pointers.size > 0) {
					dragging = false;
					return;
				}
				dragging = false;
				canvas.style.cursor = "grab";
			};
			const onContextMenu = (event) => event.preventDefault();
			canvas.addEventListener("pointerdown", onPointerDown);
			canvas.addEventListener("pointermove", onPointerMove);
			canvas.addEventListener("pointerup", endDrag);
			canvas.addEventListener("pointercancel", endDrag);
			canvas.addEventListener("contextmenu", onContextMenu);
			detachInput = () => {
				canvas.removeEventListener("pointerdown", onPointerDown);
				canvas.removeEventListener("pointermove", onPointerMove);
				canvas.removeEventListener("pointerup", endDrag);
				canvas.removeEventListener("pointercancel", endDrag);
				canvas.removeEventListener("contextmenu", onContextMenu);
			};
			const resize = () => {
				const wrap = canvas.parentElement;
				if (!wrap) return;
				const width = Math.max(1, wrap.clientWidth);
				const height = Math.max(1, wrap.clientHeight);
				const dprCap = phone ? 1.15 : width < 800 ? 1.5 : 1.75;
				gpu.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
				gpu.setSize(width, height, false);
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
				if (fitted && !userMoved) place(currentView, true);
			};
			const frameDistance = (direction) => {
				box.getCenter(center);
				const fov = camera.fov * Math.PI / 180;
				const tanV = Math.tan(fov / 2) * .78;
				const tanH = tanV * Math.max(camera.aspect, .2);
				const up = Math.abs(direction.y) > .92 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
				zAxis.copy(direction).normalize();
				xAxis.crossVectors(up, zAxis);
				if (xAxis.lengthSq() < 1e-8) xAxis.crossVectors(new THREE.Vector3(1, 0, 0), zAxis);
				xAxis.normalize();
				yAxis.crossVectors(zAxis, xAxis).normalize();
				let dist = .05;
				const xs = [box.min.x, box.max.x];
				const ys = [box.min.y, box.max.y];
				const zs = [box.min.z, box.max.z];
				for (const x of xs) for (const y of ys) for (const z of zs) {
					corner.set(x, y, z);
					offset.copy(corner).sub(center);
					const dx = offset.dot(xAxis);
					const dy = offset.dot(yAxis);
					const dz = offset.dot(zAxis);
					const need = Math.max(dz + Math.abs(dx) / tanH, dz + Math.abs(dy) / tanV);
					if (need > dist) dist = need;
				}
				return dist * 1.04;
			};
			const directionFor = (name) => {
				const { az, el } = VIEW_ANGLES[name];
				const ayr = az * Math.PI / 180;
				const elr = el * Math.PI / 180;
				return dir.set(Math.sin(ayr) * Math.cos(elr), Math.sin(elr), -Math.cos(ayr) * Math.cos(elr));
			};
			let currentView = "home";
			const fromTarget = new THREE.Vector3();
			const toTarget = new THREE.Vector3();
			let frameDist = .5;
			const place = (name, instant) => {
				if (!fitted) return;
				currentView = name;
				userMoved = false;
				directionFor(name);
				const dist = frameDistance(dir);
				if (name !== "tassel") frameDist = dist;
				const look = center.clone();
				if (name === "tassel") look.y = box.min.y + .04;
				const distance = name === "tassel" ? frameDist * .28 : dist;
				toPos.copy(look).addScaledVector(dir, distance);
				toTarget.copy(look);
				controls.minDistance = Math.max(.018, frameDist * .055);
				controls.maxDistance = frameDist * 3.4;
				if (instant || reduceMotion) {
					camera.position.copy(toPos);
					controls.target.copy(toTarget);
					anim = null;
					controls.update();
					return;
				}
				fromPos.copy(camera.position);
				fromTarget.copy(controls.target);
				anim = {
					t: 0,
					dur: .72
				};
			};
			const observer = new ResizeObserver(() => resize());
			if (canvas.parentElement) observer.observe(canvas.parentElement);
			resize();
			const onStart = () => {
				anim = null;
				userMoved = true;
				if (alive) setView("free");
			};
			controls.addEventListener("start", onStart);
			const fiberBend = `#include <begin_vertex>
float env = aAlong * aAlong;
float slot = clamp(aGuide, 0.0, 0.999) * 11.0;
int i0 = int(floor(slot));
int i1 = min(i0 + 1, 11);
float ang = mix(uGuide[i0], uGuide[i1], fract(slot));
float tip = smoothstep(0.7, 1.0, aAlong);
transformed.x += sin(ang) * aAlong * uLen;
transformed.z += (1.0 - cos(ang)) * aAlong * uLen * 0.08;
float layer = fract(sin(aSeed * 127.1 + aGuide * 311.7) * 43758.5453);
transformed.y += (layer - 0.5) * env * 0.0095;
transformed.x += (fract(aSeed * 19.19) - 0.5) * env * 0.0022;
transformed.z += (aSeed - 0.5) * tip * 0.0024 * uSoft;
transformed.z += uLift * aAlong;`;
			const cordBend = `#include <begin_vertex>
float along = clamp((uZ0 - transformed.z) / uLen, 0.0, 1.0);
float pin = sin(along * 3.14159265);
transformed.x += pin * uAngle * uLen;
transformed.y += pin * uAngle * uLen * 0.22;`;
			renderer.setAnimationLoop(() => {
				const now = performance.now();
				const dt = Math.min(Math.max(0, (now - lastTick) / 1e3), .05);
				lastTick = now;
				blendLight(dt);
				if (anim) {
					anim.t += dt;
					const k = Math.min(1, anim.t / anim.dur);
					const eased = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
					camera.position.lerpVectors(fromPos, toPos, eased);
					controls.target.lerpVectors(fromTarget, toTarget, eased);
					if (k >= 1) anim = null;
				}
				if (rotAnim && rulerSpin) {
					rotAnim.t += dt;
					const k = Math.min(1, rotAnim.t / rotAnim.dur);
					const eased = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
					rulerSpin.quaternion.copy(qFrom).slerp(qTo, eased);
					if (k >= 1) rotAnim = null;
				}
				if (!dragging && rulerSpin && (inertia.x !== 0 || inertia.y !== 0)) {
					tumble(inertia.x * .35, inertia.y * .35);
					const decay = Math.exp(-9 * dt);
					inertia.x *= decay;
					inertia.y *= decay;
					if (Math.hypot(inertia.x, inertia.y) < .12) inertia.x = inertia.y = 0;
				}
				if (spinOn && rulerSpin && !dragging && !rotAnim) {
					qYaw.setFromAxisAngle(worldUp, dt * .42);
					rulerSpin.quaternion.premultiply(qYaw);
				}
				if (holeAnchor && hanger && tasselRoot) {
					holeAnchor.getWorldPosition(holeNow);
					if (!holeReady || dt >= .08) {
						holePrev.copy(holeNow);
						holeVel.set(0, 0, 0);
						holeReady = true;
					} else {
						holeVel.copy(holeNow).sub(holePrev).multiplyScalar(1 / Math.max(dt, 1e-4));
						holePrev.copy(holeNow);
						if (holeVel.length() > 1.35) holeVel.setLength(1.35);
					}
					if (running && !reduceMotion) {
						accumulator += dt;
						let steps = 0;
						const step = 1 / 60;
						while (accumulator >= step && steps < 4) {
							desired.set(-holeVel.x * .58, -1, -holeVel.z * .58).normalize();
							const follow = 1 - Math.exp(-6.2 * step);
							hangDir.lerp(desired, follow).normalize();
							const align = THREE.MathUtils.clamp(hangDir.dot(down), -1, 1);
							const angle = Math.acos(align);
							const maxAngle = .58;
							if (angle > maxAngle) hangDir.lerp(down, (angle - maxAngle) / Math.max(angle, 1e-4)).normalize();
							for (let i = 0; i < GUIDES; i++) {
								const wobble = (i % 5 - 2) * .08;
								const target = THREE.MathUtils.clamp(hangDir.x * (.42 + i % 4 * .06) + hangDir.z * wobble, -.07, .07);
								const rate = 4.2 + i % 4 * 1.15;
								guides[i].a += (target - guides[i].a) * (1 - Math.exp(-rate * step));
							}
							accumulator -= step;
							steps += 1;
						}
						if (steps === 4) accumulator = 0;
					}
					qAim.setFromUnitVectors(down, hangDir);
					tasselRoot.quaternion.copy(restQuat).premultiply(qAim);
					tasselRoot.position.set(0, 0, 0);
					hanger.quaternion.identity();
					holeLocal.copy(holeNow);
					hanger.parent?.worldToLocal(holeLocal);
					hanger.position.copy(holeLocal);
					hanger.updateMatrix();
					tasselRoot.updateMatrix();
					hanger.updateWorldMatrix(true, true);
					angleUniform.value = THREE.MathUtils.clamp(hangDir.x * .2 + hangDir.z * .05, -.04, .04);
					for (let i = 0; i < GUIDES; i++) guideData[i] = guides[i].a;
					const cordPoint = tasselRoot.getWorldPosition(holeLocal);
					const holePoint = holeAnchor.getWorldPosition(desired);
					canvas.dataset.dy = hangDir.y.toFixed(3);
					canvas.dataset.gap = holePoint.distanceTo(cordPoint).toFixed(4);
					canvas.dataset.tilt = Math.hypot(hangDir.x, hangDir.z).toFixed(3);
					if (rulerSpin) {
						corner.set(0, 1, 0).applyQuaternion(rulerSpin.quaternion);
						canvas.dataset.up = corner.y.toFixed(3);
					}
				}
				controls.autoRotate = false;
				controls.update();
				if (!anim && panLimit > 0) {
					offset.copy(controls.target).sub(restCenter);
					if (offset.lengthSq() > panLimit * panLimit) {
						offset.setLength(panLimit);
						controls.target.copy(restCenter).add(offset);
					}
				}
				gpu.render(scene, camera);
			});
			apiRef.current = {
				go: (name) => {
					try {
						running = !reduceMotion;
						holeVel.set(0, 0, 0);
						inertia.x = 0;
						inertia.y = 0;
						if (alive) setRunning(running);
						orientTo(name, false);
						place(name === "back" || name === "side" ? "front" : name, false);
					} catch (error) {
						console.warn(error);
					}
				},
				setSpin: (on) => {
					spinOn = on;
					if (on) rotAnim = null;
				},
				setRunning: (on) => {
					running = on && !reduceMotion;
					if (!running) accumulator = 0;
				},
				setLight: (id) => {
					seekLight(id, false);
				}
			};
			releaseModel = () => {
				window.clearTimeout(fiberTimer);
				for (const item of soft) item.material.dispose();
				soft.length = 0;
				if (activePivot) {
					activePivot.traverse((child) => {
						const mesh = child;
						const geometry = mesh.geometry;
						if (mesh.isMesh && geometry?.userData?.owned) geometry.dispose();
					});
					scene.remove(activePivot);
					activePivot = null;
				}
				rulerSpin = null;
				holeAnchor = null;
				hanger = null;
				tasselRoot = null;
				holeReady = false;
			};
			dispose = () => {
				alive = false;
				releaseModel();
				apiRef.current = null;
				canvas.removeEventListener("webglcontextlost", onLost);
				controls.removeEventListener("start", onStart);
				observer.disconnect();
				detachInput();
				gpu.setAnimationLoop(null);
				controls.dispose();
				env?.texture.dispose();
				pmrem?.dispose();
				gpu.dispose();
				canvas.remove();
			};
			const adoptModel = (gltf, resetView) => {
				const savedQuat = rulerSpin?.quaternion.clone() ?? null;
				const savedCam = camera.position.clone();
				const savedTarget = controls.target.clone();
				const savedHang = hangDir.clone();
				const savedMoved = userMoved;
				const savedView = currentView;
				rotAnim = null;
				anim = null;
				releaseModel();
				const model = gltf.scene.clone(true);
				try {
					threadHangingCord(model);
				} catch (error) {
					console.error("[书签尺] 挂绳穿孔失败，先显示模型", error);
				}
				model.position.set(0, 0, 0);
				model.rotation.set(0, 0, 0);
				model.scale.set(1, 1, 1);
				const upright = new THREE.Group();
				upright.rotation.x = -Math.PI / 2;
				upright.add(model);
				const pivot = new THREE.Group();
				pivot.add(upright);
				scene.add(pivot);
				activePivot = pivot;
				upright.updateWorldMatrix(true, true);
				const rawCenter = new THREE.Box3().setFromObject(upright).getCenter(new THREE.Vector3());
				pivot.position.copy(rawCenter).multiplyScalar(-1);
				pivot.updateWorldMatrix(true, true);
				const rulerNode = model.children.find((child) => child.name.startsWith("Ruler"));
				const rulerCenter = new THREE.Box3().setFromObject(rulerNode ?? upright).getCenter(new THREE.Vector3());
				rulerSpin = new THREE.Group();
				rulerSpin.name = "ruler-spin";
				pivot.add(rulerSpin);
				rulerSpin.position.copy(rulerCenter);
				pivot.worldToLocal(rulerSpin.position);
				rulerSpin.attach(upright);
				const isHanging = (name) => /^(Cord|Connector|Metal_Cap|Red_Bead|Yellow_Ornament|Tassel_)/.test(name);
				const hanging = model.children.filter((child) => isHanging(child.name));
				const cord = hanging.find((child) => child.name.startsWith("Cord") && !child.name.includes("Braid"));
				const braid = hanging.find((child) => child.name.includes("Braid"));
				const worldSamples = (object, budget) => {
					const points = [];
					object.updateWorldMatrix(true, true);
					object.traverse((child) => {
						const mesh = child;
						if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
						const attr = mesh.geometry.attributes.position;
						const step = Math.max(1, Math.floor(attr.count / budget));
						for (let i = 0; i < attr.count; i += step) points.push(mesh.localToWorld(new THREE.Vector3(attr.getX(i), attr.getY(i), attr.getZ(i))));
					});
					return points;
				};
				const cordPoints = worldSamples(braid ?? cord ?? hanging[0], 180);
				const rulerPoints = worldSamples(rulerNode ?? model, 120);
				const gaps = cordPoints.map((point) => {
					let best = Infinity;
					for (const mark of rulerPoints) {
						const dist = point.distanceToSquared(mark);
						if (dist < best) best = dist;
					}
					return Math.sqrt(best);
				});
				const nearest = gaps.reduce((min, gap) => Math.min(min, gap), Infinity);
				const nearCord = cordPoints.filter((_, index) => gaps[index] <= nearest + .0015);
				const joint = model.userData.cordJoint;
				const anchor = new THREE.Vector3();
				if (joint) anchor.copy(joint);
				else if (nearCord.length) {
					for (const point of nearCord) anchor.add(point);
					anchor.multiplyScalar(1 / nearCord.length);
				} else {
					const fallback = new THREE.Box3().setFromObject(cord ?? hanging[0] ?? upright);
					anchor.set((fallback.min.x + fallback.max.x) / 2, fallback.max.y, (fallback.min.z + fallback.max.z) / 2);
				}
				model.updateWorldMatrix(true, true);
				if (!joint) model.worldToLocal(anchor);
				const tasselPivot = new THREE.Group();
				tasselPivot.name = "tassel-assembly";
				tasselPivot.position.copy(anchor);
				model.add(tasselPivot);
				for (const node of hanging) tasselPivot.attach(node);
				holeAnchor = new THREE.Object3D();
				holeAnchor.name = "hole-anchor";
				holeAnchor.position.copy(anchor);
				model.add(holeAnchor);
				hanger = new THREE.Group();
				hanger.name = "hanger";
				pivot.add(hanger);
				holeAnchor.getWorldPosition(hanger.position);
				pivot.worldToLocal(hanger.position);
				hanger.updateWorldMatrix(true, true);
				tasselRoot = tasselPivot;
				hanger.attach(tasselRoot);
				tasselRoot.position.set(0, 0, 0);
				restQuat.copy(tasselRoot.quaternion);
				hangDir.set(0, -1, 0);
				holeAnchor.getWorldPosition(holePrev);
				holeReady = true;
				canvas.dataset.parts = String(hanging.length);
				const cordNode = cord ?? braid;
				let cordSpan = null;
				if (cordNode) {
					const probe = new THREE.Box3();
					cordNode.traverse((child) => {
						const mesh = child;
						if (!mesh.isMesh) return;
						if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
						if (mesh.geometry.boundingBox) probe.union(mesh.geometry.boundingBox);
					});
					if (!probe.isEmpty()) cordSpan = {
						z0: probe.max.z,
						len: Math.max(probe.max.z - probe.min.z, 1e-4)
					};
				}
				const tagFibers = (geometry) => {
					const position = geometry.attributes.position;
					const index = geometry.index;
					if (!position || !index || geometry.getAttribute("aAlong")) return;
					const count = position.count;
					const parent = new Int32Array(count);
					for (let i = 0; i < count; i++) parent[i] = i;
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
					const unite = (a, b) => {
						const ra = find(a);
						const rb = find(b);
						if (ra !== rb) parent[rb] = ra;
					};
					const ids = index.array;
					for (let i = 0; i < ids.length; i += 3) {
						unite(ids[i], ids[i + 1]);
						unite(ids[i], ids[i + 2]);
					}
					const compact = /* @__PURE__ */ new Map();
					const strand = new Int32Array(count);
					let strands = 0;
					for (let i = 0; i < count; i++) {
						const root = find(i);
						let id = compact.get(root);
						if (id === void 0) {
							id = strands;
							compact.set(root, id);
							strands += 1;
						}
						strand[i] = id;
					}
					const zMin = new Float32Array(strands).fill(Infinity);
					const zMax = new Float32Array(strands).fill(-Infinity);
					const rootX = new Float64Array(strands);
					const rootN = new Int32Array(strands);
					for (let i = 0; i < count; i++) {
						const id = strand[i];
						const z = position.getZ(i);
						if (z < zMin[id]) zMin[id] = z;
						if (z > zMax[id]) zMax[id] = z;
					}
					for (let i = 0; i < count; i++) {
						const id = strand[i];
						const span = Math.max(zMax[id] - zMin[id], 1e-5);
						if (position.getZ(i) > zMax[id] - span * .18) {
							rootX[id] += position.getX(i);
							rootN[id] += 1;
						}
					}
					let minX = Infinity;
					let maxX = -Infinity;
					for (let id = 0; id < strands; id++) {
						if (!rootN[id]) continue;
						rootX[id] /= rootN[id];
						if (zMax[id] - zMin[id] < .012) continue;
						if (rootX[id] < minX) minX = rootX[id];
						if (rootX[id] > maxX) maxX = rootX[id];
					}
					if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
						minX = 0;
						maxX = 1;
					}
					const spanX = Math.max(maxX - minX, 1e-5);
					const tipX = new Float64Array(strands);
					const tipY = new Float64Array(strands);
					const tipZ = new Float64Array(strands);
					const tipN = new Int32Array(strands);
					const cx = new Float64Array(strands);
					const cy = new Float64Array(strands);
					const cz = new Float64Array(strands);
					const cn = new Int32Array(strands);
					for (let i = 0; i < count; i++) {
						const id = strand[i];
						const x = position.getX(i);
						const y = position.getY(i);
						const z = position.getZ(i);
						cx[id] += x;
						cy[id] += y;
						cz[id] += z;
						cn[id] += 1;
						const span = Math.max(zMax[id] - zMin[id], 1e-5);
						if (span >= .012 && z <= zMin[id] + span * .12) {
							tipX[id] += x;
							tipY[id] += y;
							tipZ[id] += z;
							tipN[id] += 1;
						}
					}
					const big = [];
					for (let id = 0; id < strands; id++) if (tipN[id]) {
						tipX[id] /= tipN[id];
						tipY[id] /= tipN[id];
						tipZ[id] /= tipN[id];
						big.push(id);
					}
					const owner = new Int32Array(strands);
					for (let id = 0; id < strands; id++) owner[id] = id;
					for (let id = 0; id < strands; id++) {
						if (zMax[id] - zMin[id] >= .012 || !big.length || !cn[id]) continue;
						const px = cx[id] / cn[id];
						const py = cy[id] / cn[id];
						const pz = cz[id] / cn[id];
						let best = big[0];
						let bestD = Infinity;
						for (const candidate of big) {
							const dx = px - tipX[candidate];
							const dy = py - tipY[candidate];
							const dz = pz - tipZ[candidate];
							const dist = dx * dx + dy * dy + dz * dz;
							if (dist < bestD) {
								bestD = dist;
								best = candidate;
							}
						}
						owner[id] = best;
					}
					const along = new Float32Array(count);
					const guide = new Float32Array(count);
					const seed = new Float32Array(count);
					const seeds = new Float32Array(strands);
					for (let id = 0; id < strands; id++) {
						const hash = Math.sin(id * 12.9898) * 43758.5453;
						seeds[id] = hash - Math.floor(hash);
					}
					for (let i = 0; i < count; i++) {
						const id = strand[i];
						const source = owner[id];
						const span = Math.max(zMax[id] - zMin[id], 1e-5);
						const long = zMax[id] - zMin[id] >= .012;
						along[i] = long ? THREE.MathUtils.clamp((zMax[id] - position.getZ(i)) / span, 0, 1) : 1;
						guide[i] = THREE.MathUtils.clamp((rootX[source] - minX) / spanX, 0, .999);
						seed[i] = seeds[source];
					}
					geometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
					geometry.setAttribute("aGuide", new THREE.BufferAttribute(guide, 1));
					geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
				};
				const bindSoft = (object, mode, softness = 1, lift = 0) => {
					if (!object) return;
					object.traverse((child) => {
						const mesh = child;
						if (!mesh.isMesh || !mesh.geometry) return;
						if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
						const bounds = mesh.geometry.boundingBox;
						if (!bounds) return;
						if (mode === "fiber") tagFibers(mesh.geometry);
						const z0 = mode === "cord" && cordSpan ? cordSpan.z0 : bounds.max.z;
						const len = mode === "cord" && cordSpan ? cordSpan.len : Math.max(bounds.max.z - bounds.min.z, 1e-4);
						const clones = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => {
							const clone = material.clone();
							const key = `soft-${mode}-${soft.length}`;
							clone.onBeforeCompile = (shader) => {
								shader.uniforms.uAngle = angleUniform;
								shader.uniforms.uGuide = guideUniform;
								shader.uniforms.uSoft = { value: softness };
								shader.uniforms.uLift = { value: lift };
								shader.uniforms.uZ0 = { value: z0 };
								shader.uniforms.uLen = { value: len };
								shader.vertexShader = (mode === "fiber" ? "attribute float aAlong;\nattribute float aGuide;\nattribute float aSeed;\nuniform float uGuide[12];\nuniform float uLen;\nuniform float uSoft;\nuniform float uLift;\n" : "uniform float uAngle;\nuniform float uSoft;\nuniform float uZ0;\nuniform float uLen;\n") + shader.vertexShader.replace("#include <begin_vertex>", mode === "cord" ? cordBend : fiberBend);
							};
							clone.customProgramCacheKey = () => key;
							soft.push({
								mesh,
								material: clone,
								mode
							});
							return clone;
						});
						mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
					});
				};
				pivot.updateWorldMatrix(true, true);
				box.setFromObject(pivot);
				box.getCenter(center);
				restCenter.copy(center);
				const span = new THREE.Vector3();
				box.getSize(span);
				panLimit = Math.max(span.x, span.y, span.z) * .72;
				controls.target.copy(center);
				fitted = true;
				if (box.isEmpty()) throw new Error("场景创建：模型没有可显示的形体");
				if (savedMoved && savedQuat && rulerSpin) {
					rulerSpin.quaternion.copy(savedQuat);
					camera.position.copy(savedCam);
					controls.target.copy(savedTarget);
					hangDir.copy(savedHang);
					holeReady = false;
					directionFor(savedView);
					const dist = frameDistance(dir);
					if (savedView !== "tassel") frameDist = dist;
					controls.minDistance = Math.max(.018, frameDist * .055);
					controls.maxDistance = frameDist * 3.4;
					controls.update();
				} else place(resetView ? "home" : savedView, true);
				const tuneResponse = (root) => {
					root.traverse((child) => {
						const mesh = child;
						if (!mesh.isMesh) return;
						const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
						for (const entry of list) {
							const material = entry;
							if (!material || !("roughness" in material)) continue;
							const name = material.name;
							const silk = name.includes("silk") || name.includes("woven teal") || name.includes("braid highlight");
							const metal = name.includes("antique gold") || name.includes("bright gold") || name.includes("Antique brass") || name.includes("satin edge");
							const jewel = name.includes("glass bead") || name.includes("amber") || name.includes("turquoise cap");
							if (silk) {
								if (name.includes("silk teal light")) material.roughness = .58;
								else if (name.includes("silk teal shade")) material.roughness = .64;
								else if (name.includes("silk teal")) material.roughness = .6;
								else if (name.includes("braid highlight")) material.roughness = .52;
								else material.roughness = .56;
								material.envMapIntensity = .36;
								if ("specularIntensity" in material) material.specularIntensity = .32;
								if ("sheen" in material) {
									material.sheen = .32;
									material.sheenRoughness = .6;
									if (name.includes("light") || name.includes("braid")) material.sheenColor.setRGB(.3, .64, .58);
									else if (name.includes("shade")) material.sheenColor.setRGB(.07, .26, .24);
									else material.sheenColor.setRGB(.12, .38, .36);
								}
							} else if (metal) {
								material.roughness = name.includes("bright gold") ? .34 : .36;
								material.envMapIntensity = 1.2;
							} else if (name.startsWith("Front") || name.startsWith("Back")) {
								material.metalness = .05;
								material.roughness = .58;
								material.envMapIntensity = .2;
							} else if (name.includes("enamel") || name.includes("vermilion") || name.includes("Comet tail")) material.envMapIntensity = .28;
							else if (jewel) {
								material.roughness = Math.max(material.roughness, .26);
								material.envMapIntensity = .82;
							}
						}
					});
				};
				tuneResponse(pivot);
				fiberTimer = window.setTimeout(() => {
					if (!alive) return;
					try {
						bindSoft(cord, "cord");
						bindSoft(braid, "cord");
						hanging.forEach((node) => {
							if (node.name.startsWith("Tassel_Fiber") || node.name.startsWith("Tassel_Fibers")) bindSoft(node, "fiber", node.name.includes("Flyaway") ? .2 : 1, node.name.includes("Flyaway") ? .005 : 0);
						});
					} catch (error) {
						console.warn(error);
					}
				}, 48);
			};
			const applyProgress = (event, background) => {
				if (!alive) return;
				setSource(event.source);
				canvas.dataset.source = event.source;
				setLoaded(event.loaded);
				setTotal(event.total);
				setPhase(background ? "upgrade" : event.phase);
				canvas.dataset.phase = background ? "upgrade" : event.phase;
			};
			const shown = { current: false };
			const showModel = async (model, tierName, resetView) => {
				if (!alive) return;
				window.clearTimeout(stall);
				setPhase("scene");
				canvas.dataset.phase = "scene";
				await new Promise((resolve) => window.setTimeout(resolve, 16));
				if (!alive) return;
				try {
					adoptModel(model.gltf, resetView);
				} catch (error) {
					console.error("[书签尺] 场景创建失败", error);
					const message = error instanceof Error ? error.message : "未知错误";
					throw new Error(message.startsWith("场景创建") ? message : `场景创建：${message}`);
				}
				if (!alive) return;
				shown.current = true;
				shownRef.current = true;
				gpu.setClearColor(1052172, 1);
				setTier(tierName);
				setSource(model.source);
				setStatus("ready");
				canvas.dataset.tier = tierName;
				canvas.dataset.source = model.source;
			};
			const present = async (url, tierName, timeoutMs, resetView) => {
				const model = url === PREVIEW_MODEL_URL ? await previewLoad : await loadGltf(url, (event) => applyProgress(event, false), timeoutMs);
				if (!alive) return;
				await showModel(model, tierName, resetView);
			};
			const paint = () => new Promise((resolve) => {
				window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
			});
			try {
				let previewShown = false;
				try {
					await present(PREVIEW_MODEL_URL, "preview", 25e3, true);
					previewShown = true;
				} catch (previewError) {
					if (!alive) return;
					const previewMessage = previewError instanceof Error ? previewError.message : "轻量模型没有载入";
					console.error("[书签尺] 占位预览失败", previewMessage);
					const fallbacks = [{
						url: FULL_MODEL_URL,
						tierName: "full",
						timeoutMs: 45e3
					}];
					let settled = false;
					let lastError = previewMessage;
					for (const item of fallbacks) try {
						await present(item.url, item.tierName, item.timeoutMs, true);
						settled = true;
						break;
					} catch (error) {
						if (!alive) return;
						lastError = error instanceof Error ? error.message : lastError;
					}
					if (!settled) {
						console.error("[书签尺] 全部模型都没有载入", {
							previewMessage,
							lastError
						});
						giveUp(`${previewMessage}。备用模型也失败了：${lastError}`);
					}
					return;
				}
				if (!previewShown || !alive) return;
				await paint();
				if (!alive) return;
				if (!phone) try {
					mountStudio();
				} catch (error) {
					console.error("[书签尺] 灯光环境延后", error);
				}
				if (phone) {
					setPhase("ready");
					canvas.dataset.phase = "ready";
					console.info("[书签尺] 手机端使用轻量模型");
					return;
				}
				await paint();
				if (!alive) return;
				await new Promise((resolve) => window.setTimeout(resolve, 240));
				if (!alive) return;
				setPhase("upgrade");
				canvas.dataset.phase = "upgrade";
				try {
					const full = await loadGltf(FULL_MODEL_URL, (event) => applyProgress(event, true), 45e3);
					if (!alive) return;
					try {
						adoptModel(full.gltf, false);
					} catch (error) {
						console.error("[书签尺] 完整模型放入场景失败", error);
						const cached = await loadGltf(PREVIEW_MODEL_URL, () => {}, 25e3);
						if (!alive) return;
						adoptModel(cached.gltf, false);
						setTier("preview");
						canvas.dataset.tier = "preview";
						throw error;
					}
					if (!alive) return;
					setTier("full");
					setSource(full.source);
					setUpgradeError("");
					setPhase("ready");
					canvas.dataset.tier = "full";
					canvas.dataset.source = full.source;
					canvas.dataset.phase = "ready";
					console.info("[书签尺] 完整模型已显示", {
						bytes: full.bytes,
						source: full.source
					});
				} catch (error) {
					if (!alive) return;
					console.error("[书签尺] 完整模型没有换上", error);
					setPhase("ready");
					canvas.dataset.phase = "ready";
					setUpgradeError(error instanceof Error ? error.message : "精细模型没有载入");
				}
			} finally {
				window.clearTimeout(watchdog);
				window.clearTimeout(stall);
			}
		};
		boot().catch((error) => {
			console.error("[书签尺] 加载中断", error);
			if (!alive) return;
			giveUp(error instanceof Error ? error.message : "加载中断");
		});
		return () => {
			alive = false;
			window.clearTimeout(stall);
			detachInput();
			window.clearTimeout(fiberTimer);
			dispose();
			apiRef.current = null;
		};
	}, [attempt]);
	(0, import_react.useEffect)(() => {
		const onChange = () => setNativeFs(document.fullscreenElement === stageRef.current);
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);
	const ready = status === "ready";
	const percent = total > 0 ? Math.min(100, Math.round(loaded / total * 100)) : null;
	const expanded = immersive || nativeFs;
	const phaseTitle = phase === "download" ? "正在下载模型" : phase === "decode" ? "正在解码模型" : "正在建立场景";
	const phaseNote = phase === "download" ? "正在获取书签尺文件。" : phase === "decode" ? "正在解开网格和纹理。" : "正在准备画面并放入模型。";
	const indeterminate = phase === "download" && loaded === 0;
	const retry = (url) => {
		invalidateModels(url);
		setStatus("loading");
		setPhase("scene");
		setLoaded(0);
		setTotal(0);
		setErrorText("");
		setUpgradeError("");
		setTier("");
		setSource("");
		setAttempt((n) => n + 1);
	};
	const selectView = (name) => {
		setView(name);
		setSpin(false);
		apiRef.current?.setSpin(false);
		apiRef.current?.go(name);
	};
	const toggleSpin = () => {
		const next = !spin;
		setSpin(next);
		apiRef.current?.setSpin(next);
	};
	const toggleRun = () => {
		const next = !running;
		setRunning(next);
		apiRef.current?.setRunning(next);
	};
	const selectLight = (id) => {
		setLight(id);
		apiRef.current?.setLight(id);
	};
	const toggleFull = async () => {
		const node = stageRef.current;
		if (!node) return;
		if (document.fullscreenElement) {
			await document.exitFullscreen();
			return;
		}
		if (immersive) {
			setImmersive(false);
			return;
		}
		try {
			await node.requestFullscreen();
		} catch {
			setImmersive(true);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		ref: stageRef,
		className: immersive ? "stage is-immersive" : "stage",
		"data-model-state": status,
		"data-load-phase": status === "error" ? "error" : phase,
		"data-model-tier": tier || "none",
		"data-load-source": source || "none",
		"data-light": light,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "stage-view",
			ref: viewRef,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vignette" }),
				status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "veil",
					role: "status",
					"aria-live": "polite",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "veil-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "veil-kicker",
								children: "Sanxingdui"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "veil-title",
								children: phaseTitle
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "veil-note",
								children: [
									phaseNote,
									loaded > 0 ? ` 已接收 ${formatMb(loaded)}` : "",
									phase === "download" && percent !== null ? ` · ${percent}%` : ""
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: indeterminate ? "bar is-wait" : "bar",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: indeterminate ? void 0 : phase === "download" && percent !== null ? `${percent}%` : "100%" } })
							})
						]
					})
				}) : null,
				status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "veil",
					role: "alert",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "veil-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "veil-kicker",
								children: "未能载入"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "veil-title",
								children: "模型没有显示出来"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "veil-note",
								children: "加载没有完成。下面是具体原因，可以重试。"
							}),
							errorText ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "err-detail",
								children: errorText
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "veil-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-btn solid",
									onClick: () => retry(),
									children: "重试"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									className: "text-btn",
									href: SHOWCASE_URL,
									target: "_blank",
									rel: "noreferrer",
									children: "打开在线预览"
								})]
							})
						]
					})
				}) : null,
				status === "ready" && phase === "upgrade" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "load-note",
					role: "status",
					children: [
						"正在换上完整模型",
						loaded > 0 ? ` · ${formatMb(loaded)}` : "",
						percent !== null ? ` · ${percent}%` : ""
					]
				}) : null,
				status === "ready" && upgradeError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "load-note",
					role: "alert",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["完整模型未换上：", upgradeError] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "text-btn",
						onClick: () => retry(FULL_MODEL_URL),
						children: "重试"
					})]
				}) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "dock",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dock-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "chip",
							"aria-pressed": view === "front" && !spin,
							disabled: !ready,
							onClick: () => selectView("front"),
							children: "正面"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "chip",
							"aria-pressed": view === "back" && !spin,
							disabled: !ready,
							onClick: () => selectView("back"),
							children: "背面"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "chip",
							"aria-pressed": view === "side" && !spin,
							disabled: !ready,
							onClick: () => selectView("side"),
							children: "侧面"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "chip",
							"aria-pressed": view === "tassel" && !spin,
							disabled: !ready,
							onClick: () => selectView("tassel"),
							children: "流苏"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "chip",
							"aria-pressed": view === "home" && !spin,
							disabled: !ready,
							onClick: () => selectView("home"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
								size: 16,
								strokeWidth: 1.75,
								"aria-hidden": "true"
							}), " 复位"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "chip",
							"aria-pressed": spin,
							disabled: !ready,
							onClick: toggleSpin,
							children: "自动旋转"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "chip",
							"aria-pressed": running,
							disabled: !ready,
							onClick: toggleRun,
							children: running ? "暂停重力" : "继续重力"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "chip",
							onClick: () => void toggleFull(),
							children: [expanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize2, {
								size: 16,
								strokeWidth: 1.75,
								"aria-hidden": "true"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize, {
								size: 16,
								strokeWidth: 1.75,
								"aria-hidden": "true"
							}), expanded ? "退出全屏" : "全屏"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dock-row light-row",
					role: "group",
					"aria-label": "灯光效果",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "dock-label",
						children: "灯光效果"
					}), LIGHTS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "chip",
						"aria-pressed": light === item.id,
						disabled: !ready,
						onClick: () => selectLight(item.id),
						children: item.label
					}, item.id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hint",
					children: "左右拖动看正反面，上下拖动把尺身放平 · 挂绳和流苏始终向下垂 · 右键挪动 · 滚轮放大"
				})
			]
		})]
	});
}
//#endregion
export { BookmarkStage };
