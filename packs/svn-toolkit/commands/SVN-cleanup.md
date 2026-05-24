---
description: 清理 SVN 工作副本锁和异常状态
argument-hint: [路径]
allowed-tools: [Bash(svn cleanup:*), Bash(svn status:*), Read, Glob]
---

如果没有参数：
- 运行 `svn cleanup`

如果提供了路径：
- 运行 `svn cleanup <路径>`

输出要求：
- 用中文总结清理结果
- 如果 cleanup 后仍有问题，建议下一步检查 `svn status` 或冲突文件
