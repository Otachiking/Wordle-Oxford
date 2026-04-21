import json
import re
from pathlib import Path


INPUT_PATH = Path("Data/newOxfordMerge.txt")
OUTPUT_PATH = Path("Data/dict_n5_word.json")


def extract_level(line: str) -> str:
    match = re.search(r"\b(A1|A2|B1|B2|C1|C2)\b", line)
    return match.group(1) if match else ""


def extract_pos(line: str) -> str:
    level_match = re.search(r"\b(A1|A2|B1|B2|C1|C2)\b", line)
    if not level_match:
        return ""

    # POS is the token right before the first CEFR level marker.
    prefix = line[: level_match.start()].strip()
    if not prefix:
        return ""

    token = prefix.split()[-1].strip()
    token = token.rstrip(",")
    return token


def parse_line(line: str):
    line = line.strip()
    if not line:
        return None

    first = line.split(maxsplit=1)[0]

    # Keep only single-token alphabetic words with exact length 5.
    if len(first) != 5 or not first.isalpha():
        return None

    level = extract_level(line)
    pos = extract_pos(line)

    return {
        "word": first.lower(),
        "nWord": 5,
        "partOfSpeech": pos,
        "level": level,
        "definition": "",
        "emoji": "",
    }


def main() -> None:
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Input file not found: {INPUT_PATH}")

    rows = []
    with INPUT_PATH.open("r", encoding="utf-8") as f:
        for raw in f:
            item = parse_line(raw)
            if item:
                rows.append(item)

    result = []
    for idx, row in enumerate(rows, start=1):
        result.append(
            {
                "id": idx,
                "word": row["word"],
                "nWord": row["nWord"],
                "partOfSpeech": row["partOfSpeech"],
                "level": row["level"],
                "definition": row["definition"],
                "emoji": row["emoji"],
            }
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(result)} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
