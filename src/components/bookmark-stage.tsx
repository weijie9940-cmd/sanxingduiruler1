import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize2, RotateCcw } from "lucide-react";
import {
  FULL_MODEL_URL,
  PREVIEW_MODEL_URL,
  SHOWCASE_URL,
  invalidateModels,
  loadGltf,
  type LoadProgress,
  type LoadedModel,
} from "@/lib/bookmark-model";

type ViewName = "home" | "front" | "back" | "side" | "tassel";
type Phase = "download" | "decode" | "scene" | "upgrade" | "ready";

type StageApi = {
  go: (view: ViewName) => void;
  setSpin: (on: boolean) => void;
  setRunning: (on: boolean) => void;
  setLight: (id: LightId) => void;
};

type GltfScene = LoadedModel["gltf"];

const VIEW_ANGLES: Record<ViewName, { az: number; el: number }> = {
  home: { az: 164, el: 5 },
  front: { az: 180, el: 2 },
  back: { az: 0, el: 2 },
  side: { az: 108, el: 4 },
  tassel: { az: 172, el: 12 },
};

type LightId = "standard" | "soft" | "warm" | "cool" | "drama";

type LampLook = {
  color: number;
  intensity: number;
  x: number;
  y: number;
  z: number;
};

type LightLook = {
  id: LightId;
  label: string;
  key: LampLook;
  fill: LampLook;
  rim: LampLook;
  graze: LampLook;
  exposure: number;
  env: number;
};

const LIGHTS: LightLook[] = [
  {
    id: "standard",
    label: "标准展示",
    key: { color: 0xfff3e6, intensity: 1.72, x: 1.25, y: 2.05, z: 1.7 },
    fill: { color: 0xd7e0ea, intensity: 0.46, x: -2.15, y: 1.05, z: -1.85 },
    rim: { color: 0xfff8f0, intensity: 0.66, x: -0.45, y: 2.35, z: -2.55 },
    graze: { color: 0xfff1e4, intensity: 0.34, x: 2.7, y: 0.22, z: 0.45 },
    exposure: 1,
    env: 0.58,
  },
  {
    id: "soft",
    label: "柔和棚拍",
    key: { color: 0xfff6ee, intensity: 1.28, x: 0.45, y: 1.7, z: 2.25 },
    fill: { color: 0xe7eef8, intensity: 1.05, x: -1.55, y: 1.15, z: 1.65 },
    rim: { color: 0xfff8f2, intensity: 0.36, x: -0.2, y: 2.1, z: -2.2 },
    graze: { color: 0xfff3e8, intensity: 0.16, x: 1.8, y: 0.45, z: 0.9 },
    exposure: 1.02,
    env: 0.86,
  },
  {
    id: "warm",
    label: "暖金质感",
    key: { color: 0xffb56a, intensity: 1.58, x: 1.35, y: 1.85, z: 1.65 },
    fill: { color: 0xf0c49a, intensity: 0.48, x: -1.45, y: 0.85, z: 1.25 },
    rim: { color: 0xffd0a4, intensity: 0.3, x: -0.35, y: 2.15, z: -2.35 },
    graze: { color: 0xffa15a, intensity: 0.22, x: 2.2, y: 0.4, z: 0.55 },
    exposure: 0.9,
    env: 0.36,
  },
  {
    id: "cool",
    label: "冷色釉彩",
    key: { color: 0xffe7c8, intensity: 1.46, x: 1.2, y: 1.9, z: 1.75 },
    fill: { color: 0x4f9ed6, intensity: 1.22, x: -1.25, y: 0.95, z: 1.75 },
    rim: { color: 0x7eb6e4, intensity: 0.85, x: -0.45, y: 2.35, z: -1.55 },
    graze: { color: 0xd7e6f4, intensity: 0.18, x: 2.15, y: 0.4, z: 0.85 },
    exposure: 1,
    env: 0.34,
  },
  {
    id: "drama",
    label: "戏剧聚光",
    key: { color: 0xfff1e2, intensity: 2.45, x: 2.35, y: 2.55, z: 0.85 },
    fill: { color: 0xd5deea, intensity: 0.42, x: -1.15, y: 0.75, z: 1.55 },
    rim: { color: 0xfff6ee, intensity: 0.9, x: -0.95, y: 2.65, z: -1.7 },
    graze: { color: 0xffe0c0, intensity: 0.62, x: 2.85, y: 0.7, z: 0.2 },
    exposure: 0.92,
    env: 0.32,
  },
];

