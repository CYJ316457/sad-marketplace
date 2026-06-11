---
name: lanhu-to-android
description: 将蓝湖导出的 XML/WXML + CSS/WXSS 转换为 Android View XML。询问 DPI、设计稿宽度、是否复用项目自定义 View 后再生成。支持 ConstraintLayout / LinearLayout，自动映射 CSS 属性到 Android 布局属性。
metadata:
  short-description: 蓝湖 XML+CSS → Android View XML（DPI 感知、交互式）
---

# 蓝湖 XML+CSS → Android View XML

把蓝湖导出的布局代码转为 Android View XML。**不是盲目转换**——先询问关键参数、扫描项目中的自定义 View、确认后再生成文件。

## 输入格式

接受以下任一输入：
- 蓝湖导出的 `*.wxml` + `*.wxss`
- 蓝湖代码视图复制的纯文本（含 XML+CSS 片段）
- 标准 HTML 片段 + 内联 CSS
- 用户直接粘贴的 XML/CSS 文本

不接受 Compose 输出（那是另一个 skill 的事）。

## 交互式工作流（必须执行）

### 步骤 0：收集输入

确定用户提供了什么：
- 文件路径还是粘贴文本？
- 目标 Android 项目路径（必须包含 `src/main/res`）

### 步骤 1：询问 DPI 和设计稿尺寸 ⚠️ 必须询问

向用户提两个问题：

> **Q1**: 设计稿宽度是多少 px？（如 iPhone 标准 375、750，或蓝湖页面显示的宽度）
>
> **Q2**: 目标设备 DPI 是多少？
> - `mdpi` (160) — 老款小屏
> - `hdpi` (240)
> - `xhdpi` (320) — 常见手机
> - `xxhdpi` (480) — 高分辨率手机
> - `xxxhdpi` (640) — 2K/4K 屏幕

**计算公式**：`dp = px × 160 / dpi`

如果用户不确定，给出建议："如果是 iPhone 设计稿（375px 宽度）转 Android xxhdpi 设备，选 xhdpi(320) 或 xxhdpi(480)。大多数情况选 xxhdpi(480) 转出来的 dp 最接近实际。"

### 步骤 2：扫描项目自定义 View ⚠️ 必须询问

运行脚本扫描目标 Android 项目中的自定义 View：

```bash
python scripts/convert.py --scan-project <项目路径>
```

输出项目中发现的自定义 View 列表。然后向用户确认：

> 在项目中发现了以下自定义 View：
> - `com.example.widget.RoundImageView` — 圆角图片
> - `com.example.widget.StatusBadge` — 状态标签
>
> 是否在生成的布局中使用它们？推荐替换为自定义 View 的请声明映射：
> - `ImageView` → `RoundImageView`
> - 状态文字 → `StatusBadge`

### 步骤 3：生成布局预览

运行转换脚本（dry-run）：

```bash
python scripts/convert.py \
  --input-xml <蓝湖XML路径或文本> \
  --input-css <蓝湖CSS路径或文本> \
  --design-width-px <设计稿宽度> \
  --target-dpi <目标DPI数值> \
  --android-root <项目res父目录> \
  --layout-name <布局文件名> \
  --custom-view-map <映射JSON路径> \
  --dry-run
```

输出：生成的布局 XML 预览 + 资源报告（颜色、尺寸、drawable、缺失资源）。

**先给用户看预览，确认没问题再写入。**

### 步骤 3.5：审查校验 ⚠️ 自动执行

`--dry-run` 输出已自带校验和审查结果（`validation` + `review` 字段）。向用户展示：

| 级别 | 含义 | 行为 |
|------|------|------|
| `error` | 阻断级（缺少 layout_width/height、XML 语法错误） | `--write` 会**拒绝写入** |
| `warning` | 建议修复（硬编码尺寸、资源引用不存在） | 允许写入但标注 |
| `info` | 提示（建议加 inputType、scaleType 等） | 仅供参考 |

校验通过（`validation.pass: true`）才能写入。如果被阻断：
- 修好问题后重试
- 或加 `--force` 强制写入（不推荐）

```bash
# 跳过校验（紧急情况）
python scripts/convert.py ... --write --skip-validation

# 校验失败但强制写入
python scripts/convert.py ... --write --force
```

### 步骤 4：写入文件

确认校验通过后加 `--write` 写入：

```bash
python scripts/convert.py ... --write
```

写入路径：
- `res/layout/<name>.xml`
- `res/values/colors.xml`（合并，不覆盖已有值）
- `res/values/strings.xml`（合并）
- `res/values/dimens.xml`（合并）
- `res/drawable/bg_<name>_*.xml`（shape drawable）

### 步骤 5：生成报告

报告内容：
- 生成了哪些文件
- 复用了哪些已有资源（颜色、dimens、strings）
- 新增了哪些资源
- 使用了哪些自定义 View
- 缺失的图片/图标资源（列出建议的文件名和路径）
- 设计稿 → Android 的 dp 转换规则

## 脚本参考

```bash
# 扫描项目自定义 View
python scripts/convert.py --scan-project D:\YourApp\app\src\main

# dry-run 预览
python scripts/convert.py \
  --input-xml page.wxml --input-css page.wxss \
  --design-width-px 375 --target-dpi 480 \
  --android-root D:\YourApp\app\src\main --layout-name activity_demo \
  --dry-run

# 使用自定义 View 映射
echo '[{"pattern":"ImageView","view":"com.example.RoundImageView"},{"pattern":"text.status","view":"com.example.StatusBadge"}]' > map.json
python scripts/convert.py ... --custom-view-map map.json --write

# 指定输出 demo（不写文件，输出到 stdout）
python scripts/convert.py ... --output-demo
```

## 参考文档

- 需要了解 CSS 属性到 Android 属性的具体映射时，读 `references/widget-mapping.md`
- 需要了解如何扫描 Android 项目资源时，读 `references/project-inspection.md`
