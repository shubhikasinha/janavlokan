'use client';

import React from 'react';
import Link from 'next/link';
import BulkIngestWizard from '@/components/BulkIngestWizard';

export default function DataIngestionPage() {
    return (
        <main className="min-h-screen bg-neutral-lightest">
            {/* Header Section */}
            <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <nav className="text-sm text-accent-light mb-2">
                        <Link href="/" className="hover:underline">Home</Link>
                        <span className="mx-2">/</span>
                        <span>Data Ingestion</span>
                    </nav>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">
                        Bulk Data Ingestion
                    </h1>
                    <p className="text-accent-light text-lg max-w-2xl">
                        Upload CSV files to ingest large datasets directly into BigQuery for analysis.
                        Supports LPG transactions, Mid-Day Meal records, and audit trail data.
                    </p>
                </div>
            </section>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <BulkIngestWizard />
            </div>
        </main>
    );
}
