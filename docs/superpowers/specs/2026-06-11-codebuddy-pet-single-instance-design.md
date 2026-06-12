# CodeBuddy Pet 单实例设计

日期：2026-06-11

## 目标

避免重复执行 `CodeBuddy-Pet-init`、`CodeBuddy-Pet-show` 或 `start` 时，为同一个项目启动多个桌宠窗口。

如果目标项目的桌宠实例已经在运行，CLI 应该复用现有窗口：不再启动新的 Electron 进程，只输出“已经在运行”的提示并成功退出。

## 选定方案

使用两层本地保护：

1. 项目本地 PID/心跳记录：

   ```text
   <project>/.codebuddy/codebuddy-pet/pet.pid
   ```

2. 项目本地启动锁目录：

   ```text
   <project>/.codebuddy/codebuddy-pet/start.lock
   ```

3. 项目本地启动锁恢复目录：

   ```text
   <project>/.codebuddy/codebuddy-pet/start-recovery.lock
   ```

CLI 在启动 Electron 前读取 `pet.pid`。只有当记录同时满足以下条件时，才认为桌宠已经在运行：

- `name` 是 `codebuddy-pet`。
- `project` 等于当前项目路径。
- `pid` 对应的进程仍然存活。
- `updatedAt` 是最近心跳，未超过过期时间。

这样可以避免因为系统 PID 复用或无关进程 PID 写入 `pet.pid` 而误判。

如果没有有效运行实例，CLI 会通过原子创建 `start.lock` 保护启动流程。拿不到锁时，说明另一个 `init/show/start` 正在启动桌宠，当前命令输出“already starting”并成功退出，避免并发命令同时 spawn 两个 Electron 进程。

Electron runtime 启动后会定期刷新 `pet.pid`，让长时间运行的桌宠持续保持可识别。

## 范围

本次包含：

- 在 `packs/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js` 增加 PID 记录读写、有效性判断和启动锁逻辑。
- 在 `startPet(project)` 里增加单实例判断，已有有效桌宠实例时不再启动 Electron。
- 获取启动锁后再次读取 `pet.pid`，避免并发命令基于锁前的过期观察启动第二个窗口。
- 对损坏、过期、无关的 PID 记录做忽略、清理或覆盖。
- 使用 `start-recovery.lock` 串行化陈旧 `start.lock` 的清理，避免两个恢复者互相删除对方的新锁。
- 在 Electron runtime `main.js` 中，窗口创建成功后再用临时文件加 rename 的方式原子刷新 `pet.pid` 心跳。
- 对项目路径做规范化后再写入和比较，降低 Windows 路径大小写差异导致的误判。
- 增加聚焦测试，覆盖：
  - 有效运行实例不重复启动。
  - 无关 live PID 不误判为桌宠。
  - 启动锁被其他活进程持有时不启动。
  - 损坏 PID 文件不会阻塞启动。

本次不包含：

- 将已有窗口拉到前台或聚焦。
- 保存 / 恢复桌宠窗口位置。
- 增加 socket 或 IPC 控制命令。
- 修改 hook 行为、状态映射或动画渲染逻辑。

## 行为流程

对 `init`、`show` 和 `start` 都适用：

1. 命令执行到 `startPet(project)`，除非用户通过 `--no-start` 或 `CODEBUDDY_PET_NO_START=1` 跳过启动。
2. `startPet(project)` 在安装依赖和解析 Electron 可执行文件之前，先检查：

   ```text
   <project>/.codebuddy/codebuddy-pet/pet.pid
   ```

3. 如果 PID 文件记录的是当前项目的、最近有心跳的、仍然存活的 `codebuddy-pet` 进程，命令输出类似：

   ```text
   CodeBuddy Pet already running for <project>
   ```

   然后成功退出，不启动新的桌宠窗口。

4. 如果 PID 文件不存在、格式错误、没有有效 PID、项目不匹配、名称不匹配、心跳过期，或者 PID 对应进程已退出，则认为没有有效运行实例。
5. CLI 尝试原子创建：

   ```text
   <project>/.codebuddy/codebuddy-pet/start.lock
   ```

6. 如果启动锁已被一个身份匹配且仍然存活的启动进程持有，命令输出类似：

   ```text
   CodeBuddy Pet already starting for <project>
   ```

   然后成功退出，不启动新的桌宠窗口。

7. 如果启动锁不存在或已过期，当前命令获取锁，然后再次读取 `pet.pid` 做锁内二次确认；如果另一个命令刚刚启动了桌宠，则当前命令输出 `already running` 并退出。
8. 锁内二次确认仍未发现有效实例时，正常安装依赖、解析 Electron、spawn runtime。
9. CLI 释放 `start.lock`。
10. Electron runtime 运行期间每隔数秒刷新 `pet.pid` 的 `updatedAt`。

## 错误处理

- PID 文件不存在：正常启动。
- PID 文件内容损坏：忽略旧内容，启动成功后覆盖。
- PID 是无关进程：忽略旧内容，正常启动。
- PID 心跳过期：删除或覆盖旧记录，然后正常启动。
- 进程检查失败：默认按“未运行”处理；如果操作系统明确表示该 PID 存活但当前进程无权限访问，则按“仍在运行”处理。
- 启动锁内容损坏或锁持有进程已退出：视为陈旧锁；获取 `start-recovery.lock` 后再清理并重试，避免多个恢复者并发抢锁。
- 新鲜但损坏的 `owner.json`：暂时视为仍在启动，直到过期后再恢复。
- 启动锁 owner 时间很旧但 owner PID 仍存活且身份匹配：视为仍在启动，不抢锁，避免长时间 `npm install` 期间并发启动。
- 启动锁目录刚创建但 `owner.json` 尚未写入：在锁目录 mtime 宽限期内视为仍在启动，避免 mkdir 与写 owner 之间的竞态。
- `pet.pid` 心跳写入：使用临时文件加 rename，避免 CLI 读取到半截 JSON。
- spawn 失败：清理 PID 记录并释放启动锁，方便下次命令重试。
- `child.pid` 缺失：保持现有启动行为，但不写 PID 记录。
- 通过 `.cmd`、`.bin` shim 或 `npx` 启动 Electron 时：不把 launcher/shim 的 PID 写成桌宠 PID，等待 runtime 自己写心跳。

## 测试计划

在 `tests/marketplace.test.ts` 增加偏集成测试：

1. 创建临时 project workspace。
2. 使用 `init --project <workspace> --no-start --no-install` 安装本地 runtime 文件，但不启动 Electron、不安装依赖。
3. 手动准备 `pet.pid`、`start.lock` 或轻量 Electron shim。
4. 执行 `node codebuddy-pet.js start --project <workspace>`。
5. 断言：
   - 有效运行实例时 stdout 包含 `already running`，且没有继续安装依赖。
   - 无关 live PID 时 stdout 包含 `started`。
   - 有效启动锁存在时 stdout 包含 `already starting`，且不包含 `started`。
   - 损坏 PID 文件时 stdout 包含 `started`。

实现后运行：

```bash
npm test -- tests/marketplace.test.ts -t "codebuddy-pet"
npm run typecheck
```
