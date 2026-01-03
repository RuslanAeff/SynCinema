/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - i18n Context
 *  Provides internationalization state globally to avoid prop drilling
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    Language,
    Translations,
    LANGUAGES,
    LanguageInfo,
    getTranslation,
    getSavedLanguage,
    saveLanguage as saveLangToStorage
} from '../i18n';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
    languages: LanguageInfo[];
    currentLanguageInfo: LanguageInfo;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize with saved language or detector
    const [language, setLanguageState] = useState<Language>(() => getSavedLanguage());
    const [t, setT] = useState<Translations>(() => getTranslation(getSavedLanguage()));

    // When language changes, update state, storage and document
    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        setT(getTranslation(lang));
        saveLangToStorage(lang);
        document.documentElement.lang = lang;
    }, []);

    // Initial setup
    useEffect(() => {
        const initialLang = getSavedLanguage();
        if (document.documentElement.lang !== initialLang) {
            document.documentElement.lang = initialLang;
        }
    }, []);

    const currentLanguageInfo = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    const value = {
        language,
        setLanguage,
        t,
        languages: LANGUAGES,
        currentLanguageInfo,
    };

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};

// Custom Hook to use the context
export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}
