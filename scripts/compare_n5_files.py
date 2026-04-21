import json
from pathlib import Path


def main():
    file1_path = Path("Data/dict_n5_word.json")
    file2_path = Path("Data/VERSI2_n5.json")
    
    print("=" * 70)
    print("COMPARE dict_n5_word.json vs VERSI2_n5.json")
    print("=" * 70)
    
    # Load both files
    print(f"\nLoading {file1_path}...")
    with file1_path.open("r", encoding="utf-8") as f:
        dict_n5_data = json.load(f)
    
    print(f"Loading {file2_path}...")
    with file2_path.open("r", encoding="utf-8") as f:
        versi2_data = json.load(f)
    
    print(f"\ndict_n5_word.json: {len(dict_n5_data)} entries")
    print(f"VERSI2_n5.json: {len(versi2_data)} entries")
    
    # Extract words
    dict_n5_words = {entry["word"] for entry in dict_n5_data}
    versi2_words = {entry["word"] for entry in versi2_data}
    
    print(f"\nUnique words in dict_n5_word.json: {len(dict_n5_words)}")
    print(f"Unique words in VERSI2_n5.json: {len(versi2_words)}")
    
    # Find differences
    only_in_dict_n5 = dict_n5_words - versi2_words
    only_in_versi2 = versi2_words - dict_n5_words
    
    print("\n" + "=" * 70)
    print("DIFFERENCES:")
    print("=" * 70)
    
    if only_in_dict_n5:
        print(f"\n📌 Words ONLY in dict_n5_word.json ({len(only_in_dict_n5)}):")
        for word in sorted(only_in_dict_n5):
            entry = [e for e in dict_n5_data if e["word"] == word][0]
            print(f"  - '{word}' (pos: {entry['partOfSpeech']}, level: {entry['level']}, id: {entry['id']})")
    else:
        print(f"\n✅ Tidak ada kata yang hanya di dict_n5_word.json")
    
    if only_in_versi2:
        print(f"\n📌 Words ONLY in VERSI2_n5.json ({len(only_in_versi2)}):")
        for word in sorted(only_in_versi2):
            entry = [e for e in versi2_data if e["word"] == word][0]
            print(f"  - '{word}' (pos: {entry['partOfSpeech']}, level: {entry['level']}, id: {entry['id']})")
    else:
        print(f"\n✅ Tidak ada kata yang hanya di VERSI2_n5.json")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY:")
    print("=" * 70)
    common_words = dict_n5_words & versi2_words
    print(f"Kata yang sama di kedua file: {len(common_words)}")
    print(f"Kata hanya di dict_n5_word.json: {len(only_in_dict_n5)}")
    print(f"Kata hanya di VERSI2_n5.json: {len(only_in_versi2)}")
    
    if not only_in_dict_n5 and not only_in_versi2:
        print("\n✅ KEDUA FILE MEMILIKI KATA YANG SAMA (HANYA METADATA YANG BERBEDA)")
    else:
        print(f"\n⚠️  Ada perbedaan: {len(only_in_dict_n5)} + {len(only_in_versi2)} = {len(only_in_dict_n5) + len(only_in_versi2)} kata berbeda")


if __name__ == "__main__":
    main()
