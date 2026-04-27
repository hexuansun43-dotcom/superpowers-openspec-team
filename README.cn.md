# Superpowers + OpenSpec Team Skills

面向 AI 编程助手的 CLI 驱动工作流技能库。一条命令即可将结构化交付流程安装到 Claude Code（含 oh-my-claudecode）、Cursor、Codex 或 Gemini CLI。

## 快速开始

```bash
npm install -g superpowers-openspec-team

# 自动检测并初始化所有已安装的 AI 工具
sot init /path/to/your/project

# 或者指定工具
sot init /path/to/your/project --tool claude-code

# 同时安装项目记忆模板
sot init /path/to/your/project --with-memory
```

初始化后，在 AI 工具中显式调用工作流即可：

```text
Use the openspec-superpowers workflow for this feature.
```

## CLI 命令

`sot` CLI (v2.0.0) 是安装、构建、校验和管理工作流技能的主要方式。

### sot init

将技能初始化到项目中，支持一个或多个 AI 工具。

```bash
sot init /path/to/project                 # 自动检测工具
sot init . --tool claude-code,cursor       # 指定工具
sot init . --tool codex --force            # 跳过确认提示
sot init . --with-memory                   # 安装 .superpowers-memory/ 模板
sot init . --dry-run                       # 只预览，不写入
sot init . --backup                        # 覆盖前先备份
sot init . --tool claude-code --force --json  # 适合 agent 调用的 JSON 输出
```

### sot update

更新已安装的技能。只覆盖带有 `generatedBy: sot@` 标记的文件，手动编辑过的文件不会被覆盖。

```bash
sot update /path/to/project
sot update . --dry-run
sot update . --backup
```

### sot build

从 `skills/` 源定义构建 `dist/` 分发包。维护者在修改源码工作流后使用。

```bash
sot build
sot build --json
```

### sot validate

校验安装完整性。检查 generatedBy 标记、校验和、以及记忆文件日期格式。

```bash
sot validate /path/to/project
sot validate . --json
```

### sot list

列出可用技能和已检测到的已安装工具。

```bash
sot list
sot list --json
```

### sot install-deps

检查和安装 `workflow.yaml` 中声明的运行时依赖。

```bash
sot install-deps              # 仅检查
sot install-deps --force      # 安装缺失的依赖
sot install-deps --json
```

### sot config

查看或修改全局配置。

```bash
sot config                    # 显示所有设置
sot config --get defaultTools
sot config --set defaultTools=claude-code,cursor
sot config --set backupEnabled=true
```

有效配置键：`defaultTools`、`deliveryMode`、`backupEnabled`。

### 全局选项

所有命令支持 `--json` 输出机器可读格式，以及 `--debug` 输出详细日志。

## 支持的工具

内置 4 个适配器：

| 适配器 | ID | 写入位置 |
|--------|----|----------|
| Claude Code | `claude-code` | `.claude/commands/`、`CLAUDE.md`（同时检测 oh-my-claudecode） |
| Cursor | `cursor` | `.cursor/rules/`、`AGENTS.md` |
| Codex | `codex` | Codex home skills 目录 |
| Gemini CLI | `gemini` | `GEMINI.md`、`gemini-extension.json` |

## 项目记忆系统 (.superpowers-memory/)

使用 `sot init --with-memory` 时，项目会获得 `.superpowers-memory/` 目录，为 AI 提供轻量级跨会话记忆：

- `PROJECT_CONTEXT.md` -- 稳定的项目事实和架构
- `CURRENT_STATE.md` -- 最新工作现场和下一步
- `DECISIONS.md` -- 跨会话的设计与流程决策
- `KNOWN_FAILURES.md` -- 重复出现的失败模式和陷阱
- `VERIFICATION_BASELINE.md` -- 可信的验证方法
- `TEAM_PREFERENCES.md` -- 稳定的协作偏好
- `USER_PROFILE.md` -- 用户沟通和输出偏好
- `AGENT_NOTES.md` -- 执行提醒和质量备忘
- `LEARNING_BACKLOG.md` -- 待晋升的可复用经验
- `SESSION_CLOSE_CHECKLIST.md` -- 会话收尾检查清单
- `memory-index.yaml` -- 健康度元数据和新鲜度追踪
- `session-journal/` -- 每次有意义会话的简短记录

记忆是可选的。只有在 `.superpowers-memory/` 存在且 Superpowers 工作流读取它时才会激活。

## 推荐工作流

| 工作流 | 用途 |
|--------|------|
| `openspec-superpowers` | 端到端：从需求澄清到验证完成 |
| `superpowers-openspec-execution` | 四步走：探索、锁定规范、实现、归档 |
| `superpowers-feature` | 设计、计划、TDD、验证 -- 不生成 OpenSpec 产物 |
| `superpowers-learning` | 反思沉淀经验和项目记忆 |
| `openspec-feature` | 只做 OpenSpec 提案、设计、规范、任务 |

对长期项目，推荐的模式是：用交付型工作流完成工作，再用 `superpowers-learning` 沉淀长期经验。

## 仓库结构

```text
skills/        工作流源定义（面向维护者）
dist/          工具适配分发包（由 sot build 从 skills/ 生成）
src/           CLI 源码（TypeScript）
templates/     记忆模板脚手架
bin/           CLI 入口
test/          测试套件（vitest）
```

`skills/` 是源定义。`dist/` 由 `sot build` 从 `skills/` 确定性生成，不要直接编辑 `dist/`。

## 显式启用规则

这些工作流只应在以下情况启用：

- 用户明确点名某个工作流
- 用户明确要求按该流程做
- 仓库策略文件明确要求使用该工作流

它们不应被当成所有编码任务的默认后台行为。安装后保持正常提问，只在需要时显式调用工作流。

## 开发 & 贡献

```bash
# 构建 CLI
npm run build

# 类型检查
npx tsc --noEmit

# 运行测试
npm test

# 监听测试
npm run test:watch
```

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 文档索引

- [English README](README.md)
- [源码工作流总览](skills/README.cn.md)
- [源码安装说明](skills/INSTALL.cn.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [更新日志](CHANGELOG.md)
- [行为准则](CODE_OF_CONDUCT.md)
