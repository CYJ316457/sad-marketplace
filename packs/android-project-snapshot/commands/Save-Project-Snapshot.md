---
description: 'Android 项目快照：将 Android 项目的架构、技术栈、API、数据模型等信息提取并保存到知识库'
argument-hint: <project-path> [project-name]
allowed-tools: [Glob, Grep, Read, Bash(cat*), Write, mcp__zhishiku__incremental_index]
---

# Save-Project-Snapshot

使用 `/android-project-snapshot` skill 将 Android 项目信息提取到知识库。建议通过 skill 方式调用。

## 用法

```bash
# 方式一：使用 skill（推荐）
/android-project-snapshot /path/to/android-project

# 方式二：直连此命令
cd /path/to/android-project && Save-Project-Snapshot

# 指定项目名称（用于知识库文件夹名）
/android-project-snapshot /path/to/android-project "我的应用"
```

## 执行后结构

执行完成后会在知识库中创建：

```
android/<项目名称>/
├── 目录与概览.md
├── 01-架构与分层.md
├── 02-技术栈与依赖.md
├── 03-API接口文档.md
├── 04-数据模型.md
├── 05-UI规范与组件.md
├── 06-导航路由.md
└── 07-项目规范与约定.md
```

## 执行流程

1. 读取 `build.gradle.kts` 获取 SDK 版本和依赖
2. 探索 `app/src/main/java/` 下的包结构
3. 读取 `AndroidManifest.xml`
4. 分析 API 层、数据层、UI 层的关键文件
5. 生成 Markdown 笔记并保存到知识库
6. 刷新知识库索引

## 前提

- 目标路径必须是一个有效的 Android Gradle 项目
- 知识库 vault 路径必须可用（`C:\Users\C\Documents\Obsidian Vault`）