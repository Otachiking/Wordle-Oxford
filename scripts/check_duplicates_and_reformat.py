import json
from pathlib import Path
from collections import Counter


def main():
    json_path = Path("Data/dict_n5_word.json")
    
    # Load JSON
    with json_path.open("r", encoding="utf-8") as f:
        json_data = json.load(f)
    
    print("=" * 60)
    print("DUPLICATE CHECK")
    print("=" * 60)
    
    # Count word occurrences
    words = [entry["word"] for entry in json_data]
    word_counts = Counter(words)
    
    duplicates = {word: count for word, count in word_counts.items() if count > 1}
    
    print(f"\nTotal entries in JSON: {len(json_data)}")
    print(f"Unique words: {len(word_counts)}")
    print(f"Duplicate words found: {len(duplicates)}")
    
    if duplicates:
        print("\n⚠️  DUPLICATES DETECTED:")
        for word, count in sorted(duplicates.items()):
            print(f"  - '{word}': appears {count} times")
            # Show all entries for this word
            entries = [e for e in json_data if e["word"] == word]
            for i, entry in enumerate(entries, 1):
                print(f"      [{i}] id={entry['id']}, pos={entry['partOfSpeech']}, level={entry['level']}")
    
    # Remove duplicates, keeping first occurrence
    print(f"\n{'='*60}")
    print("Removing duplicates (keeping first occurrence)...")
    
    seen = set()
    cleaned_data = []
    for entry in json_data:
        if entry["word"] not in seen:
            cleaned_data.append(entry)
            seen.add(entry["word"])
    
    # Re-assign IDs from 1
    for idx, entry in enumerate(cleaned_data, start=1):
        entry["id"] = idx
    
    print(f"After cleaning: {len(cleaned_data)} unique entries")
    
    # Save with each entry on a new line
    print(f"\nFormatting to single-line-per-entry...")
    
    with json_path.open("w", encoding="utf-8") as f:
        f.write("[\n")
        for i, entry in enumerate(cleaned_data):
            line = json.dumps(entry, ensure_ascii=False, separators=(',', ':'))
            if i < len(cleaned_data) - 1:
                f.write(f"  {line},\n")
            else:
                f.write(f"  {line}\n")
        f.write("]\n")
    
    print(f"✅ JSON saved with clean data")
    print(f"   File: {json_path}")
    print(f"   Entries: {len(cleaned_data)}")
    
    file_size = json_path.stat().st_size
    print(f"   Size: {file_size:,} bytes")


if __name__ == "__main__":
    main()
