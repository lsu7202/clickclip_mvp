"""자막 → 검색 키워드 재추출 프롬프트. (ai_server_spec §2)"""

SYSTEM = """주어진 자막들을 보고, 이 장면을 검색(gif/이미지)할 영문 키워드 2~4개를 뽑아라.
- 각 키워드는 1~2단어. 전체를 공백으로 이으면 50자 이내가 되도록 짧게.
- 고유명사·시각적 키워드 우선. 문장이 아니라 키워드.
출력은 지정 JSON 스키마만."""


def build(joined_text: str) -> str:
    return f"{SYSTEM}\n\n[자막]\n{joined_text}"
