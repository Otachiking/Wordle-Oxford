import json
from pathlib import Path


def main():
    backup_path = Path("src/assets/Backup/wordbackup.json")
    simple_path = Path("src/assets/nword5_simple.json")
    output_path = Path("Data/DICTIONARY_nWord_5.json")
    
    print("=" * 70)
    print("CREATE DICTIONARY_nWord_5.json FROM wordbackup.json")
    print("=" * 70)
    
    # Load wordbackup.json (list of words)
    print(f"\nLoading {backup_path}...")
    with backup_path.open("r", encoding="utf-8") as f:
        word_list = json.load(f)
    
    print(f"Loaded: {len(word_list)} words")
    
    # Load nword5_simple.json (has definitions and emojis)
    print(f"\nLoading {simple_path}...")
    with simple_path.open("r", encoding="utf-8") as f:
        simple_data = json.load(f)
    
    print(f"Loaded: {len(simple_data)} entries with definitions and emojis")
    
    # Create lookup from simple_data
    simple_map = {entry["word"]: entry for entry in simple_data}
    
    # Build result
    print(f"\nBuilding DICTIONARY_nWord_5.json...")
    result = []
    found_def = 0
    missing_def = []
    
    for idx, word in enumerate(word_list, start=1):
        entry = {
            "id": idx,
            "word": word,
            "nWord": 5,
            "partOfSpeech": "",
            "level": "",
            "definition": "",
            "emoji": ""
        }
        
        # Try to find definition and emoji from simple_map
        if word in simple_map:
            simple_entry = simple_map[word]
            entry["definition"] = simple_entry.get("definition", "")
            entry["emoji"] = simple_entry.get("emoji", "")
            if entry["definition"]:
                found_def += 1
            else:
                missing_def.append(word)
        else:
            missing_def.append(word)
        
        result.append(entry)
    
    # Save
    print(f"\nSaving to {output_path}...")
    
    with output_path.open("w", encoding="utf-8") as f:
        f.write("[\n")
        for i, entry in enumerate(result):
            line = json.dumps(entry, ensure_ascii=False, separators=(',', ':'))
            if i < len(result) - 1:
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
    print(f"   Words from wordbackup.json: {len(word_list)}")
    print(f"   Total entries created: {len(result)}")
    print(f"   File size: {file_size:,} bytes")
    
    print(f"\n✅ ENRICHMENT STATISTICS:")
    print(f"   Entries with definition & emoji: {found_def}")
    print(f"   Entries WITHOUT definition & emoji: {len(missing_def)}")
    print(f"   Coverage: {(found_def / len(result) * 100):.1f}%")
    
    print(f"\n🔴 WORDS NOT FOUND IN nword5_simple.json ({len(missing_def)}):")
    for word in missing_def[:20]:  # Show first 20
        print(f"   - {word}")
    
    if len(missing_def) > 20:
        print(f"   ... and {len(missing_def) - 20} more")
    
    print(f"\n✅ Created {output_path}")
    print(f"   Total: {len(result)} entries")
    
    # Show sample entries
    print(f"\nSample entries WITH definition:")
    count = 0
    for entry in result:
        if entry["definition"]:
            print(f"  id={entry['id']}: {entry['word']:10} | def: {entry['definition'][:45]}...")
            count += 1
            if count >= 3:
                break
    
    print(f"\nSample entries WITHOUT definition:")
    count = 0
    for entry in result:
        if not entry["definition"]:
            print(f"  id={entry['id']}: {entry['word']:10} | EMPTY")
            count += 1
            if count >= 3:
                break


if __name__ == "__main__":
    main()
