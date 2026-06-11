#!/usr/bin/env python3
"""
蓝湖 XML+CSS → Android View XML 转换器。

用法:
  # 扫描项目
  python convert.py --scan-project D:\app\src\main

  # dry-run 预览
  python convert.py --input-xml page.wxml --input-css page.wxss \
    --design-width-px 375 --target-dpi 480 \
    --android-root D:\app\src\main --layout-name activity_demo --dry-run

  # 写入文件
  python convert.py ... --write

  # 输出到 stdout
  python convert.py ... --output-demo
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ── 常量 ─────────────────────────────────────────────────────────────────────

RPX_RE = re.compile(r"(-?\d+(?:\.\d+)?)rpx")
PX_RE = re.compile(r"(-?\d+(?:\.\d+)?)px")
CLASS_BLOCK_RE = re.compile(r"\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}", re.S)
PROP_RE = re.compile(r"([A-Za-z-]+)\s*:\s*([^;]+)")
HEX_RE = re.compile(r"^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$")
COMMON_COLORS = {
    "#FFFFFF": "white", "#000000": "black",
    "#FF0000": "red", "#333333": "text_primary",
    "#666666": "text_secondary", "#999999": "text_hint",
    "#F5F5F5": "bg_light", "#EEEEEE": "bg_divider",
    "#0088FF": "accent", "#FF4444": "error",
}

# ── 工具函数 ─────────────────────────────────────────────────────────────────

def snake(s: str) -> str:
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
    s = re.sub(r"[^0-9A-Za-z]+", "_", s).strip("_")
    s = re.sub(r"_+", "_", s)
    return s.lower() or "lanhu"


def xml_escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") \
            .replace('"', "&quot;").replace("'", "&apos;")


def fmt_val(v: float | int) -> str:
    if isinstance(v, int) or v == int(v):
        return str(int(v))
    return str(round(v, 2)).rstrip("0").rstrip(".")


# ── DPI 转换 ─────────────────────────────────────────────────────────────────

def px_to_dp(px: float, dpi: int) -> float:
    """dp = px * 160 / dpi"""
    return px * 160.0 / dpi


# ── 数据类 ───────────────────────────────────────────────────────────────────

@dataclass
class ProjectInfo:
    colors: dict[str, str] = field(default_factory=dict)    # hex -> name
    dimens: dict[str, str] = field(default_factory=dict)    # "16dp" -> name
    strings: dict[str, str] = field(default_factory=dict)   # text -> name
    custom_views: list[dict] = field(default_factory=list)
    layout_prefixes: list[str] = field(default_factory=list)
    uses_databinding: bool = False
    package_name: str = ""


@dataclass
class BuildState:
    """转换过程积累的状态"""
    layout_name: str
    dpi: int
    project: ProjectInfo
    custom_view_map: dict[str, str] = field(default_factory=dict)

    # 输出积累
    new_colors: dict[str, str] = field(default_factory=dict)
    new_dimens: dict[str, str] = field(default_factory=dict)
    new_strings: dict[str, str] = field(default_factory=dict)
    new_drawables: dict[str, str] = field(default_factory=dict)

    # 报告积累
    reused_colors: list[dict] = field(default_factory=list)
    reused_dimens: list[dict] = field(default_factory=list)
    missing_assets: list[dict] = field(default_factory=list)
    widgets_used: dict[str, str] = field(default_factory=dict)

    # 计数器
    _string_n: int = 0
    _drawable_n: int = 0
    _image_n: int = 0

    # ── 资源引用生成 ──

    def color_ref(self, hex_val: str) -> str:
        hv = hex_val.upper()
        if hv in self.project.colors:
            name = self.project.colors[hv]
            self.reused_colors.append({"name": name, "value": hv})
            return f"@color/{name}"
        name = COMMON_COLORS.get(hv, f"color_{hv[1:7].lower()}")
        self.new_colors[name] = hv
        return f"@color/{name}"

    def dimen_ref(self, prefix: str, dp_val: float, unit: str = "dp") -> str:
        literal = f"{fmt_val(dp_val)}{unit}"
        if literal in self.project.dimens:
            name = self.project.dimens[literal]
            self.reused_dimens.append({"name": name, "value": literal})
            return f"@dimen/{name}"
        name = f"lh_{snake(prefix)}_{fmt_val(dp_val).replace('.', '_')}"
        self.new_dimens[name] = literal
        return f"@dimen/{name}"

    def string_ref(self, text: str) -> str:
        if text in self.project.strings:
            return f"@string/{self.project.strings[text]}"
        for k, v in self.new_strings.items():
            if v == text:
                return f"@string/{k}"
        self._string_n += 1
        name = f"{self.layout_name}_text_{self._string_n}"
        self.new_strings[name] = text
        return f"@string/{name}"

    def shape_ref(self, style: dict) -> str | None:
        bg = style.get("background-color") or style.get("background")
        radius = style.get("border-radius")
        border_color = style.get("border-color")
        border_width = style.get("border-width")
        if not any([isinstance(bg, str) and HEX_RE.match(bg),
                    isinstance(radius, (int, float)),
                    isinstance(border_color, str) and isinstance(border_width, (int, float))]):
            return None
        self._drawable_n += 1
        name = f"bg_{self.layout_name}_{self._drawable_n}"
        lines = ['<?xml version="1.0" encoding="utf-8"?>',
                  '<shape xmlns:android="http://schemas.android.com/apk/res/android">']
        if isinstance(bg, str) and HEX_RE.match(bg):
            lines.append(f'    <solid android:color="{self.color_ref(bg)}"/>')
        if isinstance(border_color, str) and HEX_RE.match(border_color) and isinstance(border_width, (int, float)):
            lines.append(f'    <stroke android:width="{self.dimen_ref("stroke", border_width)}" '
                         f'android:color="{self.color_ref(border_color)}"/>')
        if isinstance(radius, (int, float)):
            lines.append(f'    <corners android:radius="{self.dimen_ref("radius", radius)}"/>')
        lines.append("</shape>")
        self.new_drawables[f"{name}.xml"] = "\n".join(lines) + "\n"
        return f"@drawable/{name}"


# ── CSS/样式解析 ──────────────────────────────────────────────────────────────

def parse_css_value(raw: str, dpi: int) -> Any:
    raw = raw.strip()
    if raw == "750rpx":
        return "match_parent"
    m = RPX_RE.match(raw)
    if m:
        return round(px_to_dp(float(m.group(1)), dpi), 1)
    m = PX_RE.match(raw)
    if m:
        return round(px_to_dp(float(m.group(1)), dpi), 1)
    if HEX_RE.match(raw):
        return raw.upper()
    return raw


def parse_css(text: str, dpi: int) -> dict[str, dict[str, Any]]:
    styles: dict[str, dict[str, Any]] = {}
    for cls, body in CLASS_BLOCK_RE.findall(text):
        props: dict[str, Any] = {}
        for prop, raw in PROP_RE.findall(body):
            val = parse_css_value(raw, dpi)
            if val is not None:
                props[prop.strip()] = val
        styles[cls] = props
    return styles


# ── 项目扫描 ─────────────────────────────────────────────────────────────────

def scan_project(android_root: Path) -> ProjectInfo:
    proj = ProjectInfo()
    res = android_root / "res"
    values = res / "values"
    if not res.exists():
        return proj

    # 解析 colors.xml
    for f in [values / "colors.xml", values / "color.xml"]:
        if f.exists():
            try:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(f.read_text(encoding="utf-8-sig"))
                for c in root.findall("color"):
                    name = c.attrib.get("name", "")
                    text = (c.text or "").strip()
                    if name and text:
                        proj.colors[text.upper()] = name
            except Exception:
                pass

    # 解析 dimens.xml
    d = values / "dimens.xml"
    if d.exists():
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(d.read_text(encoding="utf-8-sig"))
            for c in root.findall("dimen"):
                name = c.attrib.get("name", "")
                text = (c.text or "").strip()
                if name and text:
                    proj.dimens[text] = name
        except Exception:
            pass

    # 解析 strings.xml
    s = values / "strings.xml"
    if s.exists():
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(s.read_text(encoding="utf-8-sig"))
            for c in root.findall("string"):
                name = c.attrib.get("name", "")
                text = (c.text or "").strip()
                if name and text:
                    proj.strings[text] = name
        except Exception:
            pass

    # 扫描自定义 View
    for src_dir_name in ("java", "kotlin"):
        src = android_root / src_dir_name
        if not src.exists():
            continue
        for kt in list(src.rglob("*.kt")) + list(src.rglob("*.java")):
            try:
                text = kt.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            pkg_m = re.search(r"package\s+([A-Za-z0-9_.]+)", text)
            cls_m = re.search(r"class\s+([A-Za-z0-9_]+)\s*(?:\(.*\)\s*)?(?::\s*|\s+extends\s+)([A-Za-z0-9_.]+(?:View|Layout|Button|EditText|ImageView))", text)
            if pkg_m and cls_m:
                proj.custom_views.append({
                    "class": f"{pkg_m.group(1)}.{cls_m.group(1)}",
                    "extends": cls_m.group(2),
                    "description": f"从 {kt.name} 发现"
                })

    # 布局前缀统计
    layout_dir = res / "layout"
    if layout_dir.exists():
        prefixes: dict[str, int] = {}
        for f in layout_dir.glob("*.xml"):
            for prefix in ("activity_", "fragment_", "item_", "dialog_", "include_"):
                if f.name.startswith(prefix):
                    prefixes[prefix] = prefixes.get(prefix, 0) + 1
                    break
        proj.layout_prefixes = [k for k, _v in sorted(prefixes.items(), key=lambda x: -x[1])]

    # DataBinding 检测（简化）
    build = android_root.parent / "build.gradle"
    if not build.exists():
        build = android_root.parent / "build.gradle.kts"
    if build.exists():
        try:
            text = build.read_text(encoding="utf-8", errors="ignore")
            if "dataBinding" in text or "viewBinding" in text:
                proj.uses_databinding = True
        except Exception:
            pass

    # 包名
    manifest = android_root / "AndroidManifest.xml"
    if manifest.exists():
        try:
            text = manifest.read_text(encoding="utf-8", errors="ignore")
            m = re.search(r'package\s*=\s*"([^"]+)"', text)
            if m:
                proj.package_name = m.group(1)
        except Exception:
            pass

    return proj


# ── XML 节点处理 ─────────────────────────────────────────────────────────────

def node_classes(node) -> list[str]:
    cls = node.attrib.get("class", "")
    return [p for p in re.split(r"\s+", cls.strip()) if p]


def merged_style(node, styles: dict[str, dict]) -> dict:
    m: dict = {}
    for c in node_classes(node):
        m.update(styles.get(c, {}))
    return m


def widget_for(node, style: dict, state: BuildState) -> tuple[str, str]:
    tag = (node.tag or "").lower()
    classes = " ".join(node_classes(node)).lower()

    # 自定义 View 映射优先
    for pattern, view in state.custom_view_map.items():
        if pattern in tag or pattern in classes:
            return pattern, view
    # tag 直接匹配自定义 View
    for cv in state.project.custom_views:
        short = cv["class"].split(".")[-1]
        if short.lower() in tag or short.lower() in classes:
            return short.lower(), cv["class"]

    if "button" in classes or "btn" in classes:
        return "button", "Button"
    if tag == "text" or "text" in classes:
        return "text", "TextView"
    if tag == "image" or "image" in classes or "icon" in classes:
        return "image", "ImageView"
    if tag in ("input", "edit") or "input" in classes or "edit" in classes:
        return "input", "EditText"
    if "list" in classes or "recycler" in classes or "scroll" in classes:
        return "list", "androidx.recyclerview.widget.RecyclerView"

    children = [c for c in node if hasattr(c, "tag") and isinstance(c.tag, str)]
    if children:
        # 根据 CSS display:flex 方向判断布局
        flex_dir = style.get("flex-direction", "column")
        if flex_dir == "row":
            return "row", "LinearLayout"
        return "group", "LinearLayout"
    return "view", "View"


def view_id(node, semantic: str) -> str:
    classes = node_classes(node)
    prefix_map = {"text": "tv", "image": "iv", "button": "btn", "list": "rv",
                  "input": "et", "group": "ll", "row": "ll", "view": "v"}
    prefix = prefix_map.get(semantic, "v")
    suffix = snake(classes[0]) if classes else semantic
    return f"{prefix}_{suffix}"


def build_attrs(node, style: dict, semantic: str, state: BuildState) -> list[tuple[str, str]]:
    attrs: list[tuple[str, str]] = [("android:id", f"@+id/{view_id(node, semantic)}")]

    # 宽高
    w = style.get("width")
    h = style.get("height") or style.get("min-height")
    if w == "match_parent" or w == "100%":
        attrs.append(("android:layout_width", "match_parent"))
    elif isinstance(w, (int, float)):
        attrs.append(("android:layout_width", state.dimen_ref("width", w)))
    else:
        attrs.append(("android:layout_width", "wrap_content"))

    if h == "match_parent" or h == "100%":
        attrs.append(("android:layout_height", "match_parent"))
    elif isinstance(h, (int, float)):
        attrs.append(("android:layout_height", state.dimen_ref("height", h)))
    else:
        attrs.append(("android:layout_height", "wrap_content"))

    # 布局方向
    if semantic in ("group",):
        attrs.append(("android:orientation", "vertical"))
    elif semantic == "row":
        attrs.append(("android:orientation", "horizontal"))

    # 文本大小
    fs = style.get("font-size")
    if isinstance(fs, (int, float)):
        attrs.append(("android:textSize", state.dimen_ref("text", fs, "sp")))

    # 文字颜色
    color = style.get("color")
    if isinstance(color, str) and HEX_RE.match(color):
        attrs.append(("android:textColor", state.color_ref(color)))

    # 背景
    bg_ref = state.shape_ref(style)
    if bg_ref:
        attrs.append(("android:background", bg_ref))
    else:
        bg = style.get("background-color")
        if isinstance(bg, str) and HEX_RE.match(bg):
            attrs.append(("android:background", state.color_ref(bg)))

    # margin
    for css_dir, android_dir in [("margin", "layout_margin"),
                                   ("margin-top", "layout_marginTop"),
                                   ("margin-bottom", "layout_marginBottom"),
                                   ("margin-left", "layout_marginStart"),
                                   ("margin-right", "layout_marginEnd")]:
        val = style.get(css_dir)
        if isinstance(val, (int, float)):
            attrs.append((f"android:{android_dir}", state.dimen_ref("margin", val)))

    # padding
    for css_dir, android_dir in [("padding", "padding"),
                                   ("padding-top", "paddingTop"),
                                   ("padding-bottom", "paddingBottom"),
                                   ("padding-left", "paddingStart"),
                                   ("padding-right", "paddingEnd")]:
        val = style.get(css_dir)
        if isinstance(val, (int, float)):
            attrs.append((f"android:{android_dir}", state.dimen_ref("padding", val)))

    # 文字样式
    fw = style.get("font-weight")
    if fw == "bold" or fw == "700":
        attrs.append(("android:textStyle", "bold"))
    ta = style.get("text-align")
    if ta == "center":
        attrs.append(("android:gravity", "center"))
    elif ta == "left":
        attrs.append(("android:gravity", "start"))
    elif ta == "right":
        attrs.append(("android:gravity", "end"))

    # layout_weight (flex)
    flex = style.get("flex")
    if isinstance(flex, (int, float)):
        attrs.append(("android:layout_weight", str(int(flex))))

    return attrs


# ── XML 渲染 ─────────────────────────────────────────────────────────────────

def open_tag(widget: str, attrs: list[tuple[str, str]], indent: int, self_close: bool) -> list[str]:
    pad = " " * (indent * 4)
    lines = [f"{pad}<{widget}"]
    for k, v in attrs:
        lines.append(f'{pad}    {k}="{xml_escape(v)}"')
    lines.append(f"{pad}/>" if self_close else f"{pad}>")
    return lines


def render_node(node, styles: dict, state: BuildState, indent: int = 0) -> list[str]:
    style = merged_style(node, styles)
    semantic, widget = widget_for(node, style, state)
    state.widgets_used[semantic] = widget
    attrs = build_attrs(node, style, semantic, state)

    # 文本内容
    text = "".join(node.itertext()).strip()
    if text and semantic in ("text", "button"):
        attrs.append(("android:text", state.string_ref(text)))

    # 图片占位
    if semantic == "image":
        state._image_n += 1
        asset = f"ic_{state.layout_name}_{snake(node_classes(node)[0] if node_classes(node) else 'img')}_{state._image_n}"
        attrs.append(("android:src", f"@drawable/{asset}"))
        state.missing_assets.append({
            "name": asset,
            "reason": "需手动提供图片资源",
            "path": f"res/drawable/{asset}.png"
        })

    children = [c for c in node if hasattr(c, "tag") and isinstance(c.tag, str)]
    is_leaf = semantic in ("text", "image", "button", "input", "view", "list")
    if not children or is_leaf:
        return open_tag(widget, attrs, indent, True)

    lines = open_tag(widget, attrs, indent, False)
    for child in children:
        lines.extend(render_node(child, styles, state, indent + 1))
    lines.append(f"{' ' * (indent * 4)}</{widget}>")
    return lines


def render_layout(root, styles: dict, state: BuildState) -> str:
    lines = ['<?xml version="1.0" encoding="utf-8"?>']
    body = render_node(root, styles, state)

    # 注入 xmlns 作为第一个属性（不提前闭合标签）
    ns_attr = 'xmlns:android="http://schemas.android.com/apk/res/android"'
    if "xmlns:android" not in "\n".join(body):
        # 自闭合标签：在 /> 前插入
        if body[0].rstrip().endswith("/>"):
            body[0] = body[0].rstrip()[:-2] + f"\n        {ns_attr}\n{'    '}/>"
        else:
            # 非自闭合：在第一个标签行后插入 xmlns 属性
            body.insert(1, f"        {ns_attr}")
    lines.extend(body)
    return "\n".join(lines) + "\n"


def resources_xml(tag: str, entries: dict[str, str]) -> str:
    lines = ["<resources>"]
    for name, value in sorted(entries.items()):
        lines.append(f'    <{tag} name="{xml_escape(name)}">{xml_escape(value)}</{tag}>')
    lines.append("</resources>")
    return "\n".join(lines) + "\n"


def merge_values(path: Path, tag: str, new_vals: dict[str, str]) -> None:
    import xml.etree.ElementTree as ET
    existing = ""
    if path.exists():
        existing = path.read_text(encoding="utf-8-sig")
    try:
        root = ET.fromstring(existing) if existing.strip() else ET.Element("resources")
    except ET.ParseError:
        root = ET.Element("resources")
    cur = {c.attrib.get("name", ""): (c.text or "").strip() for c in root.findall(tag)}
    for name, value in new_vals.items():
        if name not in cur:
            child = ET.SubElement(root, tag, {"name": name})
            child.text = value
    lines = ["<resources>"]
    for c in list(root):
        lines.append(f'    <{c.tag} name="{xml_escape(c.attrib.get("name", ""))}">'
                     f'{xml_escape(c.text or "")}</{c.tag}>')
    lines.append("</resources>")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ── 校验与审查 ───────────────────────────────────────────────────────────────

def validate_layout(xml_text: str, state: BuildState) -> dict:
    """校验生成的布局 XML。

    返回:
        {"errors": [...], "warnings": [...], "info": [...], "pass": bool}
        error = 阻断级（如 XML 语法错误、缺少 layout_width）
        warning = 建议修复（如硬编码值、未引用的资源）
        info = 提示（如建议使用 ConstraintLayout）
    """
    import xml.etree.ElementTree as ET

    result: dict = {"errors": [], "warnings": [], "info": [], "pass": True}

    # ── 1. XML 语法校验 ──
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        result["errors"].append(f"XML 语法错误: {e}")
        result["pass"] = False
        return result

    # ── 2. 收集已声明和引用的资源 ──
    declared_colors = set(state.project.colors.values()) | set(state.new_colors.keys())
    declared_dimens = set(state.project.dimens.values()) | set(state.new_dimens.keys())
    declared_drawables = set(k.replace(".xml", "") for k in state.new_drawables)
    declared_strings = set(state.project.strings.values()) | set(state.new_strings.keys())

    def check_resources(elem, android_ns: str):
        """遍历元素检查资源引用"""
        for attr_key, attr_val in elem.attrib.items():
            # layout_width/layout_height 必须存在
            pass

    # 遍历所有元素
    all_elements: list = []
    def collect(elem):
        all_elements.append(elem)
        for child in elem:
            collect(child)
    collect(root)

    ns = "http://schemas.android.com/apk/res/android"
    android = f"{{{ns}}}"

    for elem in all_elements:
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

        # ── 检查 layout_width / layout_height ──
        lw = elem.attrib.get(f"{android}layout_width", elem.attrib.get("android:layout_width", ""))
        lh = elem.attrib.get(f"{android}layout_height", elem.attrib.get("android:layout_height", ""))
        if not lw:
            result["errors"].append(f"<{tag}> 缺少 android:layout_width")
            result["pass"] = False
        if not lh:
            result["errors"].append(f"<{tag}> 缺少 android:layout_height")
            result["pass"] = False

        # ── 检查属性值中的资源引用 ──
        for attr_key, attr_val in elem.attrib.items():
            attr_name = attr_key.split("}")[-1] if "}" in attr_key else attr_key

            # 检查 @color/
            for m in re.finditer(r"@color/(\w+)", attr_val):
                cname = m.group(1)
                if cname not in declared_colors:
                    result["warnings"].append(f"<{tag}> {attr_name}=\"{attr_val}\" — 颜色 @color/{cname} 未在 colors.xml 中找到")

            # 检查 @dimen/
            for m in re.finditer(r"@dimen/(\w+)", attr_val):
                dname = m.group(1)
                if dname not in declared_dimens:
                    result["warnings"].append(f"<{tag}> {attr_name}=\"{attr_val}\" — 尺寸 @dimen/{dname} 未在 dimens.xml 中找到")

            # 检查 @drawable/
            for m in re.finditer(r"@drawable/(\w+)", attr_val):
                drname = m.group(1)
                if drname not in declared_drawables and drname not in state.missing_assets:
                    result["warnings"].append(f"<{tag}> {attr_name}=\"{attr_val}\" — drawable @drawable/{drname} 未生成且未在缺失列表中")

            # 检查 @string/
            for m in re.finditer(r"@string/(\w+)", attr_val):
                sname = m.group(1)
                if sname not in declared_strings:
                    result["warnings"].append(f"<{tag}> {attr_name}=\"{attr_val}\" — 字符串 @string/{sname} 未在 strings.xml 中找到")

            # 检查硬编码尺寸（dp/sp 开头的数字）
            for m in re.finditer(r'"(\d+)(dp|sp|dip|px)"', attr_val):
                result["warnings"].append(f"<{tag}> {attr_name}=\"{m.group(1)}{m.group(2)}\" — 硬编码尺寸，建议提取为 @dimen/")

            # 检查硬编码颜色（#RRGGBB）
            for m in re.finditer(r'"#([0-9A-Fa-f]{6,8})"', attr_val):
                if attr_name not in ("",):  # 所有硬编码颜色都提示
                    result["info"].append(f"<{tag}> {attr_name}=\"{m.group(0)[1:-1]}\" — 硬编码颜色，建议提取为 @color/")

            # 检查硬编码文本（长字符串）
            if attr_name == "android:text":
                text_val = attr_val.strip('"')
                if len(text_val) > 3 and not text_val.startswith("@string/"):
                    result["info"].append(f"<{tag}> android:text=\"{attr_val}\" — 硬编码文本，建议提取为 @string/")

        # ── 控件特定检查 ──
        if tag == "ImageView":
            src = elem.attrib.get(f"{android}src", elem.attrib.get("android:src", ""))
            if not src:
                result["warnings"].append(f"<ImageView> 缺少 android:src")
            if "scaleType" not in str(elem.attrib):
                result["info"].append(f"<ImageView> 建议添加 android:scaleType")

        if tag == "EditText":
            itype = elem.attrib.get(f"{android}inputType", elem.attrib.get("android:inputType", ""))
            if not itype:
                result["info"].append(f"<EditText> 建议添加 android:inputType")
            hint = elem.attrib.get(f"{android}hint", elem.attrib.get("android:hint", ""))
            if not hint:
                result["info"].append(f"<EditText> 建议添加 android:hint")

    # ── 检查根元素 namespace ──
    root_tag = root.tag.split("}")[-1] if "}" in root.tag else root.tag
    if "xmlns:android" not in xml_text.split("\n", 3)[3] if "\n" in xml_text else "":
        if f"{{{ns}}}" not in str(root.attrib):
            pass  # xmlns already declared via nsmap

    # ── 检查自定义 View 类加载 ──
    for elem in all_elements:
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        if "." in tag:  # 完全限定类名，可能是自定义 View
            custom_classes = [cv["class"] for cv in state.project.custom_views]
            if tag not in custom_classes:
                result["warnings"].append(f"<{tag}> — 使用了完整类名但未在项目中检测到此类定义")

    return result


def review_layout(xml_text: str, report: dict, validation: dict) -> dict:
    """审查生成的布局，生成改进建议。

    返回 {"issues": [...], "score": "pass|warn|fail"}
    """
    issues: list[dict] = []
    score = "pass"

    # ── 校验错误 → 审查 fail ──
    if validation["errors"]:
        score = "fail"
        for err in validation["errors"]:
            issues.append({"severity": "error", "message": err, "fix": "必须修复"})

    # ── 校验警告 → 审查 warn ──
    if validation["warnings"]:
        if score == "pass":
            score = "warn"
        for w in validation["warnings"]:
            issues.append({"severity": "warning", "message": w, "fix": "建议修复"})

    # ── 缺失资源审查 ──
    missing = report.get("missing_assets", [])
    if missing:
        for m in missing:
            issues.append({
                "severity": "warning",
                "message": f"缺少图片资源: {m['name']}",
                "fix": f"将图片放入 {m.get('path', 'res/drawable/')}",
            })

    # ── 控件使用审查 ──
    widgets = report.get("widgets", {})
    if "list" in widgets and "RecyclerView" in widgets["list"]:
        issues.append({
            "severity": "info",
            "message": "使用了 RecyclerView，需要额外生成 item 布局和 Adapter",
            "fix": "创建 item_*.xml 布局并实现 RecyclerView.Adapter",
        })

    # ── 布局嵌套审查 ──
    line_count = xml_text.count("\n")
    if line_count > 200:
        issues.append({
            "severity": "info",
            "message": f"布局共 {line_count} 行，层级较深，建议检查是否可以简化",
            "fix": "考虑使用 ConstraintLayout 扁平化布局",
        })

    # ── 自定义 View 使用确认 ──
    used = report.get("custom_views_used", [])
    if used:
        issues.append({
            "severity": "info",
            "message": f"使用了 {len(used)} 个自定义 View，请确认项目依赖已正确配置",
            "fix": "检查 build.gradle 中的依赖和 import 语句",
        })

    result = {"issues": issues, "score": score}
    return result


# ── 主逻辑 ───────────────────────────────────────────────────────────────────

def cmd_scan(args: argparse.Namespace) -> None:
    root = Path(args.scan_project).resolve()
    proj = scan_project(root)
    print(json.dumps({
        "android_root": str(root),
        "colors": proj.colors,
        "dimens": proj.dimens,
        "custom_views": proj.custom_views,
        "layout_prefixes": proj.layout_prefixes,
        "uses_databinding": proj.uses_databinding,
        "package_name": proj.package_name,
    }, indent=2, ensure_ascii=False))


def cmd_convert(args: argparse.Namespace) -> None:
    # 读取输入
    xml_text = Path(args.input_xml).read_text(encoding="utf-8-sig") if Path(args.input_xml).exists() else args.input_xml
    css_text = Path(args.input_css).read_text(encoding="utf-8-sig") if Path(args.input_css).exists() else args.input_css

    design_w = float(args.design_width_px)
    target_dpi = int(args.target_dpi)
    android_root = Path(args.android_root).resolve()

    # 扫描项目
    proj = scan_project(android_root)

    # 自定义 View 映射
    custom_map: dict[str, str] = {}
    if args.custom_view_map:
        cm = Path(args.custom_view_map)
        if cm.exists():
            for item in json.loads(cm.read_text(encoding="utf-8")):
                custom_map[item["pattern"]] = item["view"]

    # 构建状态
    state = BuildState(
        layout_name=args.layout_name,
        dpi=target_dpi,
        project=proj,
        custom_view_map=custom_map,
    )

    # 解析样式
    styles = parse_css(css_text, target_dpi)

    # 解析 XML
    import xml.etree.ElementTree as ET
    root_node = ET.fromstring(xml_text)

    # 渲染
    layout_xml = render_layout(root_node, styles, state)

    # 资源
    res = android_root / "res"
    layout_path = res / "layout" / f"{args.layout_name}.xml"
    colors_path = res / "values" / "colors.xml"
    strings_path = res / "values" / "strings.xml"
    dimens_path = res / "values" / "dimens.xml"

    # 报告
    report = {
        "design": {"width_px": design_w, "dpi": target_dpi,
                   "scale": f"1px = {fmt_val(px_to_dp(1, target_dpi))}dp"},
        "layout_name": args.layout_name,
        "android_root": str(android_root),
        "layout_path": str(layout_path),
        "widgets": state.widgets_used,
        "custom_views_found": proj.custom_views,
        "custom_views_used": [{"pattern": k, "view": v} for k, v in custom_map.items()],
        "reused": {"colors": state.reused_colors, "dimens": state.reused_dimens},
        "new_resources": {
            "colors": state.new_colors,
            "strings": state.new_strings,
            "dimens": state.new_dimens,
            "drawables": list(state.new_drawables.keys()),
        },
        "missing_assets": state.missing_assets,
    }

    # ── 校验与审查 ──
    validation = {} if args.skip_validation else validate_layout(layout_xml, state)
    review = {} if args.skip_validation else review_layout(layout_xml, report, validation)
    if not args.skip_validation:
        report["validation"] = validation
        report["review"] = review

    if args.output_demo:
        print(layout_xml)
        if not args.skip_validation:
            print("\n<!-- 校验结果 -->", file=sys.stderr)
            json.dump(validation, sys.stderr, indent=2, ensure_ascii=False)
        return

    if args.dry_run:
        report["layout_preview"] = layout_xml
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return

    if args.write:
        # ── 写入前阻断级校验 ──
        if not args.skip_validation and not validation.get("pass", True):
            if not args.force:
                print("❌ 校验未通过，拒绝写入。使用 --force 强制写入或修复后重试。", file=sys.stderr)
                print(json.dumps({"validation": validation, "review": review}, indent=2, ensure_ascii=False))
                return
            else:
                print("⚠️ 校验未通过但 --force 已启用，强制写入。", file=sys.stderr)

        # 写入 layout
        # 写入 layout
        layout_path.parent.mkdir(parents=True, exist_ok=True)
        layout_path.write_text(layout_xml, encoding="utf-8")
        # 合并 values
        if state.new_colors:
            merge_values(colors_path, "color", state.new_colors)
        if state.new_strings:
            merge_values(strings_path, "string", state.new_strings)
        if state.new_dimens:
            merge_values(dimens_path, "dimen", state.new_dimens)
        # 写入 drawable
        drawable_dir = res / "drawable"
        drawable_dir.mkdir(parents=True, exist_ok=True)
        for name, content in state.new_drawables.items():
            (drawable_dir / name).write_text(content, encoding="utf-8")
        report["written"] = True
        print(json.dumps(report, indent=2, ensure_ascii=False))


# ── 入口 ─────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="蓝湖 XML+CSS → Android View XML")
    sub = parser.add_subparsers(dest="command", help="scan-project | convert")

    # scan-project
    sp = sub.add_parser("scan-project", help="扫描 Android 项目")
    sp.add_argument("android_root")

    # convert
    cp = sub.add_parser("convert", help="转换蓝湖布局")
    cp.add_argument("--input-xml", required=True, help="蓝湖 WXML/XML 文件路径或直接文本")
    cp.add_argument("--input-css", required=True, help="蓝湖 CSS/WXSS 文件路径或直接文本")
    cp.add_argument("--design-width-px", required=True, type=float, help="设计稿宽度 (px)")
    cp.add_argument("--target-dpi", required=True, type=int, help="目标 DPI (160/240/320/480/640)")
    cp.add_argument("--android-root", required=True, help="Android 项目 res 父目录, 如 src/main")
    cp.add_argument("--layout-name", required=True, help="布局文件名, 如 activity_demo")
    cp.add_argument("--custom-view-map", help="自定义 View 映射 JSON")
    cp.add_argument("--dry-run", action="store_true", help="预览不写入（含校验结果）")
    cp.add_argument("--write", action="store_true", help="写入文件（校验不通过会拒绝）")
    cp.add_argument("--output-demo", action="store_true", help="直接输出 XML")
    cp.add_argument("--skip-validation", action="store_true", help="跳过校验")
    cp.add_argument("--force", action="store_true", help="校验失败时仍强制写入")

    args = parser.parse_args()

    if args.command == "scan-project":
        cmd_scan(args)
    elif args.command == "convert":
        cmd_convert(args)
    else:
        parser.print_help()
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
