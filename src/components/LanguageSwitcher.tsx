"use client";
import React, { useEffect, useState } from "react";

const languages = [
    { code: "en", label: "A" },    // English
    { code: "hi", label: "अ" },    // Hindi
    { code: "pa", label: "ਮ" },    // Punjabi
];

const LanguageSwitcher: React.FC = () => {
    const [active, setActive] = useState("en");

    // After hydration, update based on localStorage
    // Using a microtask to avoid synchronous setState in effect
    useEffect(() => {
        const saved = localStorage.getItem("lang");
        if (saved && saved !== active) {
            queueMicrotask(() => setActive(saved));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const changeLanguage = (lang: string) => {
        const select = document.querySelector(".goog-te-combo") as HTMLSelectElement;
        if (select) {
            select.value = lang;
            select.dispatchEvent(new Event("change"));
        }
        setActive(lang);
        localStorage.setItem("lang", lang);
    };

    return (
        <div className="notranslate flex items-center gap-1 bg-neutral-light px-2 py-1 rounded-full shadow-sm border border-primary/20" role="group" aria-label="Language selector">
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    aria-label={`Change language to ${lang.code === 'en' ? 'English' : lang.code === 'hi' ? 'Hindi' : 'Punjabi'}`}
                    aria-pressed={active === lang.code}
                    className={`notranslate px-2 py-0.5 rounded-full text-sm font-semibold transition-all
            ${active === lang.code
                            ? "bg-white text-primary shadow"
                            : "text-gray-500 hover:text-primary"
                        }
          `}
                >
                    <span className="notranslate">{lang.label}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
