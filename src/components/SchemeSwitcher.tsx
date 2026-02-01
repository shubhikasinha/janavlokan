'use client';

import { useScheme } from '@/context/SchemeContext';

type SchemeType = 'LPG' | 'MDM';

const schemes: { type: SchemeType; name: string }[] = [
    { type: 'LPG', name: 'LPG Subsidy' },
    { type: 'MDM', name: 'Mid Day Meal' },
];

interface SchemeSwitcherProps {
    className?: string;
}

const SchemeSwitcher: React.FC<SchemeSwitcherProps> = ({ className = "" }) => {
    const { currentScheme, setScheme } = useScheme();

    return (
        <div className={`flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-full ${className}`} role="group" aria-label="Scheme selector">
            {schemes.map((scheme) => {
                const isActive = currentScheme === scheme.type;

                return (
                    <button
                        key={scheme.type}
                        onClick={() => setScheme(scheme.type)}
                        aria-label={`Switch to ${scheme.name} scheme`}
                        aria-pressed={isActive}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                    >
                        <span className="whitespace-nowrap">{scheme.name}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default SchemeSwitcher;
