'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';

/* ---------------- Types ---------------- */

type NavLink = {
    path: string;
    label: string;
};

/* ---------------- Data ---------------- */

// Updated navigation with separate analytics pages
const navLinks: NavLink[] = [
    { path: '/', label: 'Home' },
    { path: '/geographic-analysis', label: 'Geography' },
    { path: '/risk-distribution', label: 'Exposure' },
    { path: '/temporal-trends', label: 'Trends' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/technology', label: 'Technology' },
    { path: '/about', label: 'About' },
];

/* ---------------- Component ---------------- */

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-[9999]">
            {/* Government Top Bar */}
            <div className="bg-primary text-white text-xs py-2 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">भारत सरकार |</span>
                        <span>Government of India</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                        <span className="hidden md:inline">
                            <span className="notranslate">JanAvlokan</span> | Welfare Intelligence Platform
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-govt-saffron" />
                            <span className="w-3 h-3 rounded-full bg-white" />
                            <span className="w-3 h-3 rounded-full bg-govt-green" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3">
                            <Image
                                src="/logojan.jpeg"
                                alt="JanAvlokan Logo"
                                width={40}
                                height={40}
                                className="w-auto"
                            />
                            <div className="flex flex-col">
                                <span className="notranslate text-xl font-heading font-bold text-gray-800">
                                    JanAvlokan
                                </span>
                                <span className="notranslate text-xs text-gray-500 -mt-1 hidden sm:block">
                                    जनावलोकन
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center bg-gray-100 rounded-full p-1">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.path;

                                return (
                                    <Link
                                        key={link.path}
                                        href={link.path}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Language Switcher & Mobile Menu */}
                        <div className="flex items-center gap-3">
                            {/* Language Switcher */}
                            <LanguageSwitcher />

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                aria-label="Toggle menu"
                            >
                                <svg
                                    className="w-6 h-6 text-gray-700"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {isMenuOpen ? (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    ) : (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    {isMenuOpen && (
                        <div className="md:hidden py-4 border-t border-gray-200">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.path;

                                return (
                                    <Link
                                        key={link.path}
                                        href={link.path}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-primary text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Header;
