'use client';

import { use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ReportBuilder = dynamic(() => import('@/components/reports/ReportBuilder'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-96">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report builder...</p>
            </div>
        </div>
    ),
});

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ReportEditPage({ params }: PageProps) {
    const { id } = use(params);

    return (
        <main className="min-h-screen bg-neutral-lightest">
            {/* Header */}
            <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-6">
                <div className="max-w-7xl mx-auto px-4">
                    <nav className="text-sm text-accent-light mb-2">
                        <Link href="/" className="hover:underline">Home</Link>
                        <span className="mx-2">/</span>
                        <Link href="/reports" className="hover:underline">Reports</Link>
                        <span className="mx-2">/</span>
                        <span>Edit Report</span>
                    </nav>
                    <h1 className="text-2xl font-heading font-bold">
                        Audit Report Builder
                    </h1>
                </div>
            </section>

            {/* Report Builder */}
            <ReportBuilder reportId={id} />
        </main>
    );
}
