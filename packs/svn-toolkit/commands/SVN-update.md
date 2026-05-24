---
description: 更新当前 SVN 工作副本并汇总结果
argument-hint: [路径]
allowed-tools: [Bash(svn update:*), Bash(svn info:*), Read, Glob]
---

先确认目标目录是不是 SVN 工作副本，再执行更新。

如果没有参数：
- 运行 `svn update`

如果给了路径：
- 运行 `svn update <路径>`

输出要求：
- 用中文总结更新结果
- 如果出现冲突，列出冲突文件并说明下一步处理建议
