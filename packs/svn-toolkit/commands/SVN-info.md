---
description: 查看当前 SVN 工作副本或目标路径的基础信息
argument-hint: [路径]
allowed-tools: [Bash(svn info:*), Read, Glob]
---

先确认目标目录或路径可用于 SVN 查询。

如果没有参数：
- 运行 `svn info`

如果给了路径：
- 运行 `svn info <路径>`

输出要求：
- 用中文总结 URL、相对路径、版本号、最后修改作者和时间
- 如果不是 SVN 工作副本，直接明确报错原因
