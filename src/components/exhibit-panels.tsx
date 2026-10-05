import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { EXHIBIT_PANELS, PANEL_DISCLAIMER } from "@/lib/content/sanxingdui-panels";
import type { PanelId } from "@/lib/content/sanxingdui-panels";

const FOCUSABLE =
  'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * 页眉的四个展陈按钮 + 点击后打开的深色面板（dialog）。
 * 面板打开时：页面主体设为 inert、锁定背景滚动；关闭后恢复并把焦点还给触发按钮。
 */
export function ExhibitNav() {
  const [activeId, setActiveId] = useState<PanelId | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const open = useCallback((id: PanelId, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setActiveId(id);
  }, []);

  const close = useCallback(() => {
    setActiveId(null);
  }, []);

  // 面板打开期间：主体 inert，背景不滚动；关闭后恢复并还原焦点
  const isOpen = activeId !== null;
  useEffect(() => {
    if (!isOpen) return;
    const main = navRef.current?.closest("main");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    main?.setAttribute("inert", "");
    return () => {
      document.body.style.overflow = prevOverflow;
      main?.removeAttribute("inert");
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) trigger.focus();
    };
  }, [isOpen]);

  const active = EXHIBIT_PANELS.find((p) => p.id === activeId) ?? null;

  return (
    <>
      <nav className="mast-nav" aria-label="展陈导览" ref={navRef}>
        {EXHIBIT_PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="nav-pill"
            aria-haspopup="dialog"
            aria-expanded={activeId === p.id}
            onClick={(e) => open(p.id, e.currentTarget)}
          >
            <span className="nav-idx" aria-hidden="true">
              {p.index}
            </span>
            <span className="nav-label">
              <span className="nav-zh">{p.nav}</span>
              <span className="nav-en" aria-hidden="true">
                {p.en}
              </span>
            </span>
          </button>
        ))}
      </nav>
      {active
        ? createPortal(
            <ExhibitDialog activeId={active.id} onSelect={setActiveId} onClose={close} />,
            document.body,
          )
        : null}
    </>
  );
}

function ExhibitDialog({
  activeId,
  onSelect,
  onClose,
}: {
  activeId: PanelId;
  onSelect: (id: PanelId) => void;
  onClose: () => void;
}) {
  const panel = EXHIBIT_PANELS.find((p) => p.id === activeId) ?? EXHIBIT_PANELS[0];
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // 打开时把焦点放到关闭按钮
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Esc 关闭（挂在 document 上，点到正文空白处后同样有效）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 切换面板时回到顶部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeId]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && current === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="exhibit-layer" onKeyDown={onKeyDown}>
      <div className="exhibit-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="exhibit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="exhibit-bar">
          <div className="exhibit-tabs" role="group" aria-label="切换展陈">
            {EXHIBIT_PANELS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="exhibit-tab"
                aria-pressed={p.id === activeId}
                onClick={() => onSelect(p.id)}
              >
                <span aria-hidden="true">{p.index}</span> {p.nav}
              </button>
            ))}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="exhibit-close"
            onClick={onClose}
            aria-label="关闭面板"
          >
            <span aria-hidden="true">关闭 ✕</span>
          </button>
        </div>

        <div className="exhibit-scroll" ref={scrollRef}>
          <article className="exhibit-body" key={panel.id}>
            <p className="exhibit-kicker">
              <span>{panel.index}</span> · {panel.en}
            </p>
            <h2 id={titleId} className="exhibit-title">
              {panel.title}
            </h2>
            <span className="rule" aria-hidden="true" />
            {panel.paragraphs.map((text) => (
              <p key={text} className="exhibit-text">
                {text}
              </p>
            ))}
            {panel.points && panel.points.length > 0 ? (
              <ul className="exhibit-points">
                {panel.points.map((pt) => (
                  <li key={pt.label}>
                    <strong>{pt.label}</strong>
                    <span>{pt.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="exhibit-note">{PANEL_DISCLAIMER}</p>
          </article>
        </div>
      </div>
    </div>
  );
}
