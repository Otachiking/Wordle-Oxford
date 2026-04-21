import json
import re
from pathlib import Path


def extract_words_from_txt(txt_path: str) -> set:
    """Extract all 5-letter words from newOxfordMerge.txt"""
    words = set()
    with open(txt_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            first_token = line.split(maxsplit=1)[0]
            if len(first_token) == 5 and first_token.isalpha():
                words.add(first_token.lower())
    return words


def main():
    json_path = Path("Data/dict_n5_word.json")
    txt_path = Path("Data/newOxfordMerge.txt")
    
    # Load JSON
    with json_path.open("r", encoding="utf-8") as f:
        json_data = json.load(f)
    
    # Extract source words from txt
    source_words = extract_words_from_txt(str(txt_path))
    
    # Extract words from JSON
    json_words = {entry["word"] for entry in json_data}
    
    # Find discrepancies
    missing_from_source = json_words - source_words
    
    print("=" * 60)
    print("VERIFICATION REPORT")
    print("=" * 60)
    print(f"\nTotal words in JSON: {len(json_words)}")
    print(f"Total 5-letter words in source TXT: {len(source_words)}")
    print(f"\nWords in JSON but NOT in source TXT: {len(missing_from_source)}")
    
    if missing_from_source:
        print("\n⚠️  SUSPICIOUS WORDS (possibly hallucinated):")
        for word in sorted(missing_from_source):
            # Find these entries in JSON to show details
            entries = [e for e in json_data if e["word"] == word]
            for entry in entries:
                print(f"  - {entry['word']} (id: {entry['id']}, level: {entry['level']}, pos: {entry['partOfSpeech']})")
    else:
        print("\n✅ All words verified! No hallucination detected.")
    
    # Compact JSON and save
    print(f"\n{'='*60}")
    print("Converting to compact oneline format...")
    
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"✅ JSON saved in compact format to {json_path}")
    
    # Show file size comparison
    file_size = json_path.stat().st_size
    print(f"File size: {file_size:,} bytes")


if __name__ == "__main__":
    main()
