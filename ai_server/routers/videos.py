"""AI 동영상 생성 라우터 (fal Wan 2.5)."""
from fastapi import APIRouter

from schemas.video import GenerateVideoRequest, GenerateVideoResponse
from services import fal_service

router = APIRouter(prefix="/videos", tags=["videos"])


@router.post("/generate", response_model=GenerateVideoResponse)
async def generate(req: GenerateVideoRequest) -> GenerateVideoResponse:
    result = await fal_service.generate_video(req.prompt)
    return GenerateVideoResponse(**result)
