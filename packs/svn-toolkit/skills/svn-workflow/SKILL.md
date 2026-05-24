---
name: svn-workflow
description: Use when the user asks in Chinese to submit svn, view svn log, inspect svn status, diff files, update working copies, add or delete files, revert changes, resolve conflicts, blame lines, list repository paths, switch branches, clean up locks, or perform common Subversion workflows.
---

# SVN Workflow

先确认当前目录是不是 SVN 工作副本，再执行对应命令。优先使用中文解释结果，并给出下一步建议。

常见触发：
- `提交svn`
- `查看svn log`
- `查看svn信息`
- `更新svn`
- `查看svn状态`
- `查看svn diff`
- `svn add`
- `svn delete`
- `svn revert`
- `解决svn冲突`
- `查看svn blame`
- `查看svn目录`
- `svn switch`
- `svn cleanup`

工作流程：
1. 先运行 `svn info` 或 `svn status` 确认工作副本有效。
2. 查看基本信息用 `svn info`，查看状态用 `svn status`，查看差异用 `svn diff`。
3. 查看历史用 `svn log -l 10`，如果用户给了路径或条数，按参数收窄。
4. 更新代码用 `svn update`；清理锁或异常状态用 `svn cleanup`。
5. 新增文件用 `svn add`，删除版本控制文件用 `svn delete`，回退本地改动用 `svn revert`。
6. 提交前先汇总变更，再建议或执行 `svn commit -m "<message>"`。
7. 遇到冲突时，先列出冲突文件，再说明 `svn resolve` 或手工处理步骤。
8. 查看某行责任人用 `svn blame`；查看仓库目录可用 `svn list`；切换分支或路径用 `svn switch`。

注意：
- 不要在用户没有确认时擅自提交。
- 提交信息优先用中文，简洁描述本次修改。
- 如果目录不是 SVN 工作副本，直接明确说明，不要假设可用。
