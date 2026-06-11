# CSS → Android 属性映射

蓝湖导出的 CSS/WXSS 属性到 Android View XML 属性的映射规则。

## 尺寸转换

所有尺寸通过 DPI 公式转换：`dp = px × 160 / dpi`

| CSS/WXSS 属性 | Android 属性 | 转换规则 |
|---|---|---|
| `width: Npx` / `width: Nrpx` | `android:layout_width` | `Nrpx × 160 / dpi` → dp |
| `height: Npx` / `height: Nrpx` | `android:layout_height` | 同上 |
| `width: 750rpx` | `android:layout_width="match_parent"` | 蓝湖全宽 |
| `font-size: Npx` / `font-size: Nrpx` | `android:textSize` | 转换为 sp（同 dp 公式） |
| `padding: Npx` | `android:padding` | dp 转换 |
| `padding-{dir}: Npx` | `android:padding{Dir}` | 分方向 padding |
| `margin: Npx` | `android:layout_margin` | dp 转换 |
| `margin-{dir}: Npx` | `android:layout_margin{Dir}` | 分方向 margin |
| `border-radius: Npx` | shape drawable `corners android:radius` | dp 转换 |
| `border-width: Npx` | shape drawable `stroke android:width` | dp 转换 |

## 颜色

| CSS 属性 | Android 映射 |
|---|---|
| `color: #RRGGBB` | `android:textColor="@color/..."` |
| `background-color: #RRGGBB` | `android:background="@color/..."` |
| `border-color: #RRGGBB` | shape drawable `stroke android:color` |
| `background: #RRGGBBAA` | `android:background="@color/..."` (含 alpha 时用 AARRGGBB) |

## 布局

| CSS 属性 | Android 映射 |
|---|---|
| `display: flex` + `flex-direction: column` | `LinearLayout` `orientation="vertical"` |
| `display: flex` + `flex-direction: row` | `LinearLayout` `orientation="horizontal"` |
| 绝对定位或无 flex 嵌套 | `ConstraintLayout` + constraints |
| `align-items: center` | `android:gravity="center_vertical"` (column) / `center_horizontal` (row) |
| `justify-content: center` | `android:gravity="center"` |
| `justify-content: space-between` | `ConstraintLayout` + spread chain 或 `Space` View |
| `flex: 1` | `android:layout_weight="1"` (LinearLayout) |

## 文本样式

| CSS 属性 | Android 映射 |
|---|---|
| `font-weight: bold` | `android:textStyle="bold"` |
| `font-weight: normal` | `android:textStyle="normal"` |
| `text-align: center` | `android:gravity="center"` |
| `text-align: left` | `android:gravity="start"` |
| `text-align: right` | `android:gravity="end"` |
| `line-height: Npx` | `android:lineSpacingExtra` |
| `text-decoration: underline` | 使用 `Html.fromHtml` 或 Spannable，布局中不映射 |
| `ellipsis` / `text-overflow` | `android:ellipsize="end"` + `android:maxLines="1"` |

## 控件类型映射

| 蓝湖节点 / CSS class | Android 控件 | 说明 |
|---|---|---|
| `<text>` / 纯文本 | `TextView` | 默认 |
| `<image>` / 图标 class | `ImageView` | `android:src` 需用户提供 |
| `<button>` / `btn-*` class | `Button` 或项目自定义按钮 | 先查项目 |
| `<input>` / 输入框 class | `EditText` | 包含 `android:inputType` |
| 列表 / scroll / recycler class | `RecyclerView` | 需同时生成 item 布局 |
| `<view>` / 分隔线 / 占位 | `View` | 背景色作为分隔 |
| 容器（嵌套子元素） | `LinearLayout` 或 `ConstraintLayout` | 根据布局复杂度选择 |

## 不被支持的 CSS 属性

以下属性无法直接映射到 Android View XML，转换时忽略并报告：

- `box-shadow` — Android 用 `elevation` 替代（API 21+），但 shape drawable 不支持阴影
- `transform: rotate/scale/skew` — Android 用 `android:rotation/scaleX/scaleY`，但仅 API 11+
- `opacity` — `android:alpha`（0.0–1.0 之间）
- `z-index` — Android View 的绘制顺序由 XML 声明顺序决定，或用 `android:elevation`
- CSS 渐变 — 需转为 XML shape gradient drawable（较复杂，报告建议人工处理）
- CSS 动画 — 不支持，建议用 `ObjectAnimator` 或 Transition 框架
