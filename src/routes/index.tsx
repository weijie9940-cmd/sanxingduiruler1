import { useEffect, useRef, useState, type RefObject } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import portfolioCss from "../styles/portfolio.css?url";

const NIGHT = "#0c0f14";
const ORBITAL_URL = "https://orbital.xina-official.cn";
const EMAIL = "weijie9940@gmail.com";

const ENTRIES = [
  { href: "#works", index: "01", title: "作品", en: "Works", line: "浏览 3D 展陈与交互网页" },
  { href: "#about", index: "02", title: "关于", en: "About", line: "方向、工具与创作方式" },
  { href: "#progress", index: "03", title: "学习进程", en: "Progress", line: "建模、前端与 AI 工作流记录" },
  { href: "#contact", index: "04", title: "联系", en: "Contact", line: "交流 3D / 展陈 / AI 工具" },
] as const;

const SECTIONS = ["works", "about", "progress", "contact"] as const;
const NAV_LABELS: Record<(typeof SECTIONS)[number], string> = {
  works: "作品",
  about: "关于",
  progress: "进程",
  contact: "联系",
};

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

function usePointerLight(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLElement>(".pf-field");
    const cursor = root.querySelector<HTMLElement>(".pf-cursor");
    if (!field || !cursor) return;

    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let x = -999;
    let y = -999;
    let lit: HTMLElement | null = null;

    const sync = () => {
      const on = fine.matches && !reduce.matches;
      root.classList.toggle("pf-live", on);
      if (!on) root.classList.remove("is-on");
    };
    sync();

    const paint = () => {
      frame = 0;
      field.style.setProperty("--mx", `${x}px`);
      field.style.setProperty("--my", `${y}px`);
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onMove = (event: PointerEvent) => {
      if (!root.classList.contains("pf-live") || event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      root.classList.add("is-on");

      const target = event.target instanceof Element ? event.target : null;
      cursor.classList.toggle("is-hot", Boolean(target?.closest("a, button")));

      const card = target?.closest<HTMLElement>("[data-glow]") ?? null;
      if (lit && lit !== card) lit.removeAttribute("data-lit");
      lit = card;
      if (card) {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--x", `${x - box.left}px`);
        card.style.setProperty("--y", `${y - box.top}px`);
        card.setAttribute("data-lit", "");
      }

      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      root.classList.remove("is-on");
      lit?.removeAttribute("data-lit");
      lit = null;
    };

    fine.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      fine.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [rootRef]);
}

function useReveal(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    // Only content that starts below the fold is held back, so nothing that is already visible flickers.
    const pending = [...root.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92,
    );
    pending.forEach((el) => el.classList.add("is-pending"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.remove("is-pending");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    pending.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

function useActiveSection() {
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const nodes = SECTIONS.map((id) => document.getElementById(id)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = "";
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) current = node.id;
      }
      if (atBottom && nodes.length) current = nodes[nodes.length - 1].id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return active;
}

function CopyEmail() {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setState("done");
    } catch {
      setState("fail");
    }
  };

  return (
    <button type="button" className="pf-copy" onClick={copy}>
      <span aria-live="polite">
        {state === "done" ? "已复制" : state === "fail" ? "请手动复制" : "复制邮箱"}
      </span>
    </button>
  );
}

function ArchiveHome() {
  const rootRef = useRef<HTMLDivElement>(null);
  usePointerLight(rootRef);
  useReveal(rootRef);
  const active = useActiveSection();

  return (
    <div className="pf" ref={rootRef}>
      <div className="pf-field" aria-hidden="true" />
      <div className="pf-cursor" aria-hidden="true">
        <span className="pf-cursor-ring" />
        <span className="pf-cursor-dot" />
      </div>

      <header className="pf-bar">
        <Link to="/" className="pf-mark">
          XINA<span>Archive</span>
        </Link>
        <nav className="pf-nav" aria-label="档案馆">
          {SECTIONS.map((id) => (
            <a key={id} href={`#${id}`} className={active === id ? "is-active" : undefined}>
              {NAV_LABELS[id]}
            </a>
          ))}
        </nav>
      </header>

      <main className="pf-shell">
        <section className="pf-hero">
          <div className="pf-hero-main">
            <p className="pf-kicker">
              <span className="pf-live-dot" aria-hidden="true" />
              Digital Archive · 2026
            </p>
            <h1>
              <span>XINA 的</span>
              <span>数字档案馆</span>
            </h1>
            <p className="pf-lead">
              我把 3D 展陈、网页交互和 AI 工具实验，整理成一个可进入、可持续更新的个人作品入口。
            </p>
          </div>

          <dl className="pf-stats">
            <div>
              <dt>Works</dt>
              <dd>02</dd>
            </div>
            <div>
              <dt>Featured</dt>
              <dd>01</dd>
            </div>
            <div>
              <dt>Now</dt>
              <dd>2026</dd>
            </div>
          </dl>

          <nav className="pf-entries" aria-label="入口">
            {ENTRIES.map((entry) => (
              <a key={entry.href} className="pf-entry" href={entry.href} data-glow>
                <span className="pf-entry-index">{entry.index}</span>
                <span className="pf-entry-title">
                  {entry.title}
                  <em>{entry.en}</em>
                </span>
                <span className="pf-entry-line">{entry.line}</span>
                <span className="pf-entry-arr" aria-hidden="true">
                  ↘
                </span>
              </a>
            ))}
          </nav>
        </section>

        <section className="pf-manifesto" data-reveal>
          <p className="pf-manifesto-main">
            作品不是封面堆叠，
            <br />
            而是一条<em>可进入</em>的阅读路径。
          </p>
          <p className="pf-manifesto-sub">从概念、建模到可交互的网页展厅。</p>
        </section>

        <section className="pf-section" id="works">
          <SectionHead no="01" title="作品" en="Works" aside="2 件展出 · 2 件筹备" />

          <Link
            to="/sanxingdui"
            className="pf-work is-featured"
            preload="intent"
            data-reveal
            data-glow
          >
            <div className="pf-work-media">
              <img
                src="/works/sxd-cover.webp"
                alt="三星堆书签尺展陈主视觉：夜色中的青铜书签尺"
                width={1600}
                height={1000}
                loading="lazy"
                decoding="async"
              />
              <span className="pf-badge">Featured</span>
            </div>
            <div className="pf-work-label">
              <span className="pf-work-no">No.01</span>
              <h3>三星堆书签尺</h3>
              <p className="pf-work-concept">把文物尺度的书签尺做成可旋转观看的数字展厅</p>
              <dl className="pf-meta">
                <div>
                  <dt>类型</dt>
                  <dd>概念 3D 展陈</dd>
                </div>
                <div>
                  <dt>年份</dt>
                  <dd>2026</dd>
                </div>
                <div>
                  <dt>入口</dt>
                  <dd>站内展厅</dd>
                </div>
              </dl>
              <span className="pf-cta">
                进入展厅 <span className="pf-arr">→</span>
              </span>
            </div>
          </Link>

          <a
            className="pf-work"
            href={ORBITAL_URL}
            target="_blank"
            rel="noopener"
            data-reveal
            data-glow
          >
            <div className="pf-work-media">
              <img
                src="/works/orbital-cover.webp"
                alt="ORBITAL · CS 赛事寰宇主视觉：地球仪与世界排名"
                width={1600}
                height={1000}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="pf-work-label">
              <span className="pf-work-no">No.02</span>
              <h3>ORBITAL · CS 赛事寰宇</h3>
              <p className="pf-work-concept">在地球仪上回溯每一场 S 级冠军的时代阵容与世界排名，并从选手国籍飞向他们的首都</p>
              <dl className="pf-meta">
                <div>
                  <dt>类型</dt>
                  <dd>交互地图</dd>
                </div>
                <div>
                  <dt>年份</dt>
                  <dd>2026</dd>
                </div>
                <div>
                  <dt>入口</dt>
                  <dd>外部站点</dd>
                </div>
              </dl>
              <span className="pf-cta">
                打开地图 <span className="pf-arr">↗</span>
              </span>
            </div>
          </a>

          <div className="pf-pending" data-reveal>
            <p>
              <span>No.03</span>筹备中
            </p>
            <p>
              <span>No.04</span>筹备中
            </p>
          </div>
        </section>

        <section className="pf-section" id="about">
          <SectionHead no="02" title="关于" en="About" />
          <div className="pf-about" data-reveal>
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
          </div>
        </section>

        <section className="pf-section" id="progress">
          <SectionHead no="03" title="学习进程" en="Progress" />
          <div className="pf-focus" data-reveal>
            <article className="is-now" data-glow>
              <h3>
                <span className="pf-live-dot" aria-hidden="true" />
                Current Focus
              </h3>
              <p>持续更新 ORBITAL 赛事档案，并同步作品站展签文案</p>
            </article>
            <article data-glow>
              <h3>Next Milestone</h3>
              <p>补第三件作品，或给现有作品加制作札记</p>
            </article>
          </div>
          <ul className="pf-tools" aria-label="常用工具" data-reveal>
            {TOOLS.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </section>

        <section className="pf-section pf-contact" id="contact">
          <SectionHead no="04" title="联系" en="Contact" />
          <div className="pf-contact-row" data-reveal>
            <a className="pf-mail" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
            <CopyEmail />
          </div>
        </section>

        <footer className="pf-foot">
          <span>© 2026 XINA</span>
          <span>数字档案馆 · 持续更新</span>
        </footer>
      </main>
    </div>
  );
}

function SectionHead({
  no,
  title,
  en,
  aside,
}: {
  no: string;
  title: string;
  en: string;
  aside?: string;
}) {
  return (
    <div className="pf-sec-head" data-reveal>
      <span className="pf-sec-no">§ {no}</span>
      <h2>
        {title}
        <em>{en}</em>
      </h2>
      {aside ? <span className="pf-sec-aside">{aside}</span> : null}
    </div>
  );
}
