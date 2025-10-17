import glob
import json
from pathlib import Path

TRANSLATIONS_PATH = "resources/translations"


def generate_translation_table(translations):
    """Generate HTML table with translations data"""
    table_header = """
<table>
  <thead>
    <tr>
      <th>Language</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
"""
    table_rows = []
    for lang, data in translations.items():
        # text colors means translation "health"
        if data["completed"] < 60:
            text_color = "red"
        elif data["completed"] < 90:
            text_color = "yellow"
        else:
            text_color = "green"

        # Agrega la fila con el color correspondiente
        table_rows.append(
            f""" \
    <tr>
      <td>{lang}</td>
      <td style="color: {text_color};">{data['completed']}%</td>
    </tr>"""
        )

    table_footer = """
  </tbody>
</table>
"""
    return table_header + "\n".join(table_rows) + table_footer


def update_readme(table, readme_path="README.md"):
    """Replaces table on readme"""
    with open(readme_path, "r") as f:
        content = f.read()

    # Reemplaza la sección entre las etiquetas
    updated_content = (
        content.split("<!-- TRANSLATION-TABLE-START -->")[0]
        + f"<!-- TRANSLATION-TABLE-START -->\n{table}\n<!-- TRANSLATION-TABLE-END -->"
        + content.split("<!-- TRANSLATION-TABLE-END -->")[1]
    )

    with open(readme_path, "w") as f:
        f.write(updated_content)


def get_translations():
    translations = {}

    translations_number = 0
    with open(TRANSLATIONS_PATH + "/en.json", "r", encoding="utf-8") as f:
        # translations number taken from english
        en = json.load(f)
        translations_number = len(en.keys())

    for translation_path in glob.glob(TRANSLATIONS_PATH + "/*.json"):
        translation = Path(translation_path)
        name = translation.stem
        with translation.open(encoding="utf-8") as f:
            js = json.load(f)
            percentage = min(
                int(len(js.keys()) / translations_number * 100), 100
            )  # extra keys are ignored
            translations[name] = {"completed": percentage}

    return dict(
        sorted(
            translations.items(), key=lambda item: item[1]["completed"], reverse=True
        )
    )


translations = get_translations()
table = generate_translation_table(translations)
update_readme(table)
