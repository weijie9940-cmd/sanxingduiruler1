import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import portfolioCss from "../styles/portfolio.css?url";

const NIGHT = "#0c0f14";
const ORBITAL_URL = "https://orbital.xina-official.cn";

const ENTRIES = [
  { href: "#works", index: "01", title: "作品", en: "Works", line: "浏览 3D 展陈与交互网页" },
  { href: "#about", index: "02", title: "关于", en: "About", line: "方向、工具与创作方式" },
  { href: "#progress", index: "03", title: "学习进程", en: "Progress", line: "建模、前端与 AI 工作流记录" },
  { href: "#contact", index: "04", title: "联系", en: "Contact", line: "交流 3D / 展陈 / AI 工具" },
] as const;

const PILLARS = ["展陈体验", "3D 建模", "网页交互", "AI 辅助制作"] as const;
const TOOLS = ["Blender", "Three.js", "Cursor", "AI 辅助"] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XINA 的数字档案馆" },
      {
        name: "description",
        content:
          "我把 3D 展陈、网页交互和 AI 工具实验，整理成一个可进入、可持续更新的个人作品入口。",
      },
      { name: "theme-color", content: NIGHT },
    ],
    links: [{ rel: "stylesheet", href: portfolioCss }],
  }),
  component: ArchiveHome,
});

function ArchiveHome() {
  const rootRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const spot = spotRef.current;
    const cursor = cursorRef.current;
    if (!root || !spot || !cursor) return;

    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const enable = () => {
      const on = fine.matches && !reduce.matches;
      root.classList.toggle("pf-live", on);
      if (!on) root.classList.remove("is-on");
    };
    enable();

    const onMove = (event: PointerEvent) => {
      if (!root.classList.contains("pf-live")) return;
      root.classList.add("is-on");
      const shift = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor.style.transform = shift;
      spot.style.transform = shift;
      const target = event.target;
      const hot = target instanceof Element && Boolean(target.closest("a, button"));
      cursor.classList.toggle("is-hot", hot);
    };
    const onLeave = () => root.classList.remove("is-on");

    fine.addEventListener("change", enable);
    reduce.addEventListener("change", enable);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      fine.removeEventListener("change", enable);
      reduce.removeEventListener("change", enable);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="pf" ref={rootRef}>
      <div className="pf-spot" ref={spotRef} aria-hidden="true" />
      <div className="pf-cursor" ref={cursorRef} aria-hidden="true">
        <span className="pf-cursor-ring" />
        <span className="pf-cursor-dot" />
      </div>

      <header className="pf-bar">
        <Link to="/" className="pf-mark">
          XINA
        </Link>
        <nav className="pf-nav" aria-label="档案馆">
          <a href="#works">作品</a>
          <a href="#about">关于</a>
          <a href="#progress">进程</a>
          <a href="#contact">联系</a>
        </nav>
      </header>

      <main className="pf-shell">
        <section className="pf-hero">
          <p className="pf-kicker">Archive</p>
          <h1>XINA 的数字档案馆</h1>
          <p className="pf-lead">
            我把 3D 展陈、网页交互和 AI 工具实验，整理成一个可进入、可持续更新的个人作品入口。
          </p>
          <p className="pf-stats">
            <span>
              <b>2</b> Works
            </span>
            <span>
              <b>1</b> Featured
            </span>
            <span>
              <b>2026</b> Now
            </span>
          </p>
        </section>

        <nav className="pf-entries" aria-label="入口">
          {ENTRIES.map((entry) => (
            <a key={entry.href} className="pf-entry" href={entry.href}>
              <span className="pf-entry-index">{entry.index}</span>
              <span className="pf-entry-title">
                {entry.title} <em>{entry.en}</em>
              </span>
              <span className="pf-entry-line">{entry.line}</span>
              <span className="pf-arr" aria-hidden="true">
                →
              </span>
            </a>
          ))}
        </nav>

        <section className="pf-manifesto">
          <p>作品不是封面堆叠，而是一条可进入的阅读路径。</p>
          <p className="pf-manifesto-sub">从概念、建模到可交互的网页展厅。</p>
        </section>

        <section className="pf-works" id="works">
          <div className="pf-sec-head">
            <p className="pf-kicker">Works</p>
            <h2>作品</h2>
          </div>

          <Link to="/sanxingdui" className="pf-work pf-work-feature" preload="intent">
            <span className="pf-shot-frame">
              <img
                src="/works/sxd-cover.webp"
                alt="三星堆书签尺展陈主视觉：夜色中的青铜书签尺"
                width={1600}
                height={1000}
                fetchPriority="high"
                decoding="async"
              />
            </span>
            <span className="pf-work-copy">
              <span className="pf-kicker">Featured / 2026</span>
              <h3>三星堆书签尺</h3>
              <p>把文物尺度的书签尺做成可旋转观看的数字展厅</p>
              <span className="pf-tag">概念 3D 展陈</span>
              <span className="pf-more">
                进入展厅 <span className="pf-arr">→</span>
              </span>
            </span>
          </Link>

          <a className="pf-work" href={ORBITAL_URL} target="_blank" rel="noopener">
            <span className="pf-shot-frame">
              <img
                src="/works/orbital-cover.webp"
                alt="ORBITAL 展陈主视觉：夜色地球与青铜轨道线"
                width={1600}
                height={1000}
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="pf-work-copy">
              <span className="pf-kicker">01</span>
              <h3>ORBITAL</h3>
              <p>以地球为重心，用电竞元素点缀的轨道叙事站点</p>
              <span className="pf-tag">交互网页</span>
              <span className="pf-more">
                打开地球 <span className="pf-arr">↗</span>
              </span>
            </span>
          </a>

          <p className="pf-pending">03 · 筹备中</p>
          <p className="pf-pending">04 · 筹备中</p>
        </section>

        <section className="pf-about" id="about">
          <div className="pf-sec-head">
            <p className="pf-kicker">About</p>
            <h2>关于</h2>
          </div>
          <p className="pf-bio">
            喜欢用 AI 工具和 3D 建模，把兴趣做成别人也能点进去看的东西。电气专业在读，业余做数字展陈与网页实验。
          </p>
          <ol className="pf-pillars">
            {PILLARS.map((name, index) => (
              <li key={name}>
                <span>0{index + 1}</span>
                {name}
              </li>
            ))}
          </ol>
        </section>

        <section className="pf-progress" id="progress">
          <div className="pf-sec-head">
            <p className="pf-kicker">Progress</p>
            <h2>学习进程</h2>
          </div>
          <div className="pf-focus">
            <article>
              <h3>Current Focus</h3>
              <p>打磨档案馆首页信息架构，并整理两件作品的展签文案</p>
            </article>
            <article>
              <h3>Next Milestone</h3>
              <p>补第三件作品，或给现有作品加制作札记</p>
            </article>
          </div>
          <ul className="pf-tools">
            {TOOLS.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </section>

        <section className="pf-contact" id="contact">
          <div className="pf-sec-head">
            <p className="pf-kicker">Contact</p>
            <h2>联系</h2>
          </div>
          <a className="pf-mail" href="mailto:weijie9940@gmail.com">
            weijie9940@gmail.com
          </a>
          <p className="pf-colophon">© 2026 Xina</p>
        </section>
      </main>
    </div>
  );
}
