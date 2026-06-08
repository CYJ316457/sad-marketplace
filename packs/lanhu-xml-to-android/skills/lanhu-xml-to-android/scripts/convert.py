#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


RPX_RE = re.compile(r"(-?\d+(?:\.\d+)?)rpx")
CLASS_BLOCK_RE = re.compile(r"\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}", re.S)
PROP_RE = re.compile(r"([A-Za-z-]+)\s*:\s*([^;]+)")
HEX_RE = re.compile(r"#[0-9A-Fa-f]{6,8}")


def snake(value: str) -> str:
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value)
    value = re.sub(r"[^0-9A-Za-z]+", "_", value).strip("_")
    value = re.sub(r"_+", "_", value)
    return value.lower() or "lanhu"


def xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def fmt_num(value: float | int) -> str:
    if isinstance(value, int) or value == int(value):
        return str(int(value))
    return str(round(value, 2)).rstrip("0").rstrip(".")


@dataclass
class ProjectResources:
    colors_by_hex: dict[str, str] = field(default_factory=dict)
    dimens_by_value: dict[str, str] = field(default_factory=dict)
    strings_by_value: dict[str, str] = field(default_factory=dict)
    custom_views: list[str] = field(default_factory=list)


@dataclass
class RenderState:
    layout_name: str
    project: ProjectResources
    widget_map: dict[str, str]
    strings: dict[str, str] = field(default_factory=dict)
    colors: dict[str, str] = field(default_factory=dict)
    dimens: dict[str, str] = field(default_factory=dict)
    drawables: dict[str, str] = field(default_factory=dict)
    reused_colors: list[dict[str, str]] = field(default_factory=list)
    reused_dimens: list[dict[str, str]] = field(default_factory=list)
    missing_assets: list[dict[str, str]] = field(default_factory=list)
    widgets_used: dict[str, str] = field(default_factory=dict)
    string_i: int = 0
    drawable_i: int = 0
    image_i: int = 0

    def color_ref(self, hex_value: str) -> str:
        normalized = hex_value.upper()
        if normalized in self.project.colors_by_hex:
            name = self.project.colors_by_hex[normalized]
            item = {"name": name, "value": normalized}
            if item not in self.reused_colors:
                self.reused_colors.append(item)
            return f"@color/{name}"
        name = suggest_color_name(normalized)
        self.colors[name] = normalized
        return f"@color/{name}"

    def dimen_ref(self, prefix: str, value: float | int, unit: str = "dp") -> str:
        literal = f"{fmt_num(value)}{unit}"
        if literal in self.project.dimens_by_value:
            name = self.project.dimens_by_value[literal]
            item = {"name": name, "value": literal}
            if item not in self.reused_dimens:
                self.reused_dimens.append(item)
            return f"@dimen/{name}"
        name = f"lh_{snake(prefix)}_{str(fmt_num(value)).replace('.', '_')}"
        self.dimens[name] = literal
        return f"@dimen/{name}"

    def string_ref(self, text: str) -> str:
        if text in self.project.strings_by_value:
            return f"@string/{self.project.strings_by_value[text]}"
        for key, value in self.strings.items():
            if value == text:
                return f"@string/{key}"
        self.string_i += 1
        key = f"{self.layout_name}_text_{self.string_i}"
        self.strings[key] = text
        return f"@string/{key}"

    def shape_ref(self, style: dict[str, Any]) -> str | None:
        bg = style.get("background-color") or style.get("background")
        radius = style.get("border-radius")
        if not (isinstance(bg, str) and HEX_RE.fullmatch(bg) or isinstance(radius, (int, float))):
            return None
        self.drawable_i += 1
        name = f"bg_{self.layout_name}_{self.drawable_i}"
        lines = [
            '<?xml version="1.0" encoding="utf-8"?>',
            '<shape xmlns:android="http://schemas.android.com/apk/res/android">',
        ]
        if isinstance(bg, str) and HEX_RE.fullmatch(bg):
            lines.append(f'    <solid android:color="{self.color_ref(bg)}"/>')
        if isinstance(radius, (int, float)):
            lines.append(f'    <corners android:radius="{self.dimen_ref("radius", radius)}"/>')
        lines.append("</shape>")
        self.drawables[f"{name}.xml"] = "\n".join(lines) + "\n"
        return f"@drawable/{name}"


