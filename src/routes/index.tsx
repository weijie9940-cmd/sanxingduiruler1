import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

const BookmarkStage = lazy(() =>
  import("@/components/bookmark-stage").then((mod) => ({ default: mod.BookmarkStage })),
);

const SHOTS = [
  { src: "/reference/front_reference.jpg", alt: "实物正面，置于木纹桌面", label: "实物 · 正面" },
  { src: "/reference/back_reference.jpg", alt: "实物背面，铜金镂空尺身", label: "实物 · 背面" },
  { src: "/reference/tassel_reference_full.jpg", alt: "实物流苏整体，丝绦垂在桌沿", label: "实物 · 垂绦" },
  { src: "/reference/tassel_thread_detail_reference.jpg", alt: "手持实物流苏，可见丝线与金扣", label: "实物 · 丝线" },
] as const;

function Viewer() {
  const [show3d, setShow3d] = useState(false);
  useEffect(() => {
    let alive = true;
    const start = () => {
      if (alive) setShow3d(true);
    };
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 0);
      return () => {
        alive = false;
        window.clearTimeout(id);
      };
    }
    window.addEventListener("load", start, { once: true });
    return () => {
      alive = false;
      window.removeEventListener("load", start);
    };
  }, []);
  return (
    <div className="viewer">
      <img
        className="viewer-poster"
        src="/reference/front_reference.jpg"
        alt="三星堆装饰书签尺"
        fetchPriority="high"
      />
      {show3d ? (
        <Suspense fallback={null}>
          <BookmarkStage />
        </Suspense>
      ) : null}
    </div>
  );
}

function Home() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shot, setShot] = useState<(typeof SHOTS)[number] | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (shot && !dialog.open) dialog.showModal();
    if (!shot && dialog.open) dialog.close();
  }, [shot]);

  return (
    <main className="page">
      <header className="mast">
        <div className="brand">三星堆</div>
        <div className="mast-meta">Bookmark Ruler</div>
      </header>

      <section className="hero">
        <Viewer />
        <div className="copy">
          <p className="eyebrow">Sanxingdui Museum</p>
          <h1>装饰书签尺</h1>
          <p className="lede">
            一面珐琅，一面镂金。一百五十毫米的书签尺沿尺尾垂下青绿丝绦，红玉与琥珀坠在流苏之上。
          </p>
          <ul className="facts">
            <li>
              <strong>尺身</strong>
              <span>铜金镂空，双面纹样</span>
            </li>
            <li>
              <strong>刻度</strong>
              <span>一百五十毫米</span>
            </li>
            <li>
              <strong>流苏</strong>
              <span>青绿丝线，细密成束</span>
            </li>
            <li>
              <strong>坠饰</strong>
              <span>红玉珠与琥珀椭圆</span>
            </li>
          </ul>
          <ol className="how">
            <li>左右拖动转动尺身，看正面、背面和侧面。上下拖动把尺身放平；放平后再左右拖，可以看到端部。</li>
            <li>滚轮或双指捏合用来放大，右键或双指拖动可挪动画面。</li>
            <li>松手后挂绳略滞后再垂稳，不会一直自己晃。暂停重力会定住垂向，继续恢复，复位回到初始姿态。</li>
            <li>「流苏」把画面拉近丝线。近看仍能分辨一束独立细丝。</li>
          </ol>
        </div>
      </section>

      <section className="gallery" aria-labelledby="gallery-title">
        <div className="gallery-head">
          <h2 id="gallery-title">纹样与实物</h2>
          <p>Reference</p>
        </div>
        <div className="gallery-grid">
          {SHOTS.map((item) => (
            <button key={item.src} type="button" className="shot" onClick={() => setShot(item)}>
              <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="lightbox"
        onClose={() => setShot(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setShot(null);
        }}
      >
        {shot ? (
          <>
            <img src={shot.src} alt={shot.alt} />
            <div className="lightbox-bar">
              <span>{shot.label}</span>
              <button type="button" className="text-btn" onClick={() => setShot(null)}>
                关闭
              </button>
            </div>
          </>
        ) : null}
      </dialog>

      <p className="colophon">三星堆博物馆纹样书签尺 · 赏看用展示</p>
    </main>
  );
}
