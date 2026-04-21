import json
from pathlib import Path


def main():
    input_path = Path("src/assets/full_dict.json")
    output_path = Path("src/assets/VERSI2_n5.json")
    
    print("=" * 60)
    print("Extract nWord:5 from full_dict.json")
    print("=" * 60)
    
    # Load full_dict.json
    print(f"\nLoading {input_path}...")
    with input_path.open("r", encoding="utf-8") as f:
        full_data = json.load(f)
    
    print(f"Total entries in full_dict.json: {len(full_data)}")
    
    # Filter entries with nWord == 5
    filtered_data = [entry for entry in full_data if entry.get("nWord") == 5]
    
    print(f"Entries with nWord=5: {len(filtered_data)}")
    
    # Re-assign IDs from 1
    for idx, entry in enumerate(filtered_data, start=1):
        entry["id"] = idx
    
    # Save with oneline format (each entry on new line)
    print(f"\nSaving to {output_path}...")
    
    with output_path.open("w", encoding="utf-8") as f:
        f.write("[\n")
        for i, entry in enumerate(filtered_data):
            line = json.dumps(entry, ensure_ascii=False, separators=(',', ':'))
            if i < len(filtered_data) - 1:
                f.write(f"  {line},\n")
            else:
                f.write(f"  {line}\n")
        f.write("]\n")
    
    file_size = output_path.stat().st_size
    print(f"\n✅ Created {output_path}")
    print(f"   Entries: {len(filtered_data)}")
    print(f"   Size: {file_size:,} bytes")
    
    # Show sample entries
    print(f"\nSample entries:")
    for entry in filtered_data[:3]:
        print(f"  {entry['word']} - {entry['partOfSpeech']} ({entry['level']})")


if __name__ == "__main__":
    main()
