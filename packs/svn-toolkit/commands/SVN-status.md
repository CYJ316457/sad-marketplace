---
description: 查看当前 SVN 工作副本状态
argument-hint: [路径]
allowed-tools: [Bash(svn status:*), Bash(svn info:*), Read, Glob]
---

先确认目标目录是不是 SVN 工作副本。

如果没有参数：
- 运行 `svn status`

如果给了路径：
- 运行 `svn status <路径>`

输出要求：
- 用中文分类说明新增、修改、删除、未跟踪、冲突文件
- 如果工作区干净，直接明确说“当前没有待提交变更”
