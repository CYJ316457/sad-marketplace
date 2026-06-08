---
name: lanhu-xml-to-android
description: Use when converting Lanhu exported WXML/WXSS, XML-like design markup, or copied Lanhu code-view output into Android View XML layouts in an existing project, especially when project conventions, custom views, dpi/dp scale, colors, drawables, strings, or asset reuse must be inspected and reported step by step.
---

# Lanhu XML To Android

Convert Lanhu code-view exports into Android View XML through a project-aware workflow. This skill is not a blind design-to-code generator: inspect the target Android project first, reuse its conventions, ask for missing conversion settings, then generate files and report exactly what changed.

## Inputs

Accept any of these:
- Lanhu exported `*.wxml` plus `*.wxss`.
- A copied Lanhu code-view text dump containing WXML/WXSS sections.
- A `spec.json` already produced by `scripts/convert.py --emit-spec`.

Do not use this skill for Jetpack Compose output; use an Android Compose skill or implement manually.

## Required Workflow

1. **Collect inputs**
   - Identify the WXML/WXSS/spec paths or ask for them if absent.
   - Identify the target Android module. Prefer the module containing `src/main/res/layout`.

2. **Inspect project conventions before generating**
   - Search `res/layout`, `res/values`, `res/drawable`, Kotlin/Java files, and custom view packages.
   - Record layout naming style, id prefixes, binding style, existing dimensions, color names, drawable naming, and existing custom views.
   - Find reusable resources: colors, strings, dimens, drawables, vector icons, shape backgrounds.

3. **Plan widget mapping**
   - List the Android widgets that will be used before writing files.
   - Prefer existing custom views when their names/usage clearly match the Lanhu node semantics.
   - Prefer existing project widgets/components over raw platform widgets.
   - Default mappings: text -> `TextView`, image/icon -> `ImageView`, repeated list -> `RecyclerView`, absolute/grouped layout -> `ConstraintLayout`, simple vertical/horizontal groups -> `LinearLayout`, clickable text/box -> project button/custom view or `Button`.

4. **Ask only for missing high-impact settings**
   - If density/scale is ambiguous, ask for the design conversion rule, such as `750rpx -> 375dp`, `1080px -> 360dp`, or target screen width dp.
   - If multiple modules or app resource styles exist, ask which module/page to target.
   - If custom view matching is ambiguous, show the candidate mapping and ask for confirmation.

5. **Generate through the script**
   - Use `scripts/convert.py` for deterministic conversion.
   - Run dry-run first when modifying an existing Android project.
   - Review the generated plan: output paths, reused resources, new resources, missing assets, widget mapping.
   - Then write files only after the plan is coherent.

6. **Report results step by step**
   - Say where each generated file is located.
   - List reused resources and newly required resources.
   - List missing assets/icons and exactly where the user should place them.
   - List widgets/custom views used and any assumptions.
   - Mention verification commands run.

## Script Usage

From this skill directory:

```bash
python scripts/convert.py --wxml path/to/page.wxml --wxss path/to/page.wxss --android-root path/to/app/src/main --layout-name activity_page --screen-width-dp 375 --dry-run
python scripts/convert.py --wxml path/to/page.wxml --wxss path/to/page.wxss --android-root path/to/app/src/main --layout-name activity_page --screen-width-dp 375 --write
```

Useful flags:
- `--spec path/to/spec.json`: render an existing spec.
- `--emit-spec path/to/spec.json`: save the parsed intermediate spec.
- `--screen-width-dp 375`: converts a 750rpx design to 375dp by default.
- `--custom-view-map path/to/map.json`: explicit semantic-to-class mapping.
- `--resource-report path/to/report.json`: machine-readable report.

## Output Policy

Write under the target Android module, normally:
- `src/main/res/layout/<layout_name>.xml`
- `src/main/res/values/colors.xml`
- `src/main/res/values/strings.xml`
- `src/main/res/values/dimens.xml`
- `src/main/res/drawable/bg_<layout_name>_*.xml`
- `src/main/res/drawable/` for missing icon/image placeholders only as comments/report entries, not fake image files.

Never overwrite unrelated user edits. If a target file exists, create a dry-run report and ask whether to update, merge, or write a new file.

## References

- Read `references/project-inspection.md` when deciding how to inspect an Android project.
- Read `references/widget-mapping.md` when mapping Lanhu nodes to Android/custom views.
