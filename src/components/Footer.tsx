import Link from 'next/link';
import Image from 'next/image';

/* ---------------- Types ---------------- */

type FooterLink = {
    path: string;
    label: string;
    external?: boolean;
};

type FooterLinks = {
    platform: FooterLink[];
    resources: FooterLink[];
    government: FooterLink[];
};

/* ---------------- Data ---------------- */

const footerLinks: FooterLinks = {
    platform: [
        { path: '/about', label: 'About JanAvlokan' },
        { path: '/technology', label: 'Technology Stack' },
        { path: '/dashboard', label: 'Risk Dashboard' },
    ],
    resources: [
        { path: '/about#contact', label: 'Contact Us' },
        { path: '/technology', label: 'Documentation' },
        { path: '/technology#api', label: 'API Reference' },
        { path: '/about#faq', label: 'FAQs' },
    ],
    government: [
        { path: 'https://india.gov.in', label: 'India.gov.in', external: true },
        { path: 'https://digitalindia.gov.in', label: 'Digital India', external: true },
        { path: 'https://meity.gov.in', label: 'MeitY', external: true },
    ],
};

/* ---------------- Component ---------------- */

const Footer = () => {
    return (
        <footer className="bg-primary text-white">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Image
                                src="/logojan.jpeg"
                                alt="JanAvlokan Logo"
                                width={48}
                                height={48}
                                className="bg-white rounded p-1"
                            />
                            <div className="flex flex-col">
                                <span className="notranslate text-xl font-heading font-bold">
                                    JanAvlokan
                                </span>
                                <span className="notranslate text-xs text-white/70">
                                    जनावलोकन
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-white/80 mb-4 leading-relaxed">
                            AI-Powered Subsidy Intelligence Platform for Transparent Welfare Delivery.
                            Ministry of Electronics & Information Technology.
                        </p>

                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-govt-saffron" />
                            <span className="w-4 h-4 rounded-full bg-white" />
                            <span className="w-4 h-4 rounded-full bg-govt-green" />
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="font-heading font-semibold text-lg mb-4">
                            Platform
                        </h3>
                        <ul className="space-y-2">
                            {footerLinks.platform.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        href={link.path}
                                        className="text-sm text-white/80 hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h3 className="font-heading font-semibold text-lg mb-4">
                            Resources
                        </h3>
                        <ul className="space-y-2">
                            {footerLinks.resources.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.path}
                                        className="text-sm text-white/80 hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Government Links */}
                    <div>
                        <h3 className="font-heading font-semibold text-lg mb-4">
                            Government
                        </h3>
                        <ul className="space-y-2">
                            {footerLinks.government.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-white/80 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        {link.label}
                                        <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                        </svg>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Disclaimer Bar */}
            <div className="bg-primary border-t border-white/20">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2 text-amber-200">
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <span>
                                This system is advisory-only. It does not approve,
                                deny, or block subsidies.
                            </span>
                        </div>

                        <div className="text-white/60">
                            © {new Date().getFullYear()} <span className="notranslate">JanAvlokan</span> | Ministry of Electronics &amp; IT
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
