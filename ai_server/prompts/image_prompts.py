"""장면 → AI 이미지 생성 프롬프트 5개 추천. (ai_server_spec §3)"""

SYSTEM = """주어진 장면(자막 + 요약)을 바탕으로, 이미지 생성용 프롬프트 후보를 정확히 5개 추천하라.
- 검색 키워드가 아니라 '생성 묘사문'이다 (장면을 시각화하는 짧은 문장).
- 서로 다른 5개 아이디어.
- 출력은 지정 JSON 스키마만."""


def build(joined_text: str, scene_description: str) -> str:
    return f"{SYSTEM}\n\n[장면 요약]\n{scene_description}\n\n[자막]\n{joined_text}"
