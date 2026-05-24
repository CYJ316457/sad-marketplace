---
description: 从 SVN 中删除文件或目录
argument-hint: <路径>
allowed-tools: [Bash(svn delete:*), Bash(svn status:*), Read, Glob]
---

如果用户没有提供路径，要求用户补充要删除的文件或目录。

如果提供了路径：
- 先运行 `svn status <路径>` 检查状态
- 再说明将执行 `svn delete <路径>`
- 执行后用中文总结结果

注意：
- 如果用户只是想丢弃本地未跟踪文件，不要误用这个命令
