"""Gemini 래퍼 — 분할/키워드/프롬프트. (external_api_spec §3)

SDK: google-genai. structured output(response_schema=Pydantic).
"""
from google import genai
from google.genai import types

import config
from prompts import image_prompts, keywords, split_script
from schemas.scene import (
    ImagePromptsResponse,
    KeywordsResponse,
    ScenesResponse,
    Subtitle,
)

# 클라이언트는 모듈 로드 시 1회 생성 후 재사용 (FastAPI 권장)
_client = genai.Client(api_key=config.GEMINI_API_KEY)


def _generate(prompt: str, schema) -> str:
    resp = _client.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
        ),
    )
    return resp.text


def split_scenes(script_text: str) -> ScenesResponse:
    text = _generate(split_script.build(script_text), ScenesResponse)
    return ScenesResponse.model_validate_json(text)


def extract_keywords(subtitles: list[Subtitle]) -> KeywordsResponse:
    joined = " ".join(s.text for s in subtitles)
    text = _generate(keywords.build(joined), KeywordsResponse)
    return KeywordsResponse.model_validate_json(text)


def suggest_image_prompts(
    subtitles: list[Subtitle], scene_description: str
) -> ImagePromptsResponse:
    joined = " ".join(s.text for s in subtitles)
    text = _generate(
        image_prompts.build(joined, scene_description), ImagePromptsResponse
    )
    return ImagePromptsResponse.model_validate_json(text)
