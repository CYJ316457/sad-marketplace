# Agnes Video V2.0 API Reference

Source: https://agnes-ai.com/doc/agnes-video-v20

## Endpoint

- Base URL: `https://apihub.agnes-ai.com`
- Create video task: `POST https://apihub.agnes-ai.com/v1/videos`
- Query by video id: `GET https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>`
- Query by video id with explicit model: `GET https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>&model_name=agnes-video-v2.0`
- Legacy query by task id: `GET https://apihub.agnes-ai.com/v1/videos/<TASK_ID>`
- Model: `agnes-video-v2.0`

## Text To Video

```json
{
  "model": "agnes-video-v2.0",
  "prompt": "A cinematic shot of a cat walking on the beach at sunset, soft ocean waves, warm golden lighting, realistic motion",
  "height": 768,
  "width": 1152,
  "num_frames": 121,
  "frame_rate": 24
}
```

## Image To Video

```json
{
  "model": "agnes-video-v2.0",
  "prompt": "The woman slowly turns around and looks back at the camera, natural facial expression, cinematic camera movement",
  "image": "https://example.com/image.png",
  "num_frames": 121,
  "frame_rate": 24
}
```

## Multi-Image Video

```json
{
  "model": "agnes-video-v2.0",
  "prompt": "Create a smooth transformation scene between the two reference images, cinematic lighting, consistent character identity, natural motion",
  "extra_body": {
    "image": [
      "https://example.com/image1.png",
      "https://example.com/image2.png"
    ]
  },
  "num_frames": 121,
  "frame_rate": 24
}
```

## Keyframe Animation

```json
{
  "model": "agnes-video-v2.0",
  "prompt": "Generate a smooth cinematic transition between the keyframes, maintaining visual consistency and natural camera movement",
  "extra_body": {
    "image": [
      "https://example.com/keyframe1.png",
      "https://example.com/keyframe2.png"
    ],
    "mode": "keyframes"
  },
  "num_frames": 121,
  "frame_rate": 24
}
```

## Create Response

```json
{
  "id": "task_YOUR_TASK_ID",
  "task_id": "task_YOUR_TASK_ID",
  "video_id": "video_YOUR_VIDEO_ID",
  "object": "video",
  "model": "agnes-video-v2.0",
  "status": "queued",
  "progress": 0,
  "created_at": 1780457477,
  "seconds": "10.0",
  "size": "1280x768"
}
```

## Completed Response

```json
{
  "id": "task_YOUR_TASK_ID",
  "video_id": "video_YOUR_VIDEO_ID",
  "model": "agnes-video-v2.0",
  "object": "video",
  "status": "completed",
  "progress": 100,
  "seconds": "10.0",
  "size": "1280x768",
  "remixed_from_video_id": "https://storage.googleapis.com/agnes-aigc/aigc/videos/2026/06/03/video_xxxxxx.mp4",
  "error": null
}
```

## Timing Rules

- `seconds = num_frames / frame_rate`.
- `num_frames <= 441`.
- `num_frames` must match `8n + 1`, for example `81`, `121`, `161`, `241`, or `441`.
- `frame_rate` supports `1` to `60`.
