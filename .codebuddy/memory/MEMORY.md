# PromptVault 长期记忆

## 图标调整流程约定（用户 2026-07-11 确认）

以后调整 UI 图标的**间距、比重（尺寸）、粗细（stroke-width）**时，统一按此流程：

### 1. 尺寸（比重）
- **不要只改 SVG 的 `width`/`height` 属性**——CSS 里 `.prompt-card-action svg { width:16px }` 优先级高于 SVG 呈现属性，会把属性覆盖掉，改了不生效。
- 正确做法：在 CSS 里加更具体的规则，如：
  - popup: `.prompt-card-action.insert svg { width:20px; height:20px }`
  - sidebar: `#pv-sidebar .pv-card-action-btn.pv-insert-btn svg { width:20px; height:20px }`
- 图标尺寸约定：`20px` 为偏大图标（如插入箭头），常规图标 `16px`（popup）/ `14px`（sidebar）。

### 2. 粗细（stroke-width）
- 数值一致不代表视觉一致：**开放线条型图标**（如纯 ↓ 箭头）同样 `stroke-width:2` 会显得比封闭/轮廓型图标（编辑笔、图钉、垃圾桶）**更粗**。
- 补偿做法：开放线条型图标用 `stroke-width:1.5`，封闭型用 `2`，视觉才平衡。
- 结论：插入箭头 = `stroke-width:1.5`；其他操作图标 = `2`。

### 3. 间距 / 对齐
- 操作图标容器 `.prompt-card-action` 固定 `28×28px` + `inline-flex` + `align-items:center` + `justify-content:center`，`gap:2px`，保证四个图标等大等高对齐。
- SVG 加 `display:block` 防止 inline 空白。

### 历史验证过的状态
- 插入图标最终形态：带底线的下箭头（竖线 + V 形箭头头 + 底部横线），`20px`，`stroke-width:1.5`。
- ChatGPT/Claude 等 React SSR 站点：sidebar.js 与 command-palette.js 顶部直接 return，零 DOM 注入。

## 用户偏好（跨会话稳定）
- UI/功能改动必须先给方案，等用户说"执行/1"再动手（排查/修复类任务可直接执行命令）。
- 每次改完代码主动问是否提交 git；重要节点主动提议提交；不用 --amend、不 force push；提交前 git status/diff 确认范围。
- 改动积累到完整功能/一轮 UI 优化后再提交（本次即一轮图标+注入修复完成后统一提交）。
