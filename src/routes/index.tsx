import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExhibitNav } from "@/components/exhibit-panels";

export const Route = createFileRoute("/")({ component: Home });

const BookmarkStage = lazy(() =>
  import("@/components/bookmark-stage").then((mod) => ({ default: mod.BookmarkStage })),
);

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
        src="/sxd-loading-tree.webp"
        alt="三星堆青铜神树"
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

function MaskWatermark() {
  return (
    <svg
      className="watermark"
      viewBox="0 0 200 250"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M100 8 L100 48" />
      <path d="M88 20 Q100 4 112 20" />
      <path d="M62 44 C62 26 138 26 138 44 L148 150 C148 192 120 218 100 232 C80 218 52 192 52 150 Z" />
      <path d="M52 92 L6 66 L10 108 L52 128" />
      <path d="M148 92 L194 66 L190 108 L148 128" />
      <path d="M22 78 L40 90 M24 94 L42 104" />
      <path d="M178 78 L160 90 M176 94 L158 104" />
      <path d="M62 82 Q78 74 94 84" />
      <path d="M138 82 Q122 74 106 84" />
      <path d="M64 90 L92 96 L92 112 L64 106 Z" />
      <path d="M136 90 L108 96 L108 112 L136 106 Z" />
      <path d="M72 94 L72 58 L84 58 L84 96" />
      <path d="M128 94 L128 58 L116 58 L116 96" />
      <ellipse cx="78" cy="58" rx="6" ry="3" />
      <ellipse cx="122" cy="58" rx="6" ry="3" />
      <path d="M100 104 L100 156 M90 156 Q100 166 110 156" />
      <path d="M68 184 Q100 202 132 184 Q100 192 68 184" />
      <path d="M100 30 L100 68 M92 62 L100 72 L108 62" />
    </svg>
  );
}

function Home() {
  return (
    <main className="page">
      <MaskWatermark />
      <header className="mast">
        <div className="brand">三星堆</div>
        <ExhibitNav />
      </header>

      <section className="hero">
        <Viewer />
        <div className="copy">
          <p className="eyebrow">Sanxingdui Museum</p>
          <h1>纵目藏金</h1>
          <span className="rule" aria-hidden="true" />
          <p className="lede">
            三星堆的金与青铜，收进一枚一百五十毫米的书签尺：一面珐琅，一面镂金，青绿丝绦自尺尾垂落。
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
            <li>滚轮或双指捏合用来放大，右键、左右键同时按住，或双指拖动可挪动画面。</li>
            <li>松手后挂绳略滞后再垂稳，不会一直自己晃。暂停重力会定住垂向，继续恢复，复位回到初始姿态。</li>
            <li>「流苏」把画面拉近丝线。近看仍能分辨一束独立细丝。</li>
          </ol>
        </div>
      </section>

      <p className="colophon">三星堆博物馆纹样书签尺 · 赏看用展示</p>
    </main>
  );
}