const LIGHT_BY_ID: Record<LightId, LightLook> = {
  standard: LIGHTS[0],
  soft: LIGHTS[1],
  warm: LIGHTS[2],
  cool: LIGHTS[3],
  drama: LIGHTS[4],
};

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BookmarkStage() {
  const viewRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const apiRef = useRef<StageApi | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [phase, setPhase] = useState<Phase>("scene");
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorText, setErrorText] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [tier, setTier] = useState("");
  const [source, setSource] = useState("");
  const [view, setView] = useState<ViewName | "free">("home");
  const [spin, setSpin] = useState(false);
  const [running, setRunning] = useState(true);
  const [light, setLight] = useState<LightId>("standard");
  const [immersive, setImmersive] = useState(false);
  const [nativeFs, setNativeFs] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const shownRef = useRef(false);

  useEffect(() => {
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
    let renderer: import("three").WebGLRenderer | null = null;
    let dispose = () => {
      alive = false;
      window.clearTimeout(fiberTimer);
      window.clearTimeout(watchdog);
      renderer?.setAnimationLoop(null);
      renderer?.dispose();
      canvas.remove();
    };

    const giveUp = (message: string) => {
      if (!alive || shownRef.current) return;
      setErrorText(message);
      setPhase("ready");
      setStatus("error");
    };

    const stall = window.setTimeout(() => {
      giveUp("加载超时，没有进入可查看的画面。");
    }, 28000);

    const boot = async () => {
      const THREE = await import("three");
      const [{ OrbitControls }, { threadHangingCord }] = await Promise.all([
        import("three/addons/controls/OrbitControls.js"),
        import("@/lib/thread-cord"),
      ]);
      if (!alive) return;

      const phone =
        window.matchMedia("(max-width: 900px)").matches ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 1100);

      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: !phone,
          alpha: true,
          powerPreference: phone ? "default" : "high-performance",
          failIfMajorPerformanceCaveat: false,
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
      }, 25000);

      const onLost = (event: Event) => {
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
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.008, 40);
      camera.near = 0.001;
      camera.far = 80;
      camera.position.set(0, 0.2, 1.2);

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.panSpeed = 0.95;
      controls.rotateSpeed = 0.72;
      controls.zoomSpeed = 1.15;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.85;
      controls.minPolarAngle = 0.01;
      controls.maxPolarAngle = Math.PI - 0.01;
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      controls.enableRotate = false;
      controls.mouseButtons.LEFT = null;
      controls.touches.ONE = null;
      controls.touches.TWO = 2;
      controls.target.set(0, 0, 0);
      canvas.style.cursor = "grab";

      let pmrem: import("three").PMREMGenerator | null = null;
      let env: import("three").WebGLRenderTarget | null = null;
      let envNow = 0.58;
      const mountStudio = () => {
        if (!alive || env) return;
        const generator = new THREE.PMREMGenerator(gpu);
        pmrem = generator;
        const studio = new THREE.Scene();
        const disposables: { dispose: () => void }[] = [];
        const keep = <T extends { dispose: () => void }>(resource: T) => {
          disposables.push(resource);
          return resource;
        };
        const shell = new THREE.Mesh(
          keep(new THREE.SphereGeometry(16, 24, 16)),
          keep(new THREE.MeshBasicMaterial({ color: 0x12100e, side: THREE.BackSide })),
        );
        studio.add(shell);
        const bounce = new THREE.Mesh(
          keep(new THREE.CircleGeometry(9, 20)),
          keep(new THREE.MeshBasicMaterial({ color: 0x2a221b })),
        );
        bounce.rotation.x = -Math.PI / 2;
        bounce.position.y = -5.5;
        studio.add(bounce);
        const softbox = (
          color: number,
          intensity: number,
          width: number,
          height: number,
          x: number,
          y: number,
          z: number,
        ) => {
          const mesh = new THREE.Mesh(
            keep(new THREE.PlaneGeometry(width, height)),
            keep(
              new THREE.MeshStandardMaterial({
                color: 0x000000,
                emissive: color,
                emissiveIntensity: intensity,
                roughness: 1,
                metalness: 0,
                side: THREE.DoubleSide,
              }),
            ),
          );
          mesh.position.set(x, y, z);
          mesh.lookAt(0, 0.2, 0);
          studio.add(mesh);
        };
        softbox(0xfff2e4, 12, 8.4, 5.6, 3.6, 6.8, 6.2);
        softbox(0xd5dee8, 4.6, 6.4, 4.4, -6.2, 3.2, -5.4);
        softbox(0xfff6ec, 8, 2.6, 7.6, -1.4, 6.2, -8.2);
        softbox(0xf6eadc, 4, 7.2, 1.8, 8.2, 0.35, 0.8);
        softbox(0xc5d0db, 2.6, 5.2, 2.2, -7.4, 0.15, 2.6);
        env = generator.fromScene(studio, 0.11, 0.08, 40, { size: 256 });
        scene.environment = env.texture;
        scene.environmentIntensity = envNow;
        for (const resource of disposables) resource.dispose();
        studio.clear();
      };

      const key = new THREE.DirectionalLight(0xfff3e6, 1.72);
      key.position.set(1.25, 2.05, 1.7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xd7e0ea, 0.46);
      fill.position.set(-2.15, 1.05, -1.85);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xfff8f0, 0.66);
      rim.position.set(-0.45, 2.35, -2.55);
      scene.add(rim);
      const graze = new THREE.DirectionalLight(0xfff1e4, 0.34);
      graze.position.set(2.7, 0.22, 0.45);
      scene.add(graze);
      scene.environmentIntensity = envNow;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      type Rig = {
        lamp: import("three").DirectionalLight;
        color: import("three").Color;
        pos: import("three").Vector3;
        tColor: import("three").Color;
        tPos: import("three").Vector3;
        intensity: number;
        tIntensity: number;
      };
      const makeRig = (lamp: import("three").DirectionalLight): Rig => ({
        lamp,
        color: lamp.color.clone(),
        pos: lamp.position.clone(),
        tColor: lamp.color.clone(),
        tPos: lamp.position.clone(),
        intensity: lamp.intensity,
        tIntensity: lamp.intensity,
      });
      const rigs = [makeRig(key), makeRig(fill), makeRig(rim), makeRig(graze)];
      const lampKeys = ["key", "fill", "rim", "graze"] as const;
      let exposureNow = 1;
      let targetExposure = 1;
      let targetEnv = 0.58;
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

      const seekLight = (id: LightId, instant: boolean) => {
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

      const blendLight = (dt: number) => {
        if (!blending) return;
        const rate = 1 - Math.exp(-dt / 0.22);
        let pending = false;
        for (const rig of rigs) {
          rig.color.lerp(rig.tColor, rate);
          rig.lamp.color.copy(rig.color);
          rig.intensity += (rig.tIntensity - rig.intensity) * rate;
          rig.lamp.intensity = rig.intensity;
          rig.pos.lerp(rig.tPos, rate);
          rig.lamp.position.copy(rig.pos);
          if (Math.abs(rig.intensity - rig.tIntensity) > 0.012) pending = true;
          if (rig.pos.distanceToSquared(rig.tPos) > 1e-5) pending = true;
          const color = rig.color;
          const target = rig.tColor;
          if (Math.abs(color.r - target.r) + Math.abs(color.g - target.g) + Math.abs(color.b - target.b) > 0.02) {
            pending = true;
          }
        }
        exposureNow += (targetExposure - exposureNow) * rate;
        gpu.toneMappingExposure = exposureNow;
        envNow += (targetEnv - envNow) * rate;
        scene.environmentIntensity = envNow;
        if (
          pending ||
          Math.abs(exposureNow - targetExposure) > 0.012 ||
          Math.abs(envNow - targetEnv) > 0.012
        ) {
          return;
        }
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
      let anim: { t: number; dur: number } | null = null;
      let spinOn = false;
      let panLimit = 0.35;
      const restCenter = new THREE.Vector3();
      let running = !reduceMotion;
      let accumulator = 0;
      const GUIDES = 12;
      const guides = Array.from({ length: GUIDES }, () => ({ a: 0 }));
      const guideData = new Float32Array(GUIDES);
      const angleUniform = { value: 0 };
      const guideUniform = { value: guideData };
      let rulerSpin: import("three").Group | null = null;
      let activePivot: import("three").Group | null = null;
      let holeAnchor: import("three").Object3D | null = null;
      let hanger: import("three").Group | null = null;
      let tasselRoot: import("three").Group | null = null;
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
      let rotAnim: { t: number; dur: number } | null = null;
      let dragging = false;
      const pointers = new Set<number>();
      const inertia = { x: 0, y: 0 };
      let lastX = 0;
      let lastY = 0;
      const soft: {
        mesh: import("three").Mesh;
        material: import("three").Material;
        mode: "cord" | "fiber";
      }[] = [];

      const tumble = (dx: number, dy: number) => {
        if (!rulerSpin) return;
        camera.updateMatrixWorld();
        camRight.setFromMatrixColumn(camera.matrixWorld, 2);
        if (camRight.lengthSq() < 1e-8) camRight.set(0, 0, 1);
        camRight.normalize();
        qYaw.setFromAxisAngle(worldUp, -dx * 0.0062);
        qPitch.setFromAxisAngle(camRight, dy * 0.0062);
        rulerSpin.quaternion.premultiply(qPitch).premultiply(qYaw);
      };

      const orientTarget = (name: ViewName) => {
        qTo.identity();
        if (name === "back") qTo.setFromAxisAngle(worldUp, Math.PI);
        else if (name === "side") qTo.setFromAxisAngle(worldUp, Math.PI / 2);
      };

      const orientTo = (name: ViewName, instant: boolean) => {
        orientTarget(name);
        if (!rulerSpin) return;
        if (instant || reduceMotion) {
          rulerSpin.quaternion.copy(qTo);
          rotAnim = null;
          return;
        }
        qFrom.copy(rulerSpin.quaternion);
        rotAnim = { t: 0, dur: 0.78 };
      };

      const onPointerDown = (event: PointerEvent) => {
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

      const onPointerMove = (event: PointerEvent) => {
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

      const endDrag = (event: PointerEvent) => {
        pointers.delete(event.pointerId);
        if (pointers.size > 0) {
          dragging = false;
          return;
        }
        dragging = false;
        canvas.style.cursor = "grab";
      };

      const onContextMenu = (event: Event) => event.preventDefault();
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

      const frameDistance = (direction: import("three").Vector3) => {
        box.getCenter(center);
        const fov = (camera.fov * Math.PI) / 180;
        const fill = 0.78;
        const tanV = Math.tan(fov / 2) * fill;
        const tanH = tanV * Math.max(camera.aspect, 0.2);
        const up = Math.abs(direction.y) > 0.92 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
        zAxis.copy(direction).normalize();
        xAxis.crossVectors(up, zAxis);
        if (xAxis.lengthSq() < 1e-8) xAxis.crossVectors(new THREE.Vector3(1, 0, 0), zAxis);
        xAxis.normalize();
        yAxis.crossVectors(zAxis, xAxis).normalize();

        let dist = 0.05;
        const xs = [box.min.x, box.max.x];
        const ys = [box.min.y, box.max.y];
        const zs = [box.min.z, box.max.z];
        for (const x of xs) {
          for (const y of ys) {
            for (const z of zs) {
              corner.set(x, y, z);
              offset.copy(corner).sub(center);
              const dx = offset.dot(xAxis);
              const dy = offset.dot(yAxis);
              const dz = offset.dot(zAxis);
              const need = Math.max(dz + Math.abs(dx) / tanH, dz + Math.abs(dy) / tanV);
              if (need > dist) dist = need;
            }
          }
        }
        return dist * 1.04;
      };

      const directionFor = (name: ViewName) => {
        const { az, el } = VIEW_ANGLES[name];
        const ayr = (az * Math.PI) / 180;
        const elr = (el * Math.PI) / 180;
        return dir.set(
          Math.sin(ayr) * Math.cos(elr),
          Math.sin(elr),
          -Math.cos(ayr) * Math.cos(elr),
        );
      };

      let currentView: ViewName = "home";

      const fromTarget = new THREE.Vector3();
      const toTarget = new THREE.Vector3();
      let frameDist = 0.5;

      const place = (name: ViewName, instant: boolean) => {
        if (!fitted) return;
        currentView = name;
        userMoved = false;
        directionFor(name);
        const dist = frameDistance(dir);
        if (name !== "tassel") frameDist = dist;
        const look = center.clone();
        if (name === "tassel") look.y = box.min.y + 0.04;
        const distance = name === "tassel" ? frameDist * 0.28 : dist;
        toPos.copy(look).addScaledVector(dir, distance);
        toTarget.copy(look);
        controls.minDistance = Math.max(0.018, frameDist * 0.055);
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
        anim = { t: 0, dur: 0.72 };
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
        const dt = Math.min(Math.max(0, (now - lastTick) / 1000), 0.05);
        lastTick = now;
        blendLight(dt);
        if (anim) {
          anim.t += dt;
          const k = Math.min(1, anim.t / anim.dur);
          const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          camera.position.lerpVectors(fromPos, toPos, eased);
          controls.target.lerpVectors(fromTarget, toTarget, eased);
          if (k >= 1) anim = null;
        }
        if (rotAnim && rulerSpin) {
          rotAnim.t += dt;
          const k = Math.min(1, rotAnim.t / rotAnim.dur);
          const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          rulerSpin.quaternion.copy(qFrom).slerp(qTo, eased);
          if (k >= 1) rotAnim = null;
        }
        if (!dragging && rulerSpin && (inertia.x !== 0 || inertia.y !== 0)) {
          tumble(inertia.x * 0.35, inertia.y * 0.35);
          const decay = Math.exp(-9 * dt);
          inertia.x *= decay;
          inertia.y *= decay;
          if (Math.hypot(inertia.x, inertia.y) < 0.12) inertia.x = inertia.y = 0;
        }
        if (spinOn && rulerSpin && !dragging && !rotAnim) {
          qYaw.setFromAxisAngle(worldUp, dt * 0.42);
          rulerSpin.quaternion.premultiply(qYaw);
        }
        if (holeAnchor && hanger && tasselRoot) {
          holeAnchor.getWorldPosition(holeNow);
          if (!holeReady || dt >= 0.08) {
            holePrev.copy(holeNow);
            holeVel.set(0, 0, 0);
            holeReady = true;
          } else {
            holeVel.copy(holeNow).sub(holePrev).multiplyScalar(1 / Math.max(dt, 1e-4));
            holePrev.copy(holeNow);
            if (holeVel.length() > 1.35) holeVel.setLength(1.35);
          }
          const simulate = running && !reduceMotion;
          if (simulate) {
            accumulator += dt;
            let steps = 0;
            const step = 1 / 60;
            while (accumulator >= step && steps < 4) {
              desired.set(-holeVel.x * 0.58, -1, -holeVel.z * 0.58).normalize();
              const follow = 1 - Math.exp(-6.2 * step);
              hangDir.lerp(desired, follow).normalize();
              const align = THREE.MathUtils.clamp(hangDir.dot(down), -1, 1);
              const angle = Math.acos(align);
              const maxAngle = 0.58;
              if (angle > maxAngle) {
                hangDir.lerp(down, (angle - maxAngle) / Math.max(angle, 1e-4)).normalize();
              }
              for (let i = 0; i < GUIDES; i++) {
                const wobble = ((i % 5) - 2) * 0.08;
                const target = THREE.MathUtils.clamp(
                  hangDir.x * (0.42 + (i % 4) * 0.06) + hangDir.z * wobble,
                  -0.07,
                  0.07,
                );
                const rate = 4.2 + (i % 4) * 1.15;
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
          angleUniform.value = THREE.MathUtils.clamp(hangDir.x * 0.2 + hangDir.z * 0.05, -0.04, 0.04);
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
        },
      };

      releaseModel = () => {
        window.clearTimeout(fiberTimer);
        for (const item of soft) item.material.dispose();
        soft.length = 0;
        if (activePivot) {
          activePivot.traverse((child) => {
            const mesh = child as import("three").Mesh;
            const geometry = mesh.geometry as import("three").BufferGeometry | undefined;
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

      const adoptModel = (gltf: GltfScene, resetView: boolean) => {
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
        const raw = new THREE.Box3().setFromObject(upright);
        const rawCenter = raw.getCenter(new THREE.Vector3());
        pivot.position.copy(rawCenter).multiplyScalar(-1);
        pivot.updateWorldMatrix(true, true);

        const rulerNode = model.children.find((child) => child.name.startsWith("Ruler"));
        const rulerBox = new THREE.Box3().setFromObject(rulerNode ?? upright);
        const rulerCenter = rulerBox.getCenter(new THREE.Vector3());
        rulerSpin = new THREE.Group();
        rulerSpin.name = "ruler-spin";
        pivot.add(rulerSpin);
        rulerSpin.position.copy(rulerCenter);
        pivot.worldToLocal(rulerSpin.position);
        rulerSpin.attach(upright);

        const isHanging = (name: string) =>
          /^(Cord|Connector|Metal_Cap|Red_Bead|Yellow_Ornament|Tassel_)/.test(name);
        const hanging = model.children.filter((child) => isHanging(child.name));
        const cord = hanging.find((child) => child.name.startsWith("Cord") && !child.name.includes("Braid"));
        const braid = hanging.find((child) => child.name.includes("Braid"));

        const worldSamples = (object: import("three").Object3D, budget: number) => {
          const points: import("three").Vector3[] = [];
          object.updateWorldMatrix(true, true);
          object.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
            const attr = mesh.geometry.attributes.position;
            const step = Math.max(1, Math.floor(attr.count / budget));
            for (let i = 0; i < attr.count; i += step) {
              points.push(mesh.localToWorld(new THREE.Vector3(attr.getX(i), attr.getY(i), attr.getZ(i))));
            }
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
        const nearCord = cordPoints.filter((_, index) => gaps[index] <= nearest + 0.0015);
        const joint = model.userData.cordJoint as import("three").Vector3 | undefined;
        const anchor = new THREE.Vector3();
        if (joint) {
          anchor.copy(joint);
        } else if (nearCord.length) {
          for (const point of nearCord) anchor.add(point);
          anchor.multiplyScalar(1 / nearCord.length);
        } else {
          const fallback = new THREE.Box3().setFromObject(cord ?? hanging[0] ?? upright);
          anchor.set(
            (fallback.min.x + fallback.max.x) / 2,
            fallback.max.y,
            (fallback.min.z + fallback.max.z) / 2,
          );
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
        let cordSpan: { z0: number; len: number } | null = null;
        if (cordNode) {
          const probe = new THREE.Box3();
          cordNode.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh) return;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            if (mesh.geometry.boundingBox) probe.union(mesh.geometry.boundingBox);
          });
          if (!probe.isEmpty()) cordSpan = { z0: probe.max.z, len: Math.max(probe.max.z - probe.min.z, 1e-4) };
        }

        const tagFibers = (geometry: import("three").BufferGeometry) => {
          const position = geometry.attributes.position;
          const index = geometry.index;
          if (!position || !index || geometry.getAttribute("aAlong")) return;
          const count = position.count;
          const parent = new Int32Array(count);
          for (let i = 0; i < count; i++) parent[i] = i;
          const find = (x: number) => {
            let root = x;
            while (parent[root] !== root) root = parent[root];
            while (parent[x] !== root) {
              const next = parent[x];
              parent[x] = root;
              x = next;
            }
            return root;
          };
          const unite = (a: number, b: number) => {
            const ra = find(a);
            const rb = find(b);
            if (ra !== rb) parent[rb] = ra;
          };
          const ids = index.array;
          for (let i = 0; i < ids.length; i += 3) {
            unite(ids[i], ids[i + 1]);
            unite(ids[i], ids[i + 2]);
          }
          const compact = new Map<number, number>();
          const strand = new Int32Array(count);
          let strands = 0;
          for (let i = 0; i < count; i++) {
            const root = find(i);
            let id = compact.get(root);
            if (id === undefined) {
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
            if (position.getZ(i) > zMax[id] - span * 0.18) {
              rootX[id] += position.getX(i);
              rootN[id] += 1;
            }
          }
          let minX = Infinity;
          let maxX = -Infinity;
          for (let id = 0; id < strands; id++) {
            if (!rootN[id]) continue;
            rootX[id] /= rootN[id];
            if (zMax[id] - zMin[id] < 0.012) continue;
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
            if (span >= 0.012 && z <= zMin[id] + span * 0.12) {
              tipX[id] += x;
              tipY[id] += y;
              tipZ[id] += z;
              tipN[id] += 1;
            }
          }
          const big: number[] = [];
          for (let id = 0; id < strands; id++) {
            if (tipN[id]) {
              tipX[id] /= tipN[id];
              tipY[id] /= tipN[id];
              tipZ[id] /= tipN[id];
              big.push(id);
            }
          }
          const owner = new Int32Array(strands);
          for (let id = 0; id < strands; id++) owner[id] = id;
          for (let id = 0; id < strands; id++) {
            if (zMax[id] - zMin[id] >= 0.012 || !big.length || !cn[id]) continue;
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
            const long = zMax[id] - zMin[id] >= 0.012;
            along[i] = long ? THREE.MathUtils.clamp((zMax[id] - position.getZ(i)) / span, 0, 1) : 1;
            guide[i] = THREE.MathUtils.clamp((rootX[source] - minX) / spanX, 0, 0.999);
            seed[i] = seeds[source];
          }
          geometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
          geometry.setAttribute("aGuide", new THREE.BufferAttribute(guide, 1));
          geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
        };

        const bindSoft = (
          object: import("three").Object3D | undefined,
          mode: "cord" | "fiber",
          softness = 1,
          lift = 0,
        ) => {
          if (!object) return;
          object.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh || !mesh.geometry) return;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const bounds = mesh.geometry.boundingBox;
            if (!bounds) return;
            if (mode === "fiber") tagFibers(mesh.geometry);
            const z0 = mode === "cord" && cordSpan ? cordSpan.z0 : bounds.max.z;
            const len = mode === "cord" && cordSpan ? cordSpan.len : Math.max(bounds.max.z - bounds.min.z, 1e-4);
            const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const clones = sources.map((material) => {
              const clone = material.clone();
              const key = `soft-${mode}-${soft.length}`;
              clone.onBeforeCompile = (shader) => {
                shader.uniforms.uAngle = angleUniform;
                shader.uniforms.uGuide = guideUniform;
                shader.uniforms.uSoft = { value: softness };
                shader.uniforms.uLift = { value: lift };
                shader.uniforms.uZ0 = { value: z0 };
                shader.uniforms.uLen = { value: len };
                shader.vertexShader =
                  (mode === "fiber"
                    ? "attribute float aAlong;\nattribute float aGuide;\nattribute float aSeed;\nuniform float uGuide[12];\nuniform float uLen;\nuniform float uSoft;\nuniform float uLift;\n"
                    : "uniform float uAngle;\nuniform float uSoft;\nuniform float uZ0;\nuniform float uLen;\n") +
                  shader.vertexShader.replace("#include <begin_vertex>", mode === "cord" ? cordBend : fiberBend);
              };
              clone.customProgramCacheKey = () => key;
              soft.push({ mesh, material: clone, mode });
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
        panLimit = Math.max(span.x, span.y, span.z) * 0.72;
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
          controls.minDistance = Math.max(0.018, frameDist * 0.055);
          controls.maxDistance = frameDist * 3.4;
          controls.update();
        } else {
          place(resetView ? "home" : savedView, true);
        }

        const tuneResponse = (root: import("three").Object3D) => {
          root.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh) return;
            const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const entry of list) {
              const material = entry as import("three").MeshPhysicalMaterial;
              if (!material || !("roughness" in material)) continue;
              const name = material.name;
              const silk =
                name.includes("silk") || name.includes("woven teal") || name.includes("braid highlight");
              const metal =
                name.includes("antique gold") ||
                name.includes("bright gold") ||
                name.includes("Antique brass") ||
                name.includes("satin edge");
              const jewel =
                name.includes("glass bead") || name.includes("amber") || name.includes("turquoise cap");
              if (silk) {
                if (name.includes("silk teal light")) material.roughness = 0.58;
                else if (name.includes("silk teal shade")) material.roughness = 0.64;
                else if (name.includes("silk teal")) material.roughness = 0.6;
                else if (name.includes("braid highlight")) material.roughness = 0.52;
                else material.roughness = 0.56;
                material.envMapIntensity = 0.36;
                if ("specularIntensity" in material) material.specularIntensity = 0.32;
                if ("sheen" in material) {
                  material.sheen = 0.32;
                  material.sheenRoughness = 0.6;
                  if (name.includes("light") || name.includes("braid")) material.sheenColor.setRGB(0.3, 0.64, 0.58);
                  else if (name.includes("shade")) material.sheenColor.setRGB(0.07, 0.26, 0.24);
                  else material.sheenColor.setRGB(0.12, 0.38, 0.36);
                }
              } else if (metal) {
                material.roughness = name.includes("bright gold") ? 0.34 : 0.36;
                material.envMapIntensity = 1.2;
              } else if (name.startsWith("Front") || name.startsWith("Back")) {
                material.metalness = 0.05;
                material.roughness = 0.58;
                material.envMapIntensity = 0.2;
              } else if (name.includes("enamel") || name.includes("vermilion") || name.includes("Comet tail")) {
                material.envMapIntensity = 0.28;
              } else if (jewel) {
                material.roughness = Math.max(material.roughness, 0.26);
                material.envMapIntensity = 0.82;
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
              if (node.name.startsWith("Tassel_Fiber") || node.name.startsWith("Tassel_Fibers")) {
                bindSoft(
                  node,
                  "fiber",
                  node.name.includes("Flyaway") ? 0.2 : 1,
                  node.name.includes("Flyaway") ? 0.005 : 0,
                );
              }
            });
          } catch (error) {
            console.warn(error);
          }
        }, 48);
      };

      const applyProgress = (event: LoadProgress, background: boolean) => {
        if (!alive) return;
        setSource(event.source);
        canvas.dataset.source = event.source;
        setLoaded(event.loaded);
        setTotal(event.total);
        setPhase(background ? "upgrade" : event.phase);
        canvas.dataset.phase = background ? "upgrade" : event.phase;
      };

      const shown = { current: false };

      const showModel = async (model: LoadedModel, tierName: string, resetView: boolean) => {
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
        gpu.setClearColor(0x100e0c, 1);
        setTier(tierName);
        setSource(model.source);
        setStatus("ready");
        canvas.dataset.tier = tierName;
        canvas.dataset.source = model.source;
      };

      const present = async (url: string, tierName: string, timeoutMs: number, resetView: boolean) => {
        const model =
          url === PREVIEW_MODEL_URL
            ? await previewLoad
            : await loadGltf(url, (event) => applyProgress(event, false), timeoutMs);
        if (!alive) return;
        await showModel(model, tierName, resetView);
      };

      const paint = () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
        });

      try {
        let previewShown = false;
        try {
          await present(PREVIEW_MODEL_URL, "preview", 25000, true);
          previewShown = true;
        } catch (previewError) {
          if (!alive) return;
          const previewMessage = previewError instanceof Error ? previewError.message : "轻量模型没有载入";
          console.error("[书签尺] 占位预览失败", previewMessage);
          const fallbacks: { url: string; tierName: string; timeoutMs: number }[] = [
            { url: FULL_MODEL_URL, tierName: "full", timeoutMs: 45000 },
          ];
          let settled = false;
          let lastError = previewMessage;
          for (const item of fallbacks) {
            try {
              await present(item.url, item.tierName, item.timeoutMs, true);
              settled = true;
              break;
            } catch (error) {
              if (!alive) return;
              lastError = error instanceof Error ? error.message : lastError;
            }
          }
          if (!settled) {
            console.error("[书签尺] 全部模型都没有载入", { previewMessage, lastError });
            giveUp(`${previewMessage}。备用模型也失败了：${lastError}`);
          }
          return;
        }

        if (!previewShown || !alive) return;
        await paint();
        if (!alive) return;
        if (!phone) {
          try {
            mountStudio();
          } catch (error) {
            console.error("[书签尺] 灯光环境延后", error);
          }
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
          const full = await loadGltf(FULL_MODEL_URL, (event) => applyProgress(event, true), 45000);
          if (!alive) return;
          try {
            adoptModel(full.gltf, false);
          } catch (error) {
            console.error("[书签尺] 完整模型放入场景失败", error);
            const cached = await loadGltf(PREVIEW_MODEL_URL, () => {}, 25000);
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
          console.info("[书签尺] 完整模型已显示", { bytes: full.bytes, source: full.source });
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

    void boot().catch((error) => {
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

  useEffect(() => {
    const onChange = () => setNativeFs(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const ready = status === "ready";
  const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;
  const expanded = immersive || nativeFs;
  const phaseTitle =
    phase === "download" ? "正在下载模型" : phase === "decode" ? "正在解码模型" : "正在建立场景";
  const phaseNote =
    phase === "download"
      ? "正在获取书签尺文件。"
      : phase === "decode"
        ? "正在解开网格和纹理。"
        : "正在准备画面并放入模型。";
  const indeterminate = phase === "download" && loaded === 0;

  const retry = (url?: string) => {
    void invalidateModels(url);
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

  const selectView = (name: ViewName) => {
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

  const selectLight = (id: LightId) => {
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

  return (
    <section
      ref={stageRef}
      className={immersive ? "stage is-immersive" : "stage"}
      data-model-state={status}
      data-load-phase={status === "error" ? "error" : phase}
      data-model-tier={tier || "none"}
      data-load-source={source || "none"}
      data-light={light}
    >
      <div className="stage-view" ref={viewRef}>
        <div className="vignette" />
        {status === "loading" ? (
          <div className="veil" role="status" aria-live="polite">
            <div className="veil-card">
              <p className="veil-kicker">Sanxingdui</p>
              <h2 className="veil-title">{phaseTitle}</h2>
              <p className="veil-note">
                {phaseNote}
                {loaded > 0 ? ` 已接收 ${formatMb(loaded)}` : ""}
                {phase === "download" && percent !== null ? ` · ${percent}%` : ""}
              </p>
              <div className={indeterminate ? "bar is-wait" : "bar"}>
                <span
                  style={{
                    width: indeterminate ? undefined : phase === "download" && percent !== null ? `${percent}%` : "100%",
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="veil" role="alert">
            <div className="veil-card">
              <p className="veil-kicker">未能载入</p>
              <h2 className="veil-title">模型没有显示出来</h2>
              <p className="veil-note">加载没有完成。下面是具体原因，可以重试。</p>
              {errorText ? <p className="err-detail">{errorText}</p> : null}
              <div className="veil-actions">
                <button type="button" className="text-btn solid" onClick={() => retry()}>
                  重试
                </button>
                <a className="text-btn" href={SHOWCASE_URL} target="_blank" rel="noreferrer">
                  打开在线预览
                </a>
              </div>
            </div>
          </div>
        ) : null}
        {status === "ready" && phase === "upgrade" ? (
          <div className="load-note" role="status">
            正在换上完整模型
            {loaded > 0 ? ` · ${formatMb(loaded)}` : ""}
            {percent !== null ? ` · ${percent}%` : ""}
          </div>
        ) : null}
        {status === "ready" && upgradeError ? (
          <div className="load-note" role="alert">
            <span>完整模型未换上：{upgradeError}</span>
            <button type="button" className="text-btn" onClick={() => retry(FULL_MODEL_URL)}>
              重试
            </button>
          </div>
        ) : null}
      </div>
      <div className="dock">
        <div className="dock-row">
          <button type="button" className="chip" aria-pressed={view === "front" && !spin} disabled={!ready} onClick={() => selectView("front")}>
            正面
          </button>
          <button type="button" className="chip" aria-pressed={view === "back" && !spin} disabled={!ready} onClick={() => selectView("back")}>
            背面
          </button>
          <button type="button" className="chip" aria-pressed={view === "side" && !spin} disabled={!ready} onClick={() => selectView("side")}>
            侧面
          </button>
          <button type="button" className="chip" aria-pressed={view === "tassel" && !spin} disabled={!ready} onClick={() => selectView("tassel")}>
            流苏
          </button>
          <button type="button" className="chip" aria-pressed={view === "home" && !spin} disabled={!ready} onClick={() => selectView("home")}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /> 复位
          </button>
          <button type="button" className="chip" aria-pressed={spin} disabled={!ready} onClick={toggleSpin}>
            自动旋转
          </button>
          <button type="button" className="chip" aria-pressed={running} disabled={!ready} onClick={toggleRun}>
            {running ? "暂停重力" : "继续重力"}
          </button>
          <button type="button" className="chip" onClick={() => void toggleFull()}>
            {expanded ? <Minimize2 size={16} strokeWidth={1.75} aria-hidden="true" /> : <Maximize size={16} strokeWidth={1.75} aria-hidden="true" />}
            {expanded ? "退出全屏" : "全屏"}
          </button>
        </div>
        <div className="dock-row light-row" role="group" aria-label="灯光效果">
          <span className="dock-label">灯光效果</span>
          {LIGHTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={light === item.id}
              disabled={!ready}
              onClick={() => selectLight(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="hint">左右拖动看正反面，上下拖动把尺身放平 · 挂绳和流苏始终向下垂 · 右键挪动 · 滚轮放大</p>
      </div>
    </section>
  );
}
