import json
from pathlib import Path
from collections import defaultdict


def main():
    dict_path = Path("Data/dict_n5_word.json")
    simple_path = Path("src/assets/nword5_simple.json")
    output_path = Path("Data/DICTIONARY_nWord_5.json")
    
    print("=" * 70)
    print("MERGING dict_n5_word.json + close + nword5_simple.json")
    print("=" * 70)
    
    # Load dict_n5_word.json
    print(f"\nLoading {dict_path}...")
    with dict_path.open("r", encoding="utf-8") as f:
        dict_data = json.load(f)
    
    print(f"Loaded: {len(dict_data)} entries")
    
    # Add "close" as verb A1
    print(f"\nAdding 'close' (verb, A1)...")
    new_close = {
        "word": "close",
        "nWord": 5,
        "partOfSpeech": "v.",
        "level": "A1",
        "definition": "",
        "emoji": ""
    }
    dict_data.append(new_close)
    print(f"Total after adding close: {len(dict_data)}")
    
    # Load nword5_simple.json (has definitions and emojis)
    print(f"\nLoading {simple_path}...")
    with simple_path.open("r", encoding="utf-8") as f:
        simple_data = json.load(f)
    
    print(f"Loaded: {len(simple_data)} entries with definitions and emojis")
    
    # Create lookup dictionary from simple data
    simple_map = {entry["word"]: entry for entry in simple_data}
    
    # Merge: enrich dict_data with definitions and emojis from simple_data
    print(f"\nMerging definitions and emojis...")
    with_def = 0
    without_def = 0
    
    for entry in dict_data:
        word = entry["word"]
        if word in simple_map:
            simple_entry = simple_map[word]
            entry["definition"] = simple_entry.get("definition", "")
            entry["emoji"] = simple_entry.get("emoji", "")
            if entry["definition"]:
                with_def += 1
            else:
                without_def += 1
        else:
            without_def += 1
    
    # Re-assign IDs from 1
    for idx, entry in enumerate(dict_data, start=1):
        entry["id"] = idx
    
    # Sort by word name for consistency
    dict_data_sorted = sorted(dict_data, key=lambda x: x["word"])
    
    # Re-assign IDs after sorting
    for idx, entry in enumerate(dict_data_sorted, start=1):
        entry["id"] = idx
    
    # Save with oneline format
    print(f"\nSaving to {output_path}...")
    
    with output_path.open("w", encoding="utf-8") as f:
        f.write("[\n")
        for i, entry in enumerate(dict_data_sorted):
            line = json.dumps(entry, ensure_ascii=False, separators=(',', ':'))
            if i < len(dict_data_sorted) - 1:
                f.write(f"  {line},\n")
            else:
                f.write(f"  {line}\n")
        f.write("]\n")
    
    file_size = output_path.stat().st_size
    
    # Report
    print("\n" + "=" * 70)
    print("SUMMARY REPORT")
    print("=" * 70)
    
    print(f"\n📊 FILE STATISTICS:")
    print(f"   Original dict_n5_word.json: 692 entries")
    print(f"   + Added 'close' (verb, A1): +1")
    print(f"   = Total entries: {len(dict_data_sorted)}")
    print(f"   File size: {file_size:,} bytes")
    
    print(f"\n✅ ENRICHMENT STATISTICS:")
    print(f"   Entries with definition & emoji: {with_def}")
    print(f"   Entries WITHOUT definition & emoji: {without_def}")
    print(f"   Coverage: {(with_def / len(dict_data_sorted) * 100):.1f}%")
    
    # Find entries without definitions
    missing_defs = [e for e in dict_data_sorted if not e.get("definition")]
    
    print(f"\n📌 ENTRIES WITHOUT DEFINITIONS ({len(missing_defs)}):")
    if missing_defs:
        for entry in missing_defs[:10]:  # Show first 10
            print(f"   - {entry['word']:10} ({entry['partOfSpeech']}, {entry['level']})")
        if len(missing_defs) > 10:
            print(f"   ... and {len(missing_defs) - 10} more")
    
    print(f"\n✅ Created {output_path}")
    print(f"   Total: {len(dict_data_sorted)} entries")
    print(f"   Sorted by: word name (alphabetical)")
    
    # Show sample entries
    print(f"\nSample entries:")
    for entry in dict_data_sorted[:3]:
        print(f"  id={entry['id']}: {entry['word']} | {entry['partOfSpeech']:10} | {entry['level']} | def: {entry['definition'][:40] if entry['definition'] else 'EMPTY'}")


if __name__ == "__main__":
    main()
