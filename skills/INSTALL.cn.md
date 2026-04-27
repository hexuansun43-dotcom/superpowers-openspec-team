# 源码层安装说明

`skills/` 保存的是本仓库维护用的 workflow 源定义。

它不是面向最终用户的主要安装入口。请使用 `sot` CLI 代替。

## 什么时候直接使用 `skills/`

只有在下面这些场景，才建议直接使用 `skills/`：

- 维护源码 workflow
- 为新工具编写适配器（在 `src/core/adapters/` 下新增）
- 阅读原始 workflow 定义

## 最终用户怎么安装

推荐使用 CLI 将 workflow 安装到项目中：

```bash
# 自动检测工具并安装所有技能
sot init /path/to/project

# 指定工具
sot init /path/to/project --tool claude-code

# 同时安装项目记忆模板
sot init /path/to/project --with-memory
```

初始化后，在 AI 工具中显式调用工作流即可：

```text
Use the openspec-superpowers workflow for this feature.
```

### 旧版脚本安装方式

如果无法使用 CLI，旧版安装脚本仍然可用：

- Codex：`scripts/install-codex.ps1` 或 `scripts/install-codex.sh`
- Cursor：`scripts/install-cursor.ps1` 或 `scripts/install-cursor.sh`
- Claude Code：`scripts/install-claude-code.ps1` 或 `scripts/install-claude-code.sh`

可选记忆脚手架：

- `scripts/install-superpowers-memory.ps1 -ProjectRoot <project-root>`

## 为什么不再推荐直接复制源码 workflow

因为部分源码 workflow 是编排型 workflow，本身会依赖其他 workflow 或外部 skills。

这种模块化设计对维护者很好，但对最终用户并不友好。用户通常会以为复制一个目录就能直接使用，实际上往往还缺依赖。

CLI 和 `dist/` 下的 bundle 才是推荐的安装路径。
