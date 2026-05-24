---
description: 查看文件各行最后一次由谁修改
argument-hint: <文件路径>
allowed-tools: [Bash(svn blame:*), Read, Glob]
---

如果用户没有提供文件路径，要求用户补充。

如果提供了路径：
- 运行 `svn blame <路径>`

输出要求：
- 用中文总结主要修改者和关键行
- 如果文件太长，只提炼重点区段
