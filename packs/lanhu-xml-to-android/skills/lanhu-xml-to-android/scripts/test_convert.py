from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "convert.py"


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_dry_run_reuses_project_resources_and_reports_outputs(tmp_path: Path):
    android_root = tmp_path / "app" / "src" / "main"
    write(android_root / "res" / "values" / "colors.xml", """
<resources>
    <color name="brand_primary">#0080FF</color>
    <color name="page_bg">#F8F8F8</color>
</resources>
""".strip())
    write(android_root / "res" / "values" / "dimens.xml", """
<resources>
    <dimen name="space_16">16dp</dimen>
</resources>
""".strip())
    write(android_root / "java" / "com" / "example" / "widget" / "BrandButton.kt", """
package com.example.widget
class BrandButton
""".strip())

    wxml = tmp_path / "page.wxml"
    wxss = tmp_path / "page.wxss"
    report = tmp_path / "report.json"
    write(wxml, """
<view class="page">
  <text class="title">Hello</text>
  <image class="avatar" />
  <button class="primary-btn">Submit</button>
</view>
""".strip())
    write(wxss, """
.page { width: 750rpx; min-height: 1334rpx; background-color: #F8F8F8; padding: 32rpx; }
.title { color: #0080FF; font-size: 32rpx; margin-bottom: 16rpx; }
.avatar { width: 80rpx; height: 80rpx; }
.primary-btn { width: 300rpx; height: 88rpx; background-color: #0080FF; color: #FFFFFF; border-radius: 12rpx; }
""".strip())

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--wxml",
            str(wxml),
            "--wxss",
            str(wxss),
            "--android-root",
            str(android_root),
            "--layout-name",
            "activity_lanhu_demo",
            "--screen-width-dp",
            "375",
            "--custom-view-map",
            json.dumps({"button": "com.example.widget.BrandButton"}),
            "--resource-report",
            str(report),
            "--dry-run",
        ],
        text=True,
        capture_output=True,
    )

    assert result.returncode == 0, result.stderr
    data = json.loads(report.read_text(encoding="utf-8"))
    assert data["outputs"]["layout"].endswith("res/layout/activity_lanhu_demo.xml")
    assert {item["name"] for item in data["reused_resources"]["colors"]} >= {"brand_primary", "page_bg"}
    assert data["widget_mapping"]["button"] == "com.example.widget.BrandButton"
    assert data["missing_assets"][0]["target_path"].endswith("res/drawable/ic_activity_lanhu_demo_avatar_1.xml")
    assert "activity_lanhu_demo.xml" in data["generated_preview"]["layout"]
    assert not (android_root / "res" / "layout" / "activity_lanhu_demo.xml").exists()


def test_write_creates_expected_files(tmp_path: Path):
    android_root = tmp_path / "app" / "src" / "main"
    write(android_root / "res" / "values" / "colors.xml", "<resources/>\n")
    wxml = tmp_path / "page.wxml"
    wxss = tmp_path / "page.wxss"
    write(wxml, "<view class=\"page\"><text class=\"title\">Hi</text></view>")
    write(wxss, ".page { width: 750rpx; background-color: #FFFFFF; } .title { font-size: 28rpx; color: #333333; }")

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--wxml",
            str(wxml),
            "--wxss",
            str(wxss),
            "--android-root",
            str(android_root),
            "--layout-name",
            "activity_write_demo",
            "--write",
        ],
        text=True,
        capture_output=True,
    )

    assert result.returncode == 0, result.stderr
    layout = android_root / "res" / "layout" / "activity_write_demo.xml"
    assert layout.exists()
    assert "TextView" in layout.read_text(encoding="utf-8")
    assert "@string/activity_write_demo_text_1" in layout.read_text(encoding="utf-8")
    assert "activity_write_demo_text_1" in (android_root / "res" / "values" / "strings.xml").read_text(encoding="utf-8")
