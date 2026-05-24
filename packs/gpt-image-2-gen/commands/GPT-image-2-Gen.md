---
description: 使用 gpt-image-2 生成图片，自动在项目根目录创建 .gpt-image-2.env demo，并将图片保存到 .generated-images/gpt-image-2/
argument-hint: <提示词>
allowed-tools: [Bash(python *), Read, Glob]
---

先检查当前项目根目录是否有 `.gpt-image-2.env`。

如果没有：
- 先让脚本自动生成 demo 配置
- 提示用户编辑后再重跑

如果已有配置：
- 先根据用户要求决定尺寸参数
- 支持自定义分辨率：
  - `--size 1024x1024`
  - `--size 1536x1024`
  - `--size 1024x1536`
- 支持自定义比例：
  - `--aspect-ratio 1:1`
  - `--aspect-ratio 16:9`
  - `--aspect-ratio 9:16`
  - `--aspect-ratio 4:3`
  - `--aspect-ratio 3:4`
  - `--aspect-ratio 3:2`
  - `--aspect-ratio 2:3`
  - `--aspect-ratio landscape`
  - `--aspect-ratio portrait`
- 如果同时给了 `--size` 和 `--aspect-ratio`，以 `--size` 为准
- 调用：
  - `python scripts/generate_gpt_image_2.py --project <当前项目根目录> --prompt "<提示词>"`
  - 如需横图或竖图，追加 `--aspect-ratio ...`
  - 如需精确分辨率，追加 `--size ...`

输出要求：
- 用中文返回保存路径
- 如果模型返回失败，直接说明错误，不要伪装成功
