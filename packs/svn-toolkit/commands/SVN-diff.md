---
description: 查看当前 SVN 工作副本或目标路径的差异
argument-hint: [路径]
allowed-tools: [Bash(svn diff:*), Bash(svn status:*), Read, Glob]
---

先用 `svn status` 快速确认是否存在改动，再执行 diff。

如果没有参数：
- 运行 `svn diff`

如果给了路径：
- 运行 `svn diff <路径>`

输出要求：
- 用中文总结改动文件和改动类型
- diff 很长时先概述重点，再按需展开具体片段
