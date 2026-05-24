---
description: 将新文件或目录加入 SVN 版本控制
argument-hint: <路径>
allowed-tools: [Bash(svn add:*), Bash(svn status:*), Read, Glob]
---

如果用户没有提供路径，要求用户补充目标文件或目录。

如果提供了路径：
- 先运行 `svn status <路径>` 看当前状态
- 再执行 `svn add <路径>`

输出要求：
- 用中文说明加入版本控制的对象
- 如果文件已被版本控制或路径不存在，直接说明
