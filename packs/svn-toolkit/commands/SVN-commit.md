---
description: 汇总变更并指导或执行 SVN 提交
argument-hint: <提交说明>
allowed-tools: [Bash(svn status:*), Bash(svn commit:*), Bash(svn info:*), Read, Glob]
---

先确认当前目录是不是 SVN 工作副本，并先运行 `svn status` 汇总待提交文件。

如果用户没有提供提交说明：
- 先展示待提交内容
- 要求用户补一个中文提交说明

如果用户提供了提交说明：
- 先展示将要提交的文件摘要
- 明确说明将执行 `svn commit -m "<提交说明>"`
- 在获得用户明确确认后再提交

输出要求：
- 用中文总结提交前状态
- 提交后返回版本号和服务端响应摘要
