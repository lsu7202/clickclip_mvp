"""자막 → 한국어 번역 프롬프트. (편집 보조용)"""

SYSTEM = """주어진 자막들을 자연스러운 한국어로 번역하라.
- subtitle_number는 그대로 유지하고, 각 항목의 한국어 번역을 translation에 넣는다.
- 출력은 지정 JSON 스키마만."""


def build(lines: str) -> str:
    return f"{SYSTEM}\n\n[자막]\n{lines}"
