/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - useI18n Hook
 *  @author Ruslan Aliyev
 *  React hook for internationalization
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Language,
    Translations,
    LANGUAGES,
    LanguageInfo,
    getTranslation,
    getSavedLanguage,
    saveLanguage
} from '../i18n';

interface UseI18nReturn {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
    languages: LanguageInfo[];
    currentLanguageInfo: LanguageInfo;
}

export function useI18n(): UseI18nReturn {
    const [language, setLanguageState] = useState<Language>(() => getSavedLanguage());
    const [t, setT] = useState<Translations>(() => getTranslation(getSavedLanguage()));

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        setT(getTranslation(lang));
        saveLanguage(lang);

        // Update document language attribute
        document.documentElement.lang = lang;
    }, []);

    // Initialize on mount
    useEffect(() => {
        const savedLang = getSavedLanguage();
        setLanguageState(savedLang);
        setT(getTranslation(savedLang));
        document.documentElement.lang = savedLang;
    }, []);

    const currentLanguageInfo = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    return {
        language,
        setLanguage,
        t,
        languages: LANGUAGES,
        currentLanguageInfo,
    };
}