def parse_css_value(raw: str, scale: float) -> Any:
    raw = raw.strip()
    if raw == "750rpx":
        return "match_parent"
    if HEX_RE.fullmatch(raw):
        return raw.upper()
    match = RPX_RE.fullmatch(raw)
    if match:
        value = float(match.group(1)) * scale
        return int(value) if value == int(value) else round(value, 2)
    return raw


def parse_wxss(path: Path, screen_width_dp: float) -> dict[str, dict[str, Any]]:
    text = path.read_text(encoding="utf-8-sig")
    scale = screen_width_dp / 750.0
    styles: dict[str, dict[str, Any]] = {}
    for cls, body in CLASS_BLOCK_RE.findall(text):
        props: dict[str, Any] = {}
        for prop, raw in PROP_RE.findall(body):
            props[prop.strip()] = parse_css_value(raw, scale)
        styles[cls] = props
    return styles


def node_classes(node: ET.Element) -> list[str]:
    value = node.attrib.get("class", "")
    return [part for part in re.split(r"\s+", value.strip()) if part]


def style_for(node: ET.Element, styles: dict[str, dict[str, Any]]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    for cls in node_classes(node):
        merged.update(styles.get(cls, {}))
    return merged


def suggest_color_name(hex_value: str) -> str:
    known = {
        "#FFFFFF": "white",
        "#000000": "black",
        "#333333": "text_primary",
        "#666666": "text_secondary",
        "#999999": "text_hint",
        "#F8F8F8": "page_bg",
        "#F5F5F5": "bg_light",
    }
    return known.get(hex_value.upper(), f"color_{hex_value[1:7].lower()}")


def parse_values_xml(path: Path, tag: str) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        root = ET.fromstring(path.read_text(encoding="utf-8-sig"))
    except ET.ParseError:
        return {}
    result: dict[str, str] = {}
    for child in root.findall(tag):
        name = child.attrib.get("name")
        text = (child.text or "").strip()
        if name and text:
            result[text.upper() if tag == "color" else text] = name
    return result


def inspect_project(android_root: Path) -> ProjectResources:
    res = android_root / "res"
    values = res / "values"
    project = ProjectResources()
    project.colors_by_hex = parse_values_xml(values / "colors.xml", "color")
    project.dimens_by_value = parse_values_xml(values / "dimens.xml", "dimen")
    project.strings_by_value = parse_values_xml(values / "strings.xml", "string")
    for src_dir in [android_root / "java", android_root / "kotlin"]:
        if not src_dir.exists():
            continue
        for path in list(src_dir.rglob("*.kt")) + list(src_dir.rglob("*.java")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            package_match = re.search(r"package\s+([A-Za-z0-9_.]+)", text)
            class_match = re.search(r"class\s+([A-Za-z0-9_]*(?:View|Button|Layout))", text)
            if package_match and class_match:
                project.custom_views.append(f"{package_match.group(1)}.{class_match.group(1)}")
    return project


def load_custom_view_map(raw: str | None) -> dict[str, str]:
    if not raw:
        return {}
    path = Path(raw)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8-sig"))
    return json.loads(raw)


def widget_for(node: ET.Element, style: dict[str, Any], state: RenderState) -> tuple[str, str]:
    tag = node.tag.lower()
    classes = " ".join(node_classes(node)).lower()
    if tag in state.widget_map:
        return tag, state.widget_map[tag]
    if "button" in classes and "button" in state.widget_map:
        return "button", state.widget_map["button"]
    if tag == "text":
        return "text", "TextView"
    if tag == "image":
        return "image", "ImageView"
    if tag == "button" or "btn" in classes or "button" in classes:
        return "button", "Button"
    if "list" in classes or "recycler" in classes:
        return "list", "androidx.recyclerview.widget.RecyclerView"
    children = [child for child in node if isinstance(child.tag, str)]
    if children:
        return "group", "LinearLayout"
    return "view", "View"


def view_id(node: ET.Element, semantic: str, state: RenderState) -> str:
    classes = node_classes(node)
    suffix = snake(classes[0]) if classes else semantic
    prefix = {
        "text": "tv",
        "image": "iv",
        "button": "btn",
        "list": "rv",
        "group": "ll",
        "view": "v",
    }.get(semantic, "v")
    return f"{prefix}_{suffix}"


def attrs_for(node: ET.Element, style: dict[str, Any], semantic: str, state: RenderState) -> list[tuple[str, str]]:
    attrs: list[tuple[str, str]] = [("android:id", f"@+id/{view_id(node, semantic, state)}")]
    width = style.get("width")
    height = style.get("height") or style.get("min-height")
    attrs.append(("android:layout_width", "match_parent" if width == "match_parent" else state.dimen_ref("width", width) if isinstance(width, (int, float)) else "wrap_content"))
    attrs.append(("android:layout_height", "match_parent" if height == "match_parent" else state.dimen_ref("height", height) if isinstance(height, (int, float)) else "wrap_content"))
    if semantic == "group":
        attrs.append(("android:orientation", "vertical"))
    if isinstance(style.get("font-size"), (int, float)):
        attrs.append(("android:textSize", state.dimen_ref("text", style["font-size"], "sp")))
    color = style.get("color")
    if isinstance(color, str) and HEX_RE.fullmatch(color):
        attrs.append(("android:textColor", state.color_ref(color)))
    bg = state.shape_ref(style)
    if bg:
        attrs.append(("android:background", bg))
    elif isinstance(style.get("background-color"), str) and HEX_RE.fullmatch(style["background-color"]):
        attrs.append(("android:background", state.color_ref(style["background-color"])))
    if isinstance(style.get("padding"), (int, float)):
        attrs.append(("android:padding", state.dimen_ref("padding", style["padding"])))
    return attrs


def open_xml(tag: str, attrs: list[tuple[str, str]], level: int, self_close: bool) -> list[str]:
    indent = " " * (level * 4)
    lines = [f"{indent}<{tag}"]
    for key, value in attrs:
        lines.append(f'{indent}    {key}="{xml_escape(value)}"')
    lines.append(f"{indent}/>" if self_close else f"{indent}>")
    return lines


def render_node(node: ET.Element, styles: dict[str, dict[str, Any]], state: RenderState, level: int = 0) -> list[str]:
    style = style_for(node, styles)
    semantic, widget = widget_for(node, style, state)
    state.widgets_used[semantic] = widget
    attrs = attrs_for(node, style, semantic, state)
    text = "".join(node.itertext()).strip() if node.tag.lower() in {"text", "button"} else ""
    if text:
        attrs.append(("android:text", state.string_ref(text)))
    if semantic == "image":
        state.image_i += 1
        asset_name = f"ic_{state.layout_name}_{snake(node_classes(node)[0] if node_classes(node) else 'image')}_{state.image_i}"
        attrs.append(("android:src", f"@drawable/{asset_name}"))
        state.missing_assets.append({
            "name": asset_name,
            "reason": "Lanhu image/icon export is not available in WXML/WXSS",
            "target_path": report_path(Path("res") / "drawable" / f"{asset_name}.xml"),
        })
    children = [child for child in node if isinstance(child.tag, str)]
    if not children or semantic in {"text", "image", "button", "list", "view"}:
        return open_xml(widget, attrs, level, True)
    lines = open_xml(widget, attrs, level, False)
    for child in children:
        lines.extend(render_node(child, styles, state, level + 1))
    lines.append(f"{' ' * (level * 4)}</{widget}>")
    return lines


def render_layout(root: ET.Element, styles: dict[str, dict[str, Any]], state: RenderState) -> str:
    lines = ['<?xml version="1.0" encoding="utf-8"?>']
    rendered = render_node(root, styles, state)
    if rendered[0].startswith("<LinearLayout") or rendered[0].startswith("<androidx.constraintlayout"):
        rendered[0] += ' xmlns:android="http://schemas.android.com/apk/res/android"'
    else:
        # add namespace to first tag line
        rendered[0] += ' xmlns:android="http://schemas.android.com/apk/res/android"'
    lines.extend(rendered)
    return "\n".join(lines) + "\n"


def resources_xml(tag: str, values: dict[str, str]) -> str:
    lines = ["<resources>"]
    for name, value in sorted(values.items()):
        lines.append(f'    <{tag} name="{xml_escape(name)}">{xml_escape(value)}</{tag}>')
    lines.append("</resources>")
    return "\n".join(lines) + "\n"


def merge_values(path: Path, tag: str, new_values: dict[str, str]) -> None:
    existing = ""
    if path.exists():
        existing = path.read_text(encoding="utf-8-sig")
    current_by_name: dict[str, str] = {}
    try:
        root = ET.fromstring(existing) if existing.strip() else ET.Element("resources")
        for child in root.findall(tag):
            name = child.attrib.get("name")
            if name:
                current_by_name[name] = (child.text or "").strip()
    except ET.ParseError:
        root = ET.Element("resources")
    for name, value in new_values.items():
        if name in current_by_name:
            continue
        child = ET.SubElement(root, tag, {"name": name})
        child.text = value
    lines = ["<resources>"]
    for child in list(root):
        name = child.attrib.get("name")
        text = child.text or ""
        lines.append(f'    <{child.tag} name="{xml_escape(name or "")}">{xml_escape(text)}</{child.tag}>')
    lines.append("</resources>")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def report_path(path: Path) -> str:
    return str(path).replace("\\", "/")


def convert(args: argparse.Namespace) -> dict[str, Any]:
    android_root = Path(args.android_root).resolve()
    if not (android_root / "res").exists():
        raise SystemExit(f"Android root must contain res/: {android_root}")
    project = inspect_project(android_root)
    widget_map = load_custom_view_map(args.custom_view_map)
    screen_width_dp = float(args.screen_width_dp)
    styles = parse_wxss(Path(args.wxss), screen_width_dp)
    root = ET.fromstring(Path(args.wxml).read_text(encoding="utf-8"))
    state = RenderState(args.layout_name, project, widget_map)
    layout_xml = render_layout(root, styles, state)

    outputs = {
        "layout": report_path(android_root / "res" / "layout" / f"{args.layout_name}.xml"),
        "colors": report_path(android_root / "res" / "values" / "colors.xml"),
        "strings": report_path(android_root / "res" / "values" / "strings.xml"),
        "dimens": report_path(android_root / "res" / "values" / "dimens.xml"),
        "drawables": [report_path(android_root / "res" / "drawable" / name) for name in state.drawables],
    }
    report = {
        "layout_name": args.layout_name,
        "android_root": str(android_root),
        "outputs": outputs,
        "widget_mapping": state.widgets_used,
        "project_custom_views": project.custom_views,
        "reused_resources": {"colors": state.reused_colors, "dimens": state.reused_dimens},
        "new_resources": {"colors": state.colors, "strings": state.strings, "dimens": state.dimens, "drawables": list(state.drawables)},
        "missing_assets": state.missing_assets,
        "generated_preview": {"layout": f"{args.layout_name}.xml\n{layout_xml}"},
    }
    if args.emit_spec:
        Path(args.emit_spec).write_text(json.dumps({"styles": styles}, indent=2), encoding="utf-8")
    if args.resource_report:
        Path(args.resource_report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.resource_report).write_text(json.dumps(report, indent=2), encoding="utf-8")
    if args.write:
        layout_path = Path(outputs["layout"])
        if layout_path.exists() and not args.force:
            raise SystemExit(f"Refusing to overwrite existing layout without --force: {layout_path}")
        layout_path.parent.mkdir(parents=True, exist_ok=True)
        layout_path.write_text(layout_xml, encoding="utf-8")
        merge_values(android_root / "res" / "values" / "colors.xml", "color", state.colors)
        merge_values(android_root / "res" / "values" / "strings.xml", "string", state.strings)
        merge_values(android_root / "res" / "values" / "dimens.xml", "dimen", state.dimens)
        drawable_dir = android_root / "res" / "drawable"
        drawable_dir.mkdir(parents=True, exist_ok=True)
        for name, text in state.drawables.items():
            (drawable_dir / name).write_text(text, encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wxml", required=True)
    parser.add_argument("--wxss", required=True)
    parser.add_argument("--spec")
    parser.add_argument("--emit-spec")
    parser.add_argument("--android-root", required=True)
    parser.add_argument("--layout-name", required=True)
    parser.add_argument("--screen-width-dp", default="375")
    parser.add_argument("--custom-view-map")
    parser.add_argument("--resource-report")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.write:
        args.dry_run = True
    report = convert(args)
    print(json.dumps({k: report[k] for k in ["outputs", "widget_mapping", "missing_assets"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())




