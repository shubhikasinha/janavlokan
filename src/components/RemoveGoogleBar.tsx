"use client";
import { useEffect } from "react";

export default function RemoveGoogleBar() {
    useEffect(() => {
        const interval = setInterval(() => {
            const iframe = document.querySelector("iframe.goog-te-banner-frame");
            const skip = document.querySelector(".skiptranslate");
            if (iframe) iframe.remove();
            if (skip) skip.remove();
            document.body.style.top = "0px";
        }, 200);
        return () => clearInterval(interval);
    }, []);

    return null;
}
