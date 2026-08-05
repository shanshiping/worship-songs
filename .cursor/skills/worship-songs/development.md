# worship-songs 开发约定

## 编码原则

1. **最小改动** — 只改任务相关文件；逻辑放 `src/lib/`，route 保持薄
2. **沿用惯例** — 命名、import、组件风格与周边文件一致
3. **双语同步** — UI 文案必须同时改 `en.json` 和 `zh.json`
4. **权限双层** — 前端 `usePermissions()` 隐藏 UI；API 必须 `requirePermission()` / 成员校验
5. **测试必过** — 改 API/lib 必加测试；`pnpm test` 全绿再完成

## TypeScript

- 项目规则：`.cursor/rules/no-any.mdc` — 避免 `any`
- 路由动态段：`src/lib/route-params.ts`
- 错误信息：`getErrorMessage()` from `errors.ts`

## API Route 模式

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}
```

- 列表 API：支持 query params，返回 `{ songs, total, page }` 等一致结构
- 创建/更新：Zod 或手动校验 body；Song 创建时调用 `normalizeSongTitle()` 与首字母 sync

## 测试模式

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/json-request'

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/server-permissions', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', role: 'LEADER' }),
  requirePermission: vi.fn(),
}))

describe('GET /api/songs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns songs', async () => {
    mockPrisma.song.findMany.mockResolvedValue([{ id: '1', title: 'Test' }])
    const res = await GET(jsonRequest('http://localhost/api/songs'))
    const data = await readJson(res)
    expect(data.songs).toHaveLength(1)
  })
})
```

- 新 API → 新建 `tests/api/<name>.test.ts`
- 纯函数 → `tests/lib/` 或 `tests/unit/lib/`
- 不测真实 DB；不测 NextAuth 内部

## i18n 添加文案

1. 在 `en.json` 添加键值
2. 在 `zh.json` 添加对应翻译
3. 组件内 `const { t } = useI18n()` → `t('section.key')`
4. 功能指南：`feature-guide.ts` 的 `titleKey` / `descKey` / `tipKeys`

## 新增页面 Checklist

```
- [ ] src/app/(main)/<route>/page.tsx
- [ ] nav-items.ts（若需侧栏）
- [ ] en.json + zh.json（nav.*, 页面文案）
- [ ] feature-guide.ts（若为用户向新功能）
- [ ] README.md + docs/帮助文档.md（用户文档）
- [ ] docs/superpowers/specs/（设计规格，较大功能）
- [ ] tests/（若有 API 或 lib）
```

## 新增 API Checklist

```
- [ ] src/app/api/<path>/route.ts
- [ ] server-permissions 校验
- [ ] tests/api/<path>.test.ts
- [ ] mock-prisma 模型方法若缺失则补充
```

## Prisma / Schema 变更

```bash
npx prisma migrate dev --name <description>
# 或开发快速同步：
npx prisma db push
npx prisma generate
# 重启 pnpm dev
```

Song 相关字段变更时检查：
- `song-title-initial-sync.ts` 是否需更新
- `mockPrisma.song` 测试是否需要新字段
- API select/include 是否兼容旧 Client（参考 `isInitialFieldSchemaError` 降级模式）

## 常见陷阱

| 问题 | 原因 | 处理 |
|------|------|------|
| 歌曲列表空白/500 | Schema 变更后未 generate/重启 | `prisma generate` + 重启 dev |
| 首字母筛选无效 | `titleInitial` 未补全 | `pnpm sync-song-initials` |
| OCR 503 | 未配置 GEMINI/AI | 配置 `.env` 或 graceful 降级 |
| Agent 无响应 | 未配置 `AI_*` | 配置 Groq 等 |
| 合并 PDF 缺页 | 歌曲无 `sheetMusicPages` | 检查 `song-sheet-paths.ts` |
| 分享 404 | id 已删或 token 不匹配 | 正常行为 |
| 团队 403 | 非成员访问 | 预期权限行为 |

## Git 提交风格

参考历史：`feat:`, `fix:` 前缀 + 简短说明

```
feat: add leader song stats page

fix: fallback song list when titleInitial schema mismatch
```

## 部署前

```bash
pnpm test
pnpm build
# Docker: 见 docs/deploy-tencent-cloud-docker.md
```

环境变量：复制 `.env.example` 或 `.env.production.example`

## 扩展 Agent 能力

1. 在 `src/lib/ai/song-agent-tools.ts` 添加 tool
2. 更新 `song-agent-prompt.ts` 说明何时调用
3. 测试：`tests/lib/song-agent-tools.test.ts`, `song-agent-prompt.test.ts`
4. Agent 与 OCR **独立** env，勿混用变量名

## 扩展主领选歌

- 主题：`meeting-theme-search.ts` + `GET /api/meetings?theme=`
- 经文：`scripture-recommendations.ts` + `/api/songs/scripture-recommendations`
- PDF：`sheet-pdf-merge.ts`（pdf-lib）；图片用 sharp 转 PDF 页
- UI：`sheets/page.tsx` + 相关 dialog 组件

## 文档更新触发

| 变更类型 | 更新 |
|----------|------|
| 用户可见功能 | README.md, docs/帮助文档.md |
| 架构/模块 | AGENTS.md, .cursor/skills/worship-songs/* |
| 设计决策 | docs/superpowers/specs/ |
