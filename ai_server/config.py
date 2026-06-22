"""AI 서버 설정 — 키/모델/상수 한 곳 고정. (ai_server_spec §6)"""
import os

from dotenv import load_dotenv

load_dotenv()

# --- API keys ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TYPECAST_API_KEY = os.getenv("TYPECAST_API_KEY")
FAL_KEY = os.getenv("FAL_KEY")  # fal_client가 자동 인식

# --- Gemini ---
GEMINI_MODEL = "gemini-2.5-flash"

# --- Typecast TTS (external_api_spec §4) ---
TYPECAST_VOICE_ID = os.getenv("TYPECAST_VOICE_ID", "tc_672c5f5ce59fac2a48faeaee")
TYPECAST_MODEL = os.getenv("TYPECAST_MODEL", "ssfm-v30")
TYPECAST_LANGUAGE = "kor"
TYPECAST_OUTPUT_FORMAT = "mp3"
# 속도(tempo) 환경변수 관리. 0.5~2.0, 기본 1.0
TTS_SPEED = float(os.getenv("TTS_SPEED", "1.0"))

# --- fal.ai 나노바나나 (이미지) ---
FAL_IMAGE_MODEL = "fal-ai/nano-banana"
FAL_IMAGE_ASPECT_RATIO = "9:16"  # 세로. 픽셀 크기 입력 불가
FAL_IMAGE_OUTPUT_FORMAT = "png"

# --- fal.ai Wan 2.5 (AI 동영상) ---
FAL_VIDEO_MODEL = os.getenv("FAL_VIDEO_MODEL", "fal-ai/wan-25-preview/text-to-video")
FAL_VIDEO_ASPECT_RATIO = "9:16"
FAL_VIDEO_RESOLUTION = os.getenv("FAL_VIDEO_RESOLUTION", "720p")
FAL_VIDEO_DURATION = os.getenv("FAL_VIDEO_DURATION", "5")  # "5" | "10" (문자열)

# 단위 환산
US_PER_SEC = 1_000_000
