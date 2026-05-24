---
description: 查看 SVN 仓库目录内容
argument-hint: [仓库URL或路径]
allowed-tools: [Bash(svn list:*), Read, Glob]
---

如果没有参数：
- 先尝试在当前上下文下运行 `svn list`

如果提供了 URL 或路径：
- 运行 `svn list <参数>`

输出要求：
- 用中文列出目录内容
- 如果是远程 URL，说明这是仓库视图不是工作副本状态
