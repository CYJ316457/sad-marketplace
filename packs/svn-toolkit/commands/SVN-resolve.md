---
description: 标记或处理 SVN 冲突文件
argument-hint: <路径> [accept参数]
allowed-tools: [Bash(svn resolve:*), Bash(svn status:*), Read, Glob]
---

先检查目标是否处于冲突状态。

如果只给了路径：
- 运行 `svn status <路径>`
- 说明可用的 `--accept` 策略

如果给了路径和接受策略：
- 执行 `svn resolve --accept <策略> <路径>`

输出要求：
- 用中文解释当前冲突状态
- 不要掩盖冲突处理带来的后果
