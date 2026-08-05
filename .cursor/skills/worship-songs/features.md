# worship-songs 功能地图

## 页面路由

| 路由 | 模块 | 权限 |
|------|------|------|
| `/dashboard` | 首页统计、最近聚会、快捷入口 | 登录用户 |
| `/songs` | 曲库列表、搜索、标签、首字母 | 登录用户 |
| `/song-upload` | 上传歌曲 | LEADER+ |
| `/songs/[id]` | 歌曲详情、LRC、分享 | 登录用户 |
| `/songs/[id]/edit` | 编辑歌曲 | LEADER+ |
| `/sheets` | 主领选歌、合并 PDF、嵌入式 Agent | 登录用户 |
| `/meetings` | 聚会列表（年/月筛选） | 登录用户 |
| `/meetings/new` | 新建聚会、选歌 | LEADER+ |
| `/meetings/[id]` | 聚会详情 | 登录用户 |
| `/sheets/leaders` | 主领选歌统计 | 登录用户 |
| `/playlists` | 歌单列表 | 登录用户 |
| `/playlists/[id]` | 歌单详情、排序、分享 | 登录用户 |
| `/ppt` | 歌词 PPT 生成 | 下载权限 |
| `/leaderboard` | 使用次数排行 | 登录用户 |
| `/teams` | 团队列表 | 登录用户 |
| `/teams/[id]` | 团队聊天、共享歌曲 | 团队成员 |
| `/teams/[id]/settings` | 成员管理 | OWNER/ADMIN |
| `/data` | Excel 导入导出 | 导入 LEADER+ |
| `/guide` | 功能指南 | 登录用户 |
| `/settings` | 个人设置 | 登录用户 |
| `/admin/users` | 用户管理 | SUPER_ADMIN |
| `/share/[type]/[id]` | 公开分享 | 无需登录 |

侧栏定义：`src/lib/nav-items.ts`

---

## API 路由

### 歌曲

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/songs` | 列表（search, letter, lyricsSearch, tagIds）/ 创建 |
| GET/PUT/DELETE | `/api/songs/[id]` | 详情 / 更新 / 删除 |
| GET | `/api/songs/letters` | 首字母计数 + 触发补全 |
| POST | `/api/songs/sheets/merge` | 合并多页歌谱 PDF |
| POST | `/api/songs/ppt` | 生成歌词 PPT |
| POST | `/api/songs/extract-lyrics` | OCR（表单上传） |
| POST | `/api/songs/[id]/extract-lyrics` | OCR（已有歌曲） |
| GET | `/api/songs/scripture-recommendations` | 经文推荐（sheets 用） |

### 聚会

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/meetings` | 列表（year, month）/ 创建 |
| GET/PUT/DELETE | `/api/meetings/[id]` | 详情 / 更新 / 删除 |
| GET | `/api/meetings/leader-songs` | 主领统计 |

### 歌单 / 标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/playlists` | 列表 / 创建 |
| GET/PUT/DELETE | `/api/playlists/[id]` | 详情 / 更新 / 删除 |
| GET/POST/DELETE | `/api/playlists/[id]/songs` | 歌单歌曲 |
| GET/POST | `/api/tags` | 标签列表 / 创建 |
| PUT/DELETE | `/api/tags/[id]` | 更新 / 删除 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | 首页统计 |
| GET | `/api/leaderboard` | 排行榜 |
| GET/POST | `/api/share` | 生成分享 token |
| POST | `/api/import` | Excel 导入 |
| GET | `/api/export` | Excel 导出 |
| POST | `/api/agent/chat` | 选歌 Agent（流式） |
| GET/POST | `/api/teams` | 团队 CRUD |
| GET/POST/DELETE | `/api/teams/[id]/songs` | 团队共享歌曲 |
| GET/POST | `/api/teams/[id]/messages` | 团队聊天 |
| GET | `/api/teams/[id]/members/search` | 搜索待添加成员 |
| POST/DELETE | `/api/teams/[id]/members` | 成员管理 |
| POST | `/api/upload` | 文件上传 |

---

## 领域 lib 对照

