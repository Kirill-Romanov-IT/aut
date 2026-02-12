"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, translations } from '@/lib/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('ru');
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedLanguage = localStorage.getItem('app-language') as Language;
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ru')) {
            setLanguageState(savedLanguage);
        }
        setIsHydrated(true);
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-language', lang);
    };

    const t = (key: keyof typeof translations['en']): string => {
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
