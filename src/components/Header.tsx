'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import { useScheme, SchemeType } from '@/context/SchemeContext';

/* ---------------- Types ---------------- */

type NavLink = {
    path: string;
    label: string;
};

/* ---------------- Data ---------------- */

const navLinks: NavLink[] = [
    { path: '/', label: 'Home' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/features', label: 'Features' },
    { path: '/about', label: 'About' },
    { path: '/technology', label: 'Technology' },
    { path: '/contact', label: 'Contact' },
];

/* ---------------- Scheme Switcher Component ---------------- */

const SchemeSwitcher: React.FC = () => {
    const { currentScheme, setScheme, schemeConfig } = useScheme();
    const [isOpen, setIsOpen] = useState(false);

    const schemes: { type: SchemeType; label: string; icon: string; description: string }[] = [
        { type: 'LPG', label: 'LPG Subsidy', icon: 'LPG', description: 'LPG Beneficiary Analysis' },
        { type: 'MDM', label: 'Mid Day Meal', icon: 'MDM', description: 'School Meal Analysis' },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
            >
                <span className="text-lg">{schemeConfig.icon}</span>
                <span className="text-sm font-medium text-primary hidden sm:inline">
                    {schemeConfig.name}
                </span>
                <svg
                    className={`w-4 h-4 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Select Scheme
                            </p>
                        </div>
                        {schemes.map((scheme) => (
                            <button
                                key={scheme.type}
                                onClick={() => {
                                    setScheme(scheme.type);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                                    currentScheme === scheme.type ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                                }`}
                            >
                                <span className="text-2xl">{scheme.icon}</span>
                                <div>
                                    <p className={`text-sm font-medium ${
                                        currentScheme === scheme.type ? 'text-primary' : 'text-gray-900'
                                    }`}>
                                        {scheme.label}
                                    </p>
                                    <p className="text-xs text-gray-500">{scheme.description}</p>
                                </div>
                                {currentScheme === scheme.type && (
                                    <svg className="w-5 h-5 text-primary ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/* ---------------- Component ---------------- */

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const pathname = usePathname();
    const { schemeConfig } = useScheme();

    return (
        <header className="sticky top-0 z-50">
            {/* Government Top Bar */}
            <div className="bg-primary text-white text-xs py-2 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">भारत सरकार |</span>
                        <span>Government of India</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                        <span className="hidden md:inline">
                            <span className="notranslate">JanAvlokan</span> | {schemeConfig.fullName}
                        </span>
                        <span className="md:hidden">
                            {schemeConfig.icon} {schemeConfig.name}
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
                            <img
                                src="/logojan.jpeg"
                                alt="JanAvlokan Logo"
                                className="h-10 w-auto"
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

                        {/* Scheme Switcher, Language Switcher & Mobile Menu */}
                        <div className="flex items-center gap-3">
                            {/* Scheme Switcher */}
                            <SchemeSwitcher />

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