| 功能 | 主要文件 |
|------|----------|
| 首字母索引 | `song-title-index.ts`, `song-title-initial-sync.ts` |
| 标题规范化/去重 | `song-title-normalize.ts`, `song-dedupe.ts` |
| 多页歌谱路径 | `song-sheet-paths.ts` |
| PDF 合并 | `sheet-pdf-merge.ts`, `sheet-pdf-download-client.ts` |
| 歌谱预览/打印 | `sheet-viewer.ts` |
| 主题搜索 | `meeting-theme-search.ts` |
| 经文推荐 | `scripture-recommendations.ts` |
| 主领统计 | `leader-songs.ts`, `leader-names.ts` |
| 歌词 PPT | `ppt-lyrics.ts`, `ppt-download-client.ts`, `ppt-song-background.ts` |
| LRC 解析 | `lrc.ts`, `lyrics-sections.ts` |
| OCR | `lyrics-ocr.ts`, `gemini-lyrics.ts`, `openai-lyrics.ts`, `lyrics-ocr-config.ts` |
| Excel | `excel-import.ts`, `excel-song-names.ts` |
| 歌单权限 | `playlist-access.ts` |
| 标签 | `tags.ts` |
| Agent | `lib/ai/song-agent-prompt.ts`, `song-agent-tools.ts`, `song-search.ts` |
| 权限 | `permissions.ts`, `server-permissions.ts` |
| i18n | `i18n.ts` |
| 导航/指南 | `nav-items.ts`, `feature-guide.ts` |
| 分享 | route 内 token 生成逻辑 |
| 错误 | `errors.ts` |

---

## UI 组件（按模块）

| 模块 | 组件 |
|------|------|
| 曲库 | `song-letter-index.tsx`, `tag-multi-select.tsx`, `song-scriptures-editor.tsx` |
| 主领选歌 | `sheets-song-row.tsx`, `sheets-agent-panel.tsx`, `merged-sheet-preview-dialog.tsx`, `sheets-song-preview-dialog.tsx` |
| 多页歌谱 | `sheet-music-pages-editor.tsx`, `sheet-music-preview-dialog.tsx` |
| Agent | `song-agent-chat.tsx`（全局浮动） |
| 功能指南 | `feature-guide-sheet.tsx`, `feature-guide-content.tsx` |
| 布局 | `main-layout.tsx`（含 Agent、帮助侧滑） |

---

## 功能点清单

### 曲库
- 默认按歌名 A–Z 排序；`#` 最后
- 首字母条快速筛选（`/songs`, `/sheets`）
- 歌名/歌手搜索 + 独立歌词搜索
- TYPE/STYLE 标签多选（AND）
- 卡片/列表视图；行内「加入歌单」
- 标签管理对话框（LEADER+）
- 详情页快速改标签、LRC 跟唱、多页歌谱预览

### 主领选歌
- 主题 → 历史相似聚会及选歌
- 经文 → 库内关联 + 历史推荐
- 搜索 + 首字母 + 试听 + 歌词预览
- 已选列表排序（最多 20 首）
- 合并 PDF 预览/打印/下载
- 嵌入式选歌 Agent（带 pageContext）

### 聚会
- 年/月筛选列表
- 新建：搜索选歌或手动建歌
- 保存后计入排行榜与主领统计
- 详情分享

### 歌单
- 独立于聚会；不影响排行榜
- 创建、排序、分享
- 从曲库/详情/Agent 加入

### 歌词 PPT
- 最多 20 首，排序后生成 `.pptx`
- 使用 `pptxgenjs`

### 选歌 Agent
- 工具：搜歌、列标签、热门、主题聚会、经文推荐、歌单、加歌
- 对话存 localStorage
- 配置：`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`

### 歌谱 OCR
- 自动：上传/保存/打开详情（歌词为空时）
- 手动：「从歌谱识别」
- Gemini 支持 PDF；OpenAI 兼容仅图片

### 分享
- type: `song` | `meeting` | `playlist`
- 公开页无需登录；token 随机串

### 数据
- Excel 导入（LEADER+）/ 导出（全员）
- 未覆盖：标签、经文、LRC、多页路径

### 团队
- 仅成员可见（API 403）
- 聊天、共享歌曲、成员搜索添加

### 用户
- 邮箱注册 + 验证码
- 手机验证码登录
- 四角色 RBAC

### 国际化
- EN/中文切换；Cookie 持久化

---

## 维护脚本

```bash
pnpm sync-song-initials      # 补全 titleInitial / titleInitialOrder
pnpm dedupe-songs            # 预览重复合并
pnpm dedupe-songs --apply    # 执行去重
```

---

## 测试文件命名约定

| 被测对象 | 测试路径 |
|----------|----------|
| `src/app/api/songs/route.ts` | `tests/api/songs.test.ts` |
| `src/app/api/songs/[id]/route.ts` | `tests/api/songs-[id].test.ts` |
| `src/lib/sheet-pdf-merge.ts` | `tests/lib/sheet-pdf-merge.test.ts` |

Mock：`tests/helpers/mock-prisma.ts`
