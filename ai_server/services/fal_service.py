"""fal.ai 래퍼 — 나노바나나(이미지) + Wan 2.5(동영상). (external_api_spec §5)

둘 다 픽셀크기 직접지정 불가 → aspect_ratio "9:16". 응답 url.
"""
import fal_client

import config


async def generate_image(prompt: str) -> dict:
    result = await fal_client.subscribe_async(
        config.FAL_IMAGE_MODEL,
        arguments={
            "prompt": prompt,
            "num_images": 1,
            "aspect_ratio": config.FAL_IMAGE_ASPECT_RATIO,
            "output_format": config.FAL_IMAGE_OUTPUT_FORMAT,
        },
    )
    image = result["images"][0]
    return {
        "image_url": image["url"],
        "width": image.get("width") or 0,
        "height": image.get("height") or 0,
    }


async def generate_video(prompt: str) -> dict:
    # Wan 2.5: 느림(수십초~분) → subscribe_async(큐) 사용.
    result = await fal_client.subscribe_async(
        config.FAL_VIDEO_MODEL,
        arguments={
            "prompt": prompt,
            "aspect_ratio": config.FAL_VIDEO_ASPECT_RATIO,
            "resolution": config.FAL_VIDEO_RESOLUTION,
            "duration": config.FAL_VIDEO_DURATION,  # "5" | "10"
        },
    )
    return {"video_url": result["video"]["url"]}
