/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - i18n Index
 *  @author Ruslan Aliyev
 *  Export all translations and utilities
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from './types';
export { en } from './en';
export { tr } from './tr';
export { az } from './az';
export { ru } from './ru';

import { Language, Translations, LANGUAGES } from './types';
import { en } from './en';
import { tr } from './tr';
import { az } from './az';
import { ru } from './ru';

// All translations map
export const translations: Record<Language, Translations> = {
    en,
    tr,
    az,
    ru,
};

// Get translation for a specific language
export function getTranslation(lang: Language): Translations {
    return translations[lang] || translations.en;
}

// Detect browser language and return best match
export function detectLanguage(): Language {
    const browserLang = navigator.language.toLowerCase();

    // Direct matches
    if (browserLang.startsWith('tr')) return 'tr';
    if (browserLang.startsWith('az')) return 'az';
    if (browserLang.startsWith('ru')) return 'ru';

    // Default to English
    return 'en';
}

// Get saved language from localStorage or detect
export function getSavedLanguage(): Language {
    const saved = localStorage.getItem('syncinema_language') as Language;
    if (saved && LANGUAGES.some(l => l.code === saved)) {
        return saved;
    }
    return detectLanguage();
}

// Save language to localStorage
export function saveLanguage(lang: Language): void {
    localStorage.setItem('syncinema_language', lang);
}
