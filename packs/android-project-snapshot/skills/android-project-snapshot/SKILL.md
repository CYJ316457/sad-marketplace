---
name: android-project-snapshot
description: '将 Android 项目的架构、技术栈、API 等提取并总结到知识库。用法：/android-project-snapshot <项目路径> 或 /android-project-snapshot <项目路径> "项目名称"'
---

# /android-project-snapshot — Android 项目快照到知识库

## 触发方式

用户输入 `/android-project-snapshot <项目路径>` 或 `/android-project-snapshot <项目路径> "项目名称"` 时，必须调用此 Skill。

## 行为

你的任务是将 Android 项目的架构、技术栈、API 定义、数据模型、UI 规范等关键信息提取出来，整理成多篇 Markdown 笔记，保存到知识库（Obsidian Vault）。

**Vault 路径：** `C:\Users\C\Documents\Obsidian Vault`

**目标文件夹：** `android/<项目名称>/`

## 执行步骤

### 第一步：探索项目结构

使用 Glob 和 Grep 工具探索项目，读取以下关键文件：

1. **构建文件**：`app/build.gradle.kts` 或 `app/build.gradle`、项目级 `build.gradle.kts`
2. **Manifest**：`app/src/main/AndroidManifest.xml`
3. **包结构**：列出 `app/src/main/java/com/xxx/` 下的顶层包
4. **Gradle Wrapper**：`gradle/wrapper/gradle-wrapper.properties`（确认 Gradle 版本）

### 第二步：提取关键信息

| 提取点 | 查看的文件 | 用途 |
|--------|-----------|------|
| compileSdk / minSdk / targetSdk | build.gradle.kts | SDK 版本信息 |
| 所有依赖库及版本 | build.gradle.kts | 技术栈清单 |
| 架构分层 | 包目录结构、Base 类 | 包结构和架构模式（MVVM/MVI/MVP） |
| DI 模块 | di/ 或 hilt/ 目录下的文件 | 依赖注入方式、全局单例 |
| API 定义 | network/ 或 api/ 下的 Retrofit 接口 | 后端 API 端点列表 |
| 数据模型 | data/model/ 或 domain/model/ 下的 Entity/DTO | 核心业务表结构 |
| 导航路由 | navigation/ 下的文件 | 页面跳转关系 |
| UI 主题 | res/values/themes.xml, colors.xml | 设计规范 |
| 自定义 View | ui/widget/ 或自定义 View 目录 | 公共 UI 组件 |

### 第三步：生成知识库文件

在 `android/<项目名称>/` 目录下创建以下笔记：

```
android/<项目名称>/
├── 目录与概览.md       ← 项目简介、业务定位、版本信息
├── 01-架构与分层.md    ← 包结构、架构模式、DI 方式
├── 02-技术栈与依赖.md  ← 全部依赖库及版本、构建配置
├── 03-API接口文档.md   ← 后端 API 定义、Base URL、请求/响应结构
├── 04-数据模型.md      ← Entity、DTO、Room 表结构
├── 05-UI规范与组件.md  ← 主题、颜色、公共组件、自定义 View
├── 06-导航路由.md      ← 页面跳转图、路由定义
└── 07-项目规范与约定.md ← 团队 Code Style、Base 类、Utils、踩坑记录
```

### 第四步：保存并索引

1. 用 `Write` 工具将每篇笔记写入 vault
2. 调用 `mcp__zhishiku__incremental_index` 刷新索引
3. 告知用户已保存完毕，并列出生成的文件清单

## 注意事项

- 先在项目根目录确认 Gradle 项目再开始分析
- 如果项目路径不存在或不是 Android 项目，告知用户并退出
- 每个文件都不宜过长，保持可读性；过长可拆分子节
- 代码片段（如 API 定义、Entity）用代码块保留
- 笔记用中文编写，代码注释和标识符保留原文
- 对于 Kotlin 和 Java 混用的项目，两种代码风格都要记录