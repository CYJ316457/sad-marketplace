---
name: gpt-image-2-gen
description: Use when the user wants to generate images with gpt-image-2, manually configure base_url and api_key, and save outputs into the current project's fixed .generated-images/gpt-image-2 directory.
---

# GPT Image 2 Gen

用这个 skill 时，始终把生成结果写到当前项目里的固定目录：
`.generated-images/gpt-image-2/`

## 配置

用户需要先手动复制模板并填写：

```powershell
copy templates\.gpt-image-2.env.example .gpt-image-2.env
```

然后在 `.gpt-image-2.env` 中设置：
- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`

可选：
- `OPENAI_IMAGE_MODEL`，默认 `gpt-image-2`

## 工作流

1. 先确认当前目录是目标项目根目录。
2. 检查项目内是否存在 `.gpt-image-2.env`，没有就让用户先创建。
3. 解析用户的生图需求，必要时先帮用户收敛提示词。
4. 用 `python scripts/generate_gpt_image_2.py --project <project> --prompt "<prompt>"` 发起生成。
5. 输出最终保存路径。

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
