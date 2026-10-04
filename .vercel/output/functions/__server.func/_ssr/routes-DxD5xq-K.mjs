import { i as __toESM } from "../_runtime.mjs";
import { G as require_jsx_runtime, K as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DxD5xq-K.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BookmarkStage = (0, import_react.lazy)(() => import("./bookmark-stage-Dlll7Vu6.mjs").then((mod) => ({ default: mod.BookmarkStage })));
var SHOTS = [
	{
		src: "/reference/front_reference.jpg",
		alt: "实物正面，置于木纹桌面",
		label: "实物 · 正面"
	},
	{
		src: "/reference/back_reference.jpg",
		alt: "实物背面，铜金镂空尺身",
		label: "实物 · 背面"
	},
	{
		src: "/reference/tassel_reference_full.jpg",
		alt: "实物流苏整体，丝绦垂在桌沿",
		label: "实物 · 垂绦"
	},
	{
		src: "/reference/tassel_thread_detail_reference.jpg",
		alt: "手持实物流苏，可见丝线与金扣",
		label: "实物 · 丝线"
	}
];
function Viewer() {
	const [show3d, setShow3d] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "viewer",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			className: "viewer-poster",
			src: "/reference/front_reference.jpg",
			alt: "三星堆装饰书签尺",
			fetchPriority: "high"
		}), show3d ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: null,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookmarkStage, {})
		}) : null]
	});
}
function Home() {
	const dialogRef = (0, import_react.useRef)(null);
	const [shot, setShot] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (shot && !dialog.open) dialog.showModal();
		if (!shot && dialog.open) dialog.close();
	}, [shot]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mast",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "brand",
					children: "三星堆"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mast-meta",
					children: "Bookmark Ruler"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hero",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewer, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "copy",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow",
							children: "Sanxingdui Museum"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "装饰书签尺" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "lede",
							children: "一面珐琅，一面镂金。一百五十毫米的书签尺沿尺尾垂下青绿丝绦，红玉与琥珀坠在流苏之上。"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "facts",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "尺身" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "铜金镂空，双面纹样" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "刻度" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "一百五十毫米" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "流苏" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "青绿丝线，细密成束" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "坠饰" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "红玉珠与琥珀椭圆" })] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
							className: "how",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "左右拖动转动尺身，看正面、背面和侧面。上下拖动把尺身放平；放平后再左右拖，可以看到端部。" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "滚轮或双指捏合用来放大，右键或双指拖动可挪动画面。" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "松手后挂绳略滞后再垂稳，不会一直自己晃。暂停重力会定住垂向，继续恢复，复位回到初始姿态。" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "「流苏」把画面拉近丝线。近看仍能分辨一束独立细丝。" })
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "gallery",
				"aria-labelledby": "gallery-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "gallery-head",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "gallery-title",
						children: "纹样与实物"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Reference" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "gallery-grid",
					children: SHOTS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "shot",
						onClick: () => setShot(item),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: item.src,
							alt: item.alt,
							loading: "lazy",
							decoding: "async"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label })]
					}, item.src))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dialog", {
				ref: dialogRef,
				className: "lightbox",
				onClose: () => setShot(null),
				onClick: (event) => {
					if (event.target === dialogRef.current) setShot(null);
				},
				children: shot ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: shot.src,
					alt: shot.alt
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lightbox-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: shot.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "text-btn",
						onClick: () => setShot(null),
						children: "关闭"
					})]
				})] }) : null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "colophon",
				children: "三星堆博物馆纹样书签尺 · 赏看用展示"
			})
		]
	});
}
//#endregion
export { Home as component };
