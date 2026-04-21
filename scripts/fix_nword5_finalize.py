import json
from pathlib import Path

def main():
    dictionary_path = Path("Data/DICTIONARY_nWord_5.json")
    dict_n5_path = Path("Data/dict_n5_word.json")

    # Load previously built dictionary
    with dictionary_path.open("r", encoding="utf-8") as f:
        dictionary_data = json.load(f)

    # Load reference dictionary for part and level
    with dict_n5_path.open("r", encoding="utf-8") as f:
        dict_n5_data = json.load(f)

    # Mapping from dict_n5_word.json
    n5_map = {
        item["word"]: {"part": item.get("partOfSpeech", ""), "level": item.get("level", "")} 
        for item in dict_n5_data
    }

    # User's manual definitions and overrides (Max 80 chars)
    manual_updates = {
        "fibre": {"part": "n.", "level": "C1", "definition": "A thread or filament forming plant or animal tissue.", "emoji": "🧵"},
        "field": {"part": "n.", "level": "A2", "definition": "An area of open land, especially planted with crops.", "emoji": "🌾"},
        "fifth": {"part": "number", "level": "A1", "definition": "Constituting number five in a sequence.", "emoji": "5️⃣"},
        "fifty": {"part": "number", "level": "A1", "definition": "The number equivalent to five times ten.", "emoji": "5️⃣0️⃣"},
        "fight": {"part": "v.", "level": "A2", "definition": "To take part in a violent physical struggle.", "emoji": "🥊"},
        "final": {"part": "n.", "level": "A2", "definition": "Coming at the end of a series or process.", "emoji": "🏁"},
        "first": {"part": "number", "level": "A1", "definition": "Coming before all others in time or order.", "emoji": "🥇"},
        "fixed": {"part": "adj.", "level": "B1", "definition": "Placed or attached in a way that will not move.", "emoji": "📌"},
        "flame": {"part": "n.", "level": "B2", "definition": "A hot glowing body of ignited gas from a fire.", "emoji": "🔥"},
        "flash": {"part": "n.", "level": "B2", "definition": "A sudden and brief burst of bright light.", "emoji": "📸"},
        "fleet": {"part": "v.", "level": "C1", "definition": "To move or pass quickly.", "emoji": "💨"},
        "flesh": {"part": "n.", "level": "C1", "definition": "The soft muscle and fat between skin and bones.", "emoji": "🥩"},
        "float": {"part": "v.", "level": "B2", "definition": "To rest or move on the surface of a liquid.", "emoji": "🎈"},
        "flood": {"part": "n.", "level": "B1", "definition": "An overflow of a large amount of water.", "emoji": "🌊"},
        "floor": {"part": "n.", "level": "A1", "definition": "The lower surface of a room on which one walks.", "emoji": "🪵"},
        "flour": {"part": "n.", "level": "B1", "definition": "A powder obtained by grinding grain to make bread.", "emoji": "🥖"},
        "fluid": {"part": "n.", "level": "C1", "definition": "A substance with no fixed shape that flows easily.", "emoji": "💧"},
        "maker": {"part": "n.", "level": "C1", "definition": "A person or thing that makes or produces something.", "emoji": "🛠️"},
    }

    exclude_words = {"modal", "words"}

    new_data = []
    new_id = 1
    
    print("=" * 70)
    print("UPDATING DICTIONARY_nWord_5.json")
    print("=" * 70)
    
    for item in dictionary_data:
        word = item["word"]

        # Drop words
        if word in exclude_words:
            continue
        
        # Original values from DICTIONARY_nWord_5.json
        part = item.get("partOfSpeech", item.get("part", ""))
        level = item.get("level", "")
        definition = item.get("definition", "")
        emoji = item.get("emoji", "")

        # Override part and level from dict_n5_word.json reference
        if word in n5_map:
            part = n5_map[word]["part"]
            level = n5_map[word]["level"]

        # Override missing words with manual updates
        if word in manual_updates:
            part = manual_updates[word]["part"]
            level = manual_updates[word]["level"]
            definition = manual_updates[word]["definition"]
            emoji = manual_updates[word]["emoji"]

        # Format new entry
        new_data.append({
            "id": new_id,
            "word": word,
            "nWord": 5,
            "part": part, 
            "level": level,
            "definition": definition,
            "emoji": emoji
        })
        new_id += 1

    # Save to file
    with dictionary_path.open("w", encoding="utf-8") as f:
        f.write("[\n")
        for i, entry in enumerate(new_data):
            line = json.dumps(entry, ensure_ascii=False, separators=(',', ':'))
            if i < len(new_data) - 1:
                f.write(f"  {line},\n")
            else:
                f.write(f"  {line}\n")
        f.write("]\n")

    print(f"✅ 'partOfSpeech' changed to 'part'")
    print(f"✅ Values synced with reference in dict_n5_word.json (part & level)")
    print(f"✅ Definitions added (< 80 chars) & proper emojis set for the {len(manual_updates)} missing words.")
    print(f"✅ Removed words: {', '.join(exclude_words)}")
    print(f"✅ Total Entries remaining: {len(new_data)}")
    print(f"✅ File successfully saved to {dictionary_path}")

if __name__ == "__main__":
    main()
