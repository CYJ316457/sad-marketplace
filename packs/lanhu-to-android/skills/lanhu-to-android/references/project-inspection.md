# 项目扫描指南

在生成 Android XML 之前，扫描目标项目以复用现有资源和约定。

## 扫描步骤

### 1. 确认模块结构

```bash
# 确认 res 目录存在
ls <android-root>/res/layout
ls <android-root>/res/values
```

必须包含 `res/` 目录，否则停止并要求用户提供正确路径。

### 2. 提取已有资源

colors.xml — 解析颜色值，避免生成重复颜色：

```python
# 脚本会自动处理，见 convert.py 的 scan_project()
# 提取格式：{ "#FFFFFF": "white", "#333333": "text_primary", ... }
```

dimens.xml — 解析尺寸值，复用完全匹配的 dimen：

```python
# { "16dp": "padding_default", "24sp": "text_body", ... }
```

strings.xml — 解析字符串，复用完全匹配的文本：

```bash
rg 'name="(.+?)">(.+?)<' <android-root>/res/values/strings.xml
```

### 3. 提取自定义 View

搜索 Kotlin/Java 源文件中的自定义 View 类：

```bash
# 搜索自定义 View 类定义
rg "class \w+.*(?:View|Layout|Button|EditText|ImageView)" <android-root>/../java
rg "class \w+.*(?:View|Layout|Button|EditText|ImageView)" <android-root>/../kotlin

# 搜索布局文件中已用的自定义 View（含包名的标签）
rg "<[a-z_]+\.[A-Z]" <android-root>/res/layout

# 搜索常见自定义 View 包名
rg "widget|component|view\.custom|ui\.view" <android-root>/../java --files
```

输出格式（供 convert.py 使用）：

```json
[
  {
    "class": "com.example.widget.RoundImageView",
    "extends": "ImageView",
    "description": "圆角图片控件"
  },
  {
    "class": "com.example.widget.StatusBadge",
    "extends": "TextView",
    "description": "状态标签"
  }
]
```

### 4. 提取布局命名约定

```bash
ls <android-root>/res/layout/*.xml | head -20
```

常见模式：
- `activity_*.xml` — Activity 布局
- `fragment_*.xml` — Fragment 布局
- `item_*.xml` — RecyclerView item
- `dialog_*.xml` — 对话框
- `include_*.xml` — 复用布局

### 5. 检查 DataBinding / ViewBinding

```bash
rg "dataBinding|viewBinding" <project-root>/app/build.gradle
rg "DataBindingUtil|ActivityMainBinding|inflate" <android-root>/../java
```

如果启用了 DataBinding，生成布局时包裹 `<layout>` 标签。

### 6. 检查 AndroidManifest

```bash
rg "package=" <android-root>/AndroidManifest.xml
```

获取包名用于自定义 View 的完整类路径。

## 脚本自动化

以上扫描步骤已内置于 `scripts/convert.py`：

```bash
python scripts/convert.py --scan-project <android-root>
```

输出 JSON 格式的扫描结果，包含：
- `colors`: 已有颜色映射
- `dimens`: 已有尺寸映射
- `strings`: 已有字符串映射
- `custom_views`: 检测到的自定义 View 列表
- `layout_prefixes`: 布局文件命名前缀统计
- `uses_databinding`: 是否启用 DataBinding
- `package_name`: AndroidManifest 中的包名
