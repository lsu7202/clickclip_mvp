"""AI 동영상 생성 스키마."""
from pydantic import BaseModel


class GenerateVideoRequest(BaseModel):
    prompt: str


class GenerateVideoResponse(BaseModel):
    video_url: str
