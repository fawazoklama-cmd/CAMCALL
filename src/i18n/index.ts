import { en, type TranslationDict } from './en';
import { id } from './id';
import type { LanguageCode } from '../types/settings';

export const TRANSLATIONS: Record<LanguageCode, TranslationDict> = {
  en,
  id,
};

export function getTranslation(lang: LanguageCode): TranslationDict {
  return TRANSLATIONS[lang] || en;
}

export type { TranslationDict };
