"""장면 관련 스키마 — pydantic = JSON 명세(snake_case). (ai_server_spec §1~3)"""
from pydantic import BaseModel


# --- /scenes/split ---
class Subtitle(BaseModel):
    subtitle_number: int
    text: str


class Scene(BaseModel):
    scene_number: int
    subtitles: list[Subtitle]
    search_keywords: list[str]
    scene_description: str


class ScenesResponse(BaseModel):
    scenes: list[Scene]


class SplitRequest(BaseModel):
    script_text: str


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
