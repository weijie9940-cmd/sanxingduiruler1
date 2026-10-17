import { createFileRoute, Link } from "@tanstack/react-router";
import portfolioCss from "../styles/portfolio.css?url";

const NIGHT = "#0c0f14";
const ORBITAL_URL = "https://orbital.xina-official.cn";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xina · 作品集" },
      {
        name: "description",
        content: "Xina 的个人作品册，收录设计、3D 建模与网页交互方面的练习。",
      },
      { name: "theme-color", content: NIGHT },
    ],
    links: [{ rel: "stylesheet", href: portfolioCss }],
  }),
  component: PortfolioHome,
});

function PortfolioHome() {
  return (
    <div className="pf">
      <section className="pf-hero">
        <header className="pf-bar">
          <Link to="/" className="pf-mark">
            Xina
          </Link>
          <nav className="pf-nav" aria-label="页面导航">
            <a href="#works">作品</a>
            <a href="#about">关于</a>
            <a href="#contact">联系</a>
          </nav>
        </header>

        <div className="pf-hero-copy">
          <h1>XINA</h1>
          <p className="pf-lead">喜欢 AI 与 3D 的普通大学生，把课余做的小东西放在这里。</p>
          <p className="pf-kicker">EST. 2026 · 2 件作品</p>
          <a className="pf-enter" href="#works">
            查看展陈 <span className="pf-arr">↓</span>
          </a>
        </div>

        <div className="pf-stage" aria-hidden="true">
          <div className="pf-slide">
            <img
              src="/works/sxd-cover.webp"
              alt=""
              width={1600}
              height={1000}
              decoding="async"
              fetchPriority="high"
            />
            <span className="pf-slide-label">展品 01 · 三星堆书签尺</span>
          </div>
          <div className="pf-slide">
            <img src="/works/orbital-cover.webp" alt="" width={1600} height={1000} decoding="async" />
            <span className="pf-slide-label">展品 02 · ORBITAL</span>
          </div>
        </div>
      </section>

      <main className="pf-wrap">
        <section className="pf-hall" id="works">
          <div className="pf-hall-head">
            <p className="pf-kicker">Exhibits</p>
            <h2>当前展陈</h2>
          </div>

          <div className="pf-exhibits">
            <article className="pf-exhibit">
              <Link to="/sanxingdui" className="pf-shot" preload="intent">
                <span className="pf-shot-frame">
                  <img
                    src="/works/sxd-cover.webp"
                    alt="三星堆书签尺展陈主视觉：夜色中的青铜书签尺，题有「三星堆」"
                    width={1600}
                    height={1000}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="pf-shot-go" aria-hidden="true">
                  →
                </span>
              </Link>
              <div className="pf-plate">
                <h3>
                  <span className="pf-exno">展品 01</span> — 三星堆书签尺
                </h3>
                <p className="pf-spec">文创设计 · 3D 交互 · Three.js</p>
                <p className="pf-desc">
                  以三星堆金与青铜为灵感的书签尺，镂金尺身、双面纹样与青绿丝绦，可在网页中 360°
                  旋转观看。
                </p>
                <Link to="/sanxingdui" className="pf-more" preload="intent">
                  进入展厅 <span className="pf-arr">→</span>
                </Link>
              </div>
            </article>

            <article className="pf-exhibit">
              <a className="pf-shot" href={ORBITAL_URL} target="_blank" rel="noopener">
                <span className="pf-shot-frame">
                  <img
                    src="/works/orbital-cover.webp"
                    alt="ORBITAL 展陈主视觉：夜色地球与青铜轨道线，标注 2013–2026"
                    width={1600}
                    height={1000}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="pf-shot-go" aria-hidden="true">
                  ↗
                </span>
              </a>
              <div className="pf-plate">
                <h3>
                  <span className="pf-exno">展品 02</span> — ORBITAL · CS 电竞 3D 地球
                </h3>
                <p className="pf-spec">2026 · 数据可视化</p>
                <p className="pf-desc">
                  CS 电竞版图 3D 地球：收录 2013–2026 年 201 场 S 级赛事（含 24 场
                  Major），可拖动地球、切换昼夜光照，用年份滑块和战队高亮回看赛事版图。
                </p>
                <a className="pf-more" href={ORBITAL_URL} target="_blank" rel="noopener">
                  打开地球 <span className="pf-arr">↗</span>
                </a>
              </div>
            </article>
          </div>

          <p className="pf-pending">03 / 04 — 筹备中</p>
        </section>

        <footer className="pf-foot">
          <section id="about">
            <h2>关于</h2>
            <p>
              一名普通大学生，喜欢折腾 AI 工具，也喜欢做 3D 建模。这里收着我课余做的小东西，边做边学，慢慢更新。
            </p>
          </section>
          <section id="contact">
            <h2>联系</h2>
            <a className="pf-mail" href="mailto:weijie9940@gmail.com">
              weijie9940@gmail.com
            </a>
          </section>
          <p className="pf-colophon">© 2026 Xina</p>
        </footer>
      </main>
    </div>
  );
}
