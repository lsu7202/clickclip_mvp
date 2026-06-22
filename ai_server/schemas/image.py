"""이미지 생성 스키마. (ai_server_spec §4)"""
from pydantic import BaseModel


class GenerateImageRequest(BaseModel):
    prompt: str


class GenerateImageResponse(BaseModel):
    image_url: str
    width: int
    height: int
