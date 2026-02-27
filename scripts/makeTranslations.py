from deep_translator import GoogleTranslator
import json
import os

LOCALE_FOLDER = "resources/translations"
SRC = "es"
DEST = ["en"]


def translate(text, src="ko", dest="en"):
    translator = GoogleTranslator(source=src, target=dest)
    return translator.translate(text)


with open(os.path.join(LOCALE_FOLDER, f"{SRC}.json"), "r") as f:
    src = json.load(f)

for dest_lang in DEST:
    dest_file = os.path.join(LOCALE_FOLDER, f"{dest_lang}.json")
    if os.path.exists(dest_file):
        with open(dest_file, "r") as f:
            dest = json.load(f)
    else:
        dest = {}

    for key, value in src.items():
        if key not in dest.keys():
            dest[key] = translate(value, src=SRC, dest=dest_lang)

    with open(dest_file, "w", encoding="utf-8") as f:
        dest = json.dump(dest, f, indent=2, ensure_ascii=False)


# delete removed keys other languages
delete_keys = set()
something_new = False
for lang in os.listdir(LOCALE_FOLDER):
    lang_file = os.path.join(LOCALE_FOLDER, lang)

    with open(lang_file, "r", encoding="utf-8") as f:
        translations: dict = json.load(f)

    new_translations = translations.copy()
    for key, value in translations.items():
        if key not in src:
            if key in delete_keys or input(
                f'Do you want to delete key "{key}" from translations [Y/n]'
            ) not in ["n", "N"]:
                delete_keys.add(key)  # avoid redundant questions
                print(f'Removed key "{key}" from {lang}')
                new_translations.pop(key)

    if new_translations.keys() != translations.keys():
        something_new = True
        with open(lang_file, "w", encoding="utf-8") as f:
            json.dump(new_translations, f, indent=2, ensure_ascii=False)

if not something_new:
    exit(1)
