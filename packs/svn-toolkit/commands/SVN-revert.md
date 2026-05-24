---
description: 回退当前 SVN 工作副本中的本地改动
argument-hint: <路径>
allowed-tools: [Bash(svn revert:*), Bash(svn status:*), Read, Glob]
---

这是会丢失本地改动的操作。

如果用户没有提供路径：
- 先提醒需要明确目标
- 不要默认整仓回退

如果提供了路径：
- 先运行 `svn status <路径>`
- 明确说明将执行 `svn revert <路径>`
- 在用户明确确认后再执行
