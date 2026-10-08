import { createFileRoute, Link } from "@tanstack/react-router";
import portfolioCss from "../styles/portfolio.css?url";

const PAPER = "#f3f0e8";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xina · 作品集" },
      {
        name: "description",
        content: "Xina 的个人作品册，收录设计、3D 建模与网页交互方面的练习。",
      },
      { name: "theme-color", content: PAPER },
    ],
    links: [{ rel: "stylesheet", href: portfolioCss }],
  }),
  component: PortfolioHome,
});

type Work = {
  no: string;
  title: string;
  meta: string;
  to?: "/sanxingdui";
};

const WORKS: Work[] = [
  { no: "01", title: "三星堆书签尺", meta: "3D 交互展示 · 文创设计", to: "/sanxingdui" },
  { no: "02", title: "3D 建模作品", meta: "筹备中 · 敬请期待" },
  { no: "03", title: "平面 / 视觉设计", meta: "筹备中 · 敬请期待" },
  { no: "04", title: "交互小实验", meta: "筹备中 · 敬请期待" },
];

function PortfolioHome() {
  return (
    <div className="pf">
      <header className="pf-header">
        <div className="pf-wrap pf-top">
          <Link to="/" className="pf-logo">
            Xina
          </Link>
          <nav className="pf-nav" aria-label="页面导航">
            <a href="#works">作品</a>
            <a href="#about">关于</a>
            <a href="#contact">联系</a>
          </nav>
        </div>
        <div className="pf-wrap">
          <div className="pf-issue">
            <span>VOL. 01 — 2026 秋</span>
            <span>设计 · 3D · 交互 作品集</span>
          </div>
        </div>
      </header>

      <main className="pf-wrap">
        <section className="pf-hero">
          <h1>
            <span className="pf-l">做一点</span>
            <span className="pf-l">
              能被<i>看见</i>、
            </span>
            <span className="pf-l">
              也能被<i>转动</i>的东西。
            </span>
          </h1>
          <aside>
            <div className="pf-k">编者按</div>
            <p>这是一本慢慢更新的个人作品册，收录设计、3D 建模与网页交互方面的练习。</p>
            <div className="pf-sig">— Xina</div>
          </aside>
        </section>

        <section className="pf-works" id="works">
          <div className="pf-label">
            <h2>本期作品</h2>
            <span>INDEX</span>
          </div>
          <div className="pf-spread">
            <article className="pf-feature">
              <Link to="/sanxingdui" className="pf-img" preload="intent">
                <img
                  src="/works/sxd-3d.webp"
                  alt="三星堆书签尺 3D 预览"
                  width={814}
                  height={643}
                  decoding="async"
                />
                <span className="pf-no">No. 01 · 封面作品</span>
              </Link>
              <div className="pf-cap">
                <div className="pf-big">01</div>
                <div>
                  <h3>三星堆书签尺</h3>
                  <p className="pf-desc">
                    以三星堆金与青铜为灵感的书签尺，镂金尺身、双面纹样与青绿丝绦，可在网页中 360°
                    旋转观看。
                  </p>
                  <Link to="/sanxingdui" className="pf-more" preload="intent">
                    进入 3D 展厅 →
                  </Link>
                </div>
              </div>
            </article>
            <div>
              <ol className="pf-list">
                {WORKS.map((work) => {
                  const body = (
                    <>
                      <span className="pf-n">{work.no}</span>
                      <div>
                        <h4>{work.title}</h4>
                        <p>{work.meta}</p>
                      </div>
                    </>
                  );
                  return (
                    <li key={work.no} className={work.to ? "pf-ready" : "pf-soon"}>
                      {work.to ? (
                        <Link to={work.to} className="pf-row" preload="intent">
                          {body}
                        </Link>
                      ) : (
                        <div className="pf-row">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="pf-quote">下一期内容正在制作中，新作品会陆续加入这份目录。</p>
            </div>
          </div>
        </section>
      </main>

      <div className="pf-wrap">
        <div className="pf-colophon">
          <section id="about">
            <h2>关于</h2>
            <p>
              一名普通大学生，喜欢折腾 AI 工具，也喜欢做 3D 建模。这里收着我课余做的小东西，边做边学，慢慢更新。
            </p>
          </section>
          <section id="contact">
            <h2>联系</h2>
            <p>
              <a href="mailto:weijie9940@gmail.com">weijie9940@gmail.com</a>
              <br />
              <span className="pf-ph pf-small">合作或交流，欢迎来信。</span>
            </p>
          </section>
        </div>
      </div>

      <footer className="pf-footer">
        <div className="pf-wrap">
          <span>© 2026 Xina</span>
          <span>xina-official.cn</span>
        </div>
      </footer>
    </div>
  );
}
