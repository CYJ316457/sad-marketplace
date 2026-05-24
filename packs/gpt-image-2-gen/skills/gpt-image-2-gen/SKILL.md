---
name: gpt-image-2-gen
description: Use when the user wants to generate images with gpt-image-2, manually configure base_url and api_key, and save outputs into the current project's fixed .generated-images/gpt-image-2 directory.
---

# GPT Image 2 Gen

使用这个 skill 时，始终把生成结果写到当前项目内的固定目录：
`.generated-images/gpt-image-2/`

## 配置

首次运行脚本时，如果项目根目录没有 `.gpt-image-2.env`，脚本会自动在项目根目录生成一份 demo 文件。
用户需要直接编辑项目根目录里的这个文件，设置：
- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`

可选：
- `OPENAI_IMAGE_MODEL`，默认 `gpt-image-2`

## 工作流

1. 先确认当前目录是目标项目根目录。
2. 检查项目内是否存在 `.gpt-image-2.env`；如果没有，先运行脚本让它自动生成 demo。
3. 解析用户的生图需求，必要时先帮用户收敛提示词。
4. 按需选择尺寸参数：
   - 自定义分辨率：`--size 1024x1024|1536x1024|1024x1536`
   - 自定义比例：`--aspect-ratio 1:1|16:9|9:16|4:3|3:4|3:2|2:3|landscape|portrait`
   - 如果同时给了 `--size` 和 `--aspect-ratio`，以 `--size` 为准
5. 用 `python scripts/generate_gpt_image_2.py --project <project> --prompt "<prompt>"` 发起生成。
6. 如果用户明确要求横图、竖图、方图，优先补上对应参数，例如：
   - 横图：`--aspect-ratio 16:9`
   - 竖图：`--aspect-ratio 9:16`
   - 方图：`--aspect-ratio 1:1`

## 示例

```bash
python scripts/generate_gpt_image_2.py --project . --prompt "极简白色产品海报，干净背景，中文标题排版" --aspect-ratio 16:9
python scripts/generate_gpt_image_2.py --project . --prompt "二次元角色立绘，透明背景" --size 1024x1536
```

## 输出目录

所有图片固定保存到：

```text
<project>/.generated-images/gpt-image-2/
```

文件名格式：
- `gpt-image-2-YYYYMMDD-HHMMSS.png`

## 流式说明

脚本按流式响应处理事件，并在最终拿到完整图片后落盘。

## 注意

- 不要把 `api_key` 写进 skill 文档或命令参数。
- 如果接口不支持图像流式事件，要明确报错，不要伪装成成功。
- 如果目录不存在，脚本应自动创建。
