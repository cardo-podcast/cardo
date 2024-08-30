import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/api/fs';


i18n
  .use(initReactI18next)
  .init({
        fallbackLng: 'en'
  })


export async function changeLanguage(lang: string) {
  const translationsFile = await resolveResource(`_up_/resources/translations/${lang}.json`); // why _up_ ?


  i18n.addResourceBundle(lang, 'translation', JSON.parse(await readTextFile(translationsFile)) )

  i18n.changeLanguage(lang)
} 