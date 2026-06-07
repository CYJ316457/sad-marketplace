# Agnes Image 2.1 Flash API Reference

Source: https://agnes-ai.com/doc/agnes-image-21-flash

## Endpoint

- Base URL: `https://apihub.agnes-ai.com`
- Endpoint: `https://apihub.agnes-ai.com/v1/images/generations`
- Model: `agnes-image-2.1-flash`

## Text To Image

URL output:

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "A luminous floating city above a misty canyon at sunrise, cinematic realism",
  "size": "1024x768",
  "extra_body": {
    "response_format": "url"
  }
}
```

Base64 output:

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "A clean product photo of a glass cube on a white studio background, soft shadows, high detail",
  "size": "1024x768",
  "return_base64": true
}
```

## Image To Image

URL input and URL output:

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "Transform the scene into a rain-soaked cyberpunk night with neon reflections while preserving the original composition",
  "size": "1024x768",
  "image": ["https://example.com/input-image.png"],
  "extra_body": {
    "response_format": "url"
  }
}
```

URL input and Base64 output:

```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "Make the object orange while preserving the original composition",
  "size": "1024x768",
  "image": ["https://example.com/input-image.png"],
  "extra_body": {
    "response_format": "b64_json"
  }
}
```

Data URI input:

```text
data:image/png;base64,BASE64_HERE
```

## Response

URL output is returned at `data[0].url`.

Base64 output is returned at `data[0].b64_json`.

## Errors To Avoid

- Do not put `response_format` at the top level.
- Do not send `tags: ["img2img"]`.
- Public image URLs must be accessible to the Agnes server without cookies or private headers.
- Use a client timeout between 60 and 360 seconds.
