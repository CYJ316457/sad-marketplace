# Project Inspection

Before generating Android XML, inspect the target project and summarize these findings:

- Module root: directory containing `src/main/res`.
- Layout style: `activity_*`, `fragment_*`, `item_*`, or project-specific names.
- Binding style: ViewBinding, DataBinding, Kotlin synthetic legacy, or direct `findViewById`.
- Existing custom views: search `class *View`, `extends View`, `extends LinearLayout`, XML tags containing a package name, and common package names such as `widget`, `view`, `component`, `ui`.
- Existing resources: parse `colors.xml`, `strings.xml`, `dimens.xml`, and inspect `drawable/*.xml` for reusable shapes.
- Asset policy: identify existing icon/image naming and density folders (`drawable`, `drawable-hdpi`, `mipmap-*`).

Use `rg` first, for example:

```powershell
rg --files | rg "(src/main/res/(layout|values|drawable)|\\.kt$|\\.java$)"
rg "class .*View|extends .*View|<([a-zA-Z_][\\w.]+\\.)+[A-Za-z_]" -n
rg "viewBinding|dataBinding|setContentView|inflate\\(" -n
```

If there is no Android project or no `src/main/res`, stop and ask for the target module instead of guessing.
