import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export const MODEL_REV = "2";
export const PREVIEW_MODEL_URL = `/bookmark.preview.glb?v=${MODEL_REV}`;
export const FULL_MODEL_URL = `/bookmark.full.glb?v=${MODEL_REV}`;
export const ORIGINAL_MODEL_URL = `/bookmark.glb?v=${MODEL_REV}`;
export const REMOTE_MODEL_URL =
  "https://present-beacon-ewjc.here.now/decorative_bookmark_ruler_tassel.glb";
export const SHOWCASE_URL = "https://present-beacon-ewjc.here.now/";

const CACHE_NAME = "bookmark-models-v2";

export type LoadSource = "network" | "cache";

export type LoadProgress = {
  phase: "download" | "decode";
  loaded: number;
  total: number;
  source: LoadSource;
};

export type LoadedModel = {
  gltf: GLTF;
  bytes: number;
  source: LoadSource;
};

const memory = new Map<string, { promise: Promise<LoadedModel>; ready: boolean }>();
const listeners = new Map<string, Set<(progress: LoadProgress) => void>>();

function emit(url: string, progress: LoadProgress) {
  const set = listeners.get(url);
  if (!set) return;
  for (const listener of set) listener(progress);
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("未知错误");
}

function stageError(stage: "下载" | "解码", error: unknown) {
  const message = asError(error).message;
  if (message.startsWith("下载：") || message.startsWith("解码：")) return new Error(message);
  return new Error(`${stage}：${message}`);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function absoluteUrl(url: string) {
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.href).href;
}

async function readCache(url: string) {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(absoluteUrl(url));
    if (!hit) return null;
    const buffer = await hit.arrayBuffer();
    return buffer.byteLength > 20 ? buffer : null;
  } catch {
    return null;
  }
}

async function writeCache(url: string, buffer: ArrayBuffer) {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      absoluteUrl(url),
      new Response(buffer.slice(0), {
        headers: {
          "Content-Type": "model/gltf-binary",
          "Content-Length": String(buffer.byteLength),
        },
      }),
    );
  } catch {
    // Cache Storage can be unavailable in private browsing.
  }
}

export async function invalidateModels(url?: string) {
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
  } catch {
    // Ignore cache cleanup failures; the next fetch still goes to the network.
  }
}

async function fetchBuffer(
  url: string,
  timeoutMs: number,
  onProgress: (progress: LoadProgress) => void,
) {
  const cached = await readCache(url);
  if (cached) {
    onProgress({ phase: "download", loaded: cached.byteLength, total: cached.byteLength, source: "cache" });
    return { buffer: cached, source: "cache" as const };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let lastByte = Date.now();
  const stall = setInterval(() => {
    if (Date.now() - lastByte > 15000) controller.abort();
  }, 1000);

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("下载超时，或连接长时间没有数据");
      }
      throw new Error("网络或跨域被拒绝");
    }
    if (!response.ok || !response.body) {
      const message =
        response.status === 404 ? "找不到模型文件（HTTP 404）" : `服务器返回 HTTP ${response.status}`;
      console.error("[书签尺] 下载失败", { url, status: response.status, message });
      throw new Error(message);
    }

    const total = Number(response.headers.get("content-length") || 0);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      loaded += value.byteLength;
      lastByte = Date.now();
      onProgress({ phase: "download", loaded, total, source: "network" });
    }

    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    if (bytes.byteLength < 20) throw new Error("文件过小，不是完整模型");
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== "glTF") throw new Error("文件内容不是 GLB 模型");
    const buffer = bytes.buffer;
    await writeCache(url, buffer);
    return { buffer, source: "network" as const };
  } finally {
    clearTimeout(timer);
    clearInterval(stall);
  }
}

let parserPromise: Promise<(buffer: ArrayBuffer) => Promise<GLTF>> | null = null;

function getParser() {
  if (!parserPromise) {
    parserPromise = (async () => {
      const [{ GLTFLoader }, decoderMod] = await Promise.all([
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/libs/meshopt_decoder.module.js"),
      ]);
      const decoder = decoderMod.MeshoptDecoder as typeof MeshoptDecoder;
      if (!decoder?.supported) {
        console.error("[书签尺] 解码器不可用", "MeshoptDecoder.supported = false");
        throw new Error("当前浏览器无法解码压缩网格");
      }
      await decoder.ready;
      return (buffer: ArrayBuffer) =>
        new Promise<GLTF>((resolve, reject) => {
          const loader = new GLTFLoader();
          loader.setMeshoptDecoder(decoder);
          loader.parse(
            buffer,
            "",
            (gltf) => resolve(gltf),
            (error) => reject(error instanceof Error ? error : new Error(String(error))),
          );
        });
    })().catch((error: unknown) => {
      parserPromise = null;
      throw error;
    });
  }
  return parserPromise;
}

async function loadFresh(url: string, timeoutMs: number) {
  let fetched: { buffer: ArrayBuffer; source: LoadSource };
  try {
    fetched = await fetchBuffer(url, timeoutMs, (progress) => emit(url, progress));
  } catch (error) {
    console.error("[书签尺] 下载失败", { url, message: asError(error).message });
    throw stageError("下载", error);
  }
  console.info("[书签尺] 文件已取到", {
    url,
    bytes: fetched.buffer.byteLength,
    source: fetched.source,
  });
  emit(url, {
    phase: "decode",
    loaded: fetched.buffer.byteLength,
    total: fetched.buffer.byteLength,
    source: fetched.source,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  try {
    const parse = await getParser();
    const gltf = await withTimeout(parse(fetched.buffer), timeoutMs, "解码超时，模型没有解开");
    return { gltf, bytes: fetched.buffer.byteLength, source: fetched.source };
  } catch (error) {
    console.error("[书签尺] 解码失败", { url, message: asError(error).message });
    throw stageError("解码", error);
  }
}

export function loadGltf(url: string, onProgress: (progress: LoadProgress) => void, timeoutMs: number) {
  let set = listeners.get(url);
  if (!set) {
    set = new Set();
    listeners.set(url, set);
  }
  set.add(onProgress);

  const existing = memory.get(url);
  if (!existing) {
    const promise = loadFresh(url, timeoutMs);
    const entry = { promise, ready: false };
    memory.set(url, entry);
    promise.then(
      () => {
        entry.ready = true;
      },
      () => {
        if (memory.get(url)?.promise === promise) memory.delete(url);
      },
    );
  }

  const entry = memory.get(url)!;
  const alreadyReady = entry.ready;
  return entry.promise
    .then((model) => {
      if (alreadyReady) {
        onProgress({ phase: "decode", loaded: model.bytes, total: model.bytes, source: "cache" });
        return { ...model, source: "cache" as const };
      }
      return model;
    })
    .finally(() => {
      set?.delete(onProgress);
    });
}
