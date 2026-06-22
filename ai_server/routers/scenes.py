"""장면 관련 라우터 — split / keywords / image-prompts. (ai_server_spec §1~3)"""
from fastapi import APIRouter

from schemas.scene import (
    ImagePromptsRequest,
    ImagePromptsResponse,
    KeywordsRequest,
    KeywordsResponse,
    ScenesResponse,
    SplitRequest,
)
from services import gemini_service

router = APIRouter(prefix="/scenes", tags=["scenes"])


@router.post("/split", response_model=ScenesResponse)
def split(req: SplitRequest) -> ScenesResponse:
    return gemini_service.split_scenes(req.script_text)


@router.post("/keywords", response_model=KeywordsResponse)
def keywords(req: KeywordsRequest) -> KeywordsResponse:
    return gemini_service.extract_keywords(req.subtitles)


@router.post("/image-prompts", response_model=ImagePromptsResponse)
def image_prompts(req: ImagePromptsRequest) -> ImagePromptsResponse:
    return gemini_service.suggest_image_prompts(req.subtitles, req.scene_description)
