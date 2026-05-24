---
description: 查看当前 SVN 工作副本最近的提交记录
argument-hint: [路径或条数]
allowed-tools: [Bash(svn log:*), Bash(svn info:*), Read, Glob]
---

先确认当前目录或参数指定目录是不是 SVN 工作副本。

如果用户没有提供参数：
- 运行 `svn log -l 10`

如果用户提供的是数字：
- 运行 `svn log -l <数字>`

如果用户提供的是路径：
- 运行 `svn log <路径> -l 10`

输出要求：
- 用中文总结最近提交
- 每条至少包含版本号、作者、时间、摘要
- 如果日志很多，只先给最近几条，并提示可以继续展开
