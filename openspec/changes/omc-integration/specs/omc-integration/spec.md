# Spec: OMC Integration

## 需求

### S1: OmcAdapter 实现

**Requirement**: 新增 `OmcAdapter` 适配器，将 skill 以 OMC 兼容格式安装到 `.omc/skills/`。

**Scenarios**:

- **S1.1**: `sot build` 在 `dist/omc/bundles/` 下生成 skill 文件和 manifest.json
  - Given 项目有 5 个 skill
  - When 执行 `sot build`
  - Then `dist/omc/bundles/superpowers-openspec/` 下有 5 个子目录，每个含 SKILL.md
  - And `dist/omc/skill-index.json` 存在且包含 5 个条目

- **S1.2**: OmcAdapter 的 SKILL.md 包含 OMC 兼容 frontmatter
  - Given 一个 skill 有 model_hint=opus, tags=[planning, design], category=orchestration
  - When OmcAdapter.generateSkill() 执行
  - Then 生成文件路径为 `.omc/skills/{name}/SKILL.md`
  - And frontmatter 包含 name, description, model_hint, tags, category

- **S1.3**: OmcAdapter.generateCommands() 返回空数组
  - Given 任意 skill
  - When 调用 generateCommands()
  - Then 返回 []

- **S1.4**: OmcAdapter.generateConfig() 生成 sot-registry.json
  - Given 3 个 skill
  - When 调用 generateConfig()
  - Then 生成 `.omc/skills/sot-registry.json`
  - And JSON 包含 version 和 skills 数组，每个条目含 name, description, model_hint, tags

- **S1.5**: OmcAdapter 检测路径
  - Given 项目根目录存在 `.omc/` 目录
  - When 调用 detect(projectRoot)
  - Then 返回 true
  - Given 项目根目录不存在 `.omc/`
  - When 调用 detect(projectRoot)
  - Then 返回 false

### S2: OMC 检测器

**Requirement**: 纯函数检测 OMC 安装状态，返回结构化结果。

**Scenarios**:

- **S2.1**: 项目本地 OMC 检测
  - Given 项目根有 `.omc/` 目录
  - When 调用 detectOmc(projectRoot)
  - Then result.available === true, result.projectLocal === true

- **S2.2**: 全局 OMC 检测（通过 ~/.claude.json）
  - Given 项目无 `.omc/` 但 `~/.claude.json` 有 MCP server `t`
  - When 调用 detectOmc(projectRoot)
  - Then result.available === true, result.globalInstall === true, result.mcpServerName === 't'

- **S2.3**: 无 OMC 环境
  - Given 项目无 `.omc/`，`~/.claude.json` 无 `t` server，`~/.omc/` 不存在
  - When 调用 detectOmc(projectRoot)
  - Then result.available === false, result.detectionMethod === 'none'

- **S2.4**: 检测优先级
  - Given 项目有 `.omc/` 且全局也有 OMC
  - When 调用 detectOmc(projectRoot)
  - Then result.detectionMethod === 'project-local'（项目本地优先）

### S3: `sot init` 双写增强

**Requirement**: init 命令检测到 OMC 时额外安装 skill 到 `.omc/skills/`。

**Scenarios**:

- **S3.1**: OMC 存在时自动双写
  - Given 项目有 `.omc/` 目录且用户选了 claude-code 适配器
  - When 执行 `sot init .`
  - Then `.claude/skills/` 和 `.omc/skills/` 都有 skill 文件
  - And 控制台输出包含 "OMC detected" 提示

- **S3.2**: OMC 不存在时行为不变
  - Given 项目无 `.omc/` 且无全局 OMC
  - When 执行 `sot init .`
  - Then 行为与当前版本完全一致，无 OMC 相关输出

- **S3.3**: `--tool omc` 显式选择
  - Given 用户执行 `sot init --tool omc .`
  - Then 只安装到 `.omc/skills/`，不安装到 `.claude/skills/`

- **S3.4**: `--json` 模式包含 OMC 信息
  - Given OMC 存在
  - When 执行 `sot init --json .`
  - Then JSON 输出包含 `omcDetected: true` 和 `omcFilesWritten` 数组

### S4: CLAUDE.md Skill 引用注入

**Requirement**: OMC 存在时在 CLAUDE.md 中注入 sot skill 引用块。

**Scenarios**:

- **S4.1**: 注入 SOT 块到有 OMC 块的 CLAUDE.md
  - Given CLAUDE.md 包含 `<!-- OMC:START -->` 和 `<!-- OMC:END -->`
  - When 执行 init 且 OMC 检测通过
  - Then `<!-- OMC:END -->` 之后出现 `<!-- SOT:START -->` 块
  - And 块内列出所有可用 skill 名称和描述

- **S4.2**: 幂等更新
  - Given CLAUDE.md 已有 `<!-- SOT:START -->` 块
  - When 再次执行 init
  - Then 旧 SOT 块被替换为新内容，不产生重复块

- **S4.3**: 无 OMC 时不注入
  - Given 项目无 OMC
  - When 执行 init
  - Then CLAUDE.md 不包含 SOT 块

### S5: `sot doctor` 子命令

**Requirement**: 诊断 OMC 集成健康度并输出报告。

**Scenarios**:

- **S5.1**: 完整诊断输出
  - Given OMC 已安装且 skill 已同步
  - When 执行 `sot doctor`
  - Then 输出包含 5 项检查结果：OMC 安装、skill 数量、CLAUDE.md SOT 块、MCP 注册、registry 版本

- **S5.2**: JSON 输出模式
  - Given 任意状态
  - When 执行 `sot doctor --json`
  - Then 输出合法 JSON，包含 checks 数组和 summary

- **S5.3**: Skill 数量不一致告警
  - Given `.omc/skills/` 中有 3 个 sot skill，源有 5 个
  - When 执行 `sot doctor`
  - Then skill 数量检查项状态为 WARN，提示 "3/5 skills installed, run sot init to sync"

- **S5.4**: 无 OMC 时友好提示
  - Given 项目无 OMC
  - When 执行 `sot doctor`
  - Then 输出 "OMC not detected" 并列出安装指引

### S6: MCP 工具描述增强

**Requirement**: sot serve 的 MCP 工具描述在 OMC 环境下标注互补关系。

**Scenarios**:

- **S6.1**: OMC 存在时工具描述含互补提示
  - Given OMC 检测通过
  - When 启动 `sot serve`
  - Then `sot_query_memory` 的描述包含 "Complements OMC's project_memory_read"

- **S6.2**: OMC 不存在时描述不变
  - Given 无 OMC
  - When 启动 `sot serve`
  - Then 工具描述与当前版本一致

## 非功能性约束

- NF1: OMC 检测耗时 < 50ms（仅 fs.existsSync + JSON.parse）
- NF2: 不引入运行时 npm 依赖
- NF3: 所有新代码有对应单元测试，覆盖率 > 80%
- NF4: 向后兼容——v2.4.0 用户升级后行为不变（OMC 不存在时）
