"""장면 관련 스키마 — pydantic = JSON 명세(snake_case). (ai_server_spec §1~3)"""
from pydantic import BaseModel


# --- /scenes/split ---
class Subtitle(BaseModel):
    subtitle_number: int
    text: str
    translation: str | None = None  # 비한국어일 때 한국어 번역(편집 보조용)


class Scene(BaseModel):
    scene_number: int
    subtitles: list[Subtitle]
    search_keywords: list[str]
    scene_description: str


class ScenesResponse(BaseModel):
    scenes: list[Scene]


class SplitRequest(BaseModel):
    script_text: str
    language: str = "ko"  # ko | ja


# --- /scenes/keywords ---
class KeywordsRequest(BaseModel):
    subtitles: list[Subtitle]


class KeywordsResponse(BaseModel):
    search_keywords: list[str]


# --- /scenes/image-prompts ---
class ImagePromptsRequest(BaseModel):
    subtitles: list[Subtitle]
    scene_description: str


class ImagePromptsResponse(BaseModel):
    prompts: list[str]


# --- /scenes/translate ---
class TranslateRequest(BaseModel):
    subtitles: list[Subtitle]


class SubtitleTranslation(BaseModel):
    subtitle_number: int
    translation: str


class TranslateResponse(BaseModel):
    translations: list[SubtitleTranslation]
