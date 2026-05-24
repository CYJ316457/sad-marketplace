---
description: 切换当前工作副本到另一个分支或路径
argument-hint: <目标URL>
allowed-tools: [Bash(svn switch:*), Bash(svn info:*), Read, Glob]
---

这是会改变工作副本来源的操作。

如果用户没有提供目标 URL：
- 要求用户补充

如果提供了目标 URL：
- 先运行 `svn info`
- 明确说明将执行 `svn switch <目标URL>`
- 在用户明确确认后再执行
