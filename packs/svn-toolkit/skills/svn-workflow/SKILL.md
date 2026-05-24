---
name: svn-workflow
description: Use when the user asks in Chinese to submit svn, view svn log, update svn, inspect svn status, resolve svn conflicts, or perform common Subversion workflows.
---

# SVN Workflow

先确认当前目录是不是 SVN 工作副本，再执行对应命令。优先使用中文解释结果，并给出下一步建议。

常见触发：
- `提交svn`
- `查看svn log`
- `更新svn`
- `查看svn状态`
- `解决svn冲突`

工作流程：
1. 先运行 `svn info` 或 `svn status` 确认工作副本有效。
2. 查看状态用 `svn status`。
3. 查看历史用 `svn log -l 10`，如果用户给了路径或条数，按参数收窄。
4. 更新代码用 `svn update`。
5. 提交前先汇总变更，再建议或执行 `svn commit -m "<message>"`。
6. 遇到冲突时，先列出冲突文件，再说明 `svn resolve` 或手工处理步骤。

注意：
- 不要在用户没有确认时擅自提交。
- 提交信息优先用中文，简洁描述本次修改。
- 如果目录不是 SVN 工作副本，直接明确说明，不要假设可用。
