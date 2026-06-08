# Widget Mapping

Map Lanhu nodes to project-aware Android View XML.

Priority order:

1. Explicit user mapping from `--custom-view-map`.
2. Existing project custom views/components with matching semantics.
3. AndroidX/Material widgets already used by the project.
4. Platform widgets.

Default mappings:

| Lanhu signal | Android XML widget |
| --- | --- |
| Text content or `text` tag | `TextView` |
| Image/icon class or `image` tag | `ImageView` |
| Button text/class/clickable shape | project button/custom button, else `Button` |
| Edit/input/search text | project input/search view, else `EditText` |
| Repeated sibling rows/items | `androidx.recyclerview.widget.RecyclerView` plus item layout report |
| Absolute positioned group | `androidx.constraintlayout.widget.ConstraintLayout` |
| Simple vertical group | `LinearLayout` with `android:orientation="vertical"` |
| Simple horizontal group | `LinearLayout` with `android:orientation="horizontal"` |
| Pure background/separator | `View` |

When using custom views, preserve the full class name in XML and report why it was selected. If unsure between a custom view and a standard view, ask before writing.

Prefer resource references over literals:

- Text -> `@string/...`
- Colors -> existing `@color/...` if exact hex matches, else new color entry.
- Spacing/sizes/text sizes -> existing `@dimen/...` if exact value matches, else new dimen entry.
- Backgrounds -> existing drawable if shape/color/radius/stroke matches, else new shape drawable.

Do not create fake bitmap assets. For missing icons/images, emit a report entry with the recommended file path and resource name.
