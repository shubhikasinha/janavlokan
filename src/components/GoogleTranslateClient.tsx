"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function GoogleTranslateClient() {
    const pathname = usePathname();

    useEffect(() => {
        const savedLang = typeof window !== "undefined" && localStorage.getItem("lang");
        const select = document.querySelector(".goog-te-combo") as HTMLSelectElement;
        if (select && savedLang) {
            select.value = savedLang;
            select.dispatchEvent(new Event("change"));
        }
    }, [pathname]); // Re-run on route change

    return null;
}
