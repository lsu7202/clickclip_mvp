"""이미지 생성 라우터. (ai_server_spec §4)"""
from fastapi import APIRouter

from schemas.image import GenerateImageRequest, GenerateImageResponse
from services import fal_service

router = APIRouter(prefix="/images", tags=["images"])


@router.post("/generate", response_model=GenerateImageResponse)
async def generate(req: GenerateImageRequest) -> GenerateImageResponse:
    result = await fal_service.generate_image(req.prompt)
    return GenerateImageResponse(**result)
