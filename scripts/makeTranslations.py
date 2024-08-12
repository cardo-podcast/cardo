from deep_translator import GoogleTranslator
import json
import os

LOCALE_FOLDER = '..resources/translations'
SRC = 'en'
DEST = ['es', 'fr', 'de']



def translate(text, src='ko', dest='en'):
    translator = GoogleTranslator(source=src, target=dest)
    return translator.translate(text)


with open(os.path.join(LOCALE_FOLDER, f'{SRC}.json'), 'r') as f:
    src = json.load(f)

for destLang in DEST:
    destFile = os.path.join(LOCALE_FOLDER, f'{destLang}.json')
    if os.path.exists(destFile):
        with open(destFile, 'r') as f:
            dest = json.load(f)
    else:
        dest = {}

    for (key, value) in src.items():
        if not key in dest.keys():
            dest[key] = translate(value, src=SRC, dest=destLang)

    with open(destFile, 'w') as f:
        dest = json.dump(dest, f, indent=2)