'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/Button';

interface FormData {
    name: string;
    email: string;
    organization: string;
    subject: string;
    message: string;
}

const timeline = [
    {
        year: 'Q1',
        title: 'Data Integration',
        description: 'Connected to PFMS and DBT transaction streams',
    },
    {
        year: 'Q2',
        title: 'Model Training',
        description: 'Trained unsupervised models on anonymized historical data',
    },
    {
        year: 'Q3',
        title: 'System Deployment',
        description: 'Live deployment with real-time monitoring enabled',
    },
    {
        year: 'Q4',
        title: 'Full Operations',
        description: 'Operational across multiple schemes and regions',
    },
];

const principles = [
    {
        title: 'Privacy First',
        description: 'No personally identifiable information enters the cloud. All sensitive identifiers are irreversibly hashed.',
    },
    {
        title: 'Transparency',
        description: 'Every flagged case comes with human-readable explanations for administrative review and audit defensibility.',
    },
    {
        title: 'Fairness',
        description: 'Advisory-only system that never blocks or delays welfare payments to genuine beneficiaries.',
    },
    {
        title: 'Human-in-the-Loop',
        description: 'Final decisions always rest with human administrators. AI provides intelligence, not verdicts.',
    },
    {
        title: 'Active Learning',
        description: 'Auditor feedback (Verify/Dismiss) is recorded and used to retrain ML models, continuously improving detection accuracy.',
    },
];

const contactInfo = [
    {
        title: 'Support Email',
        value: 'support@janavlokan.gov.in',
        description: 'For technical assistance',
    },
    {
        title: 'Helpdesk',
        value: 'Ministry of Electronics and IT',
        description: 'New Delhi, India',
    },
    {
        title: 'Phone',
        value: '+91-11-XXXX-XXXX',
        description: 'Mon-Fri, 9:30 AM - 5:30 PM IST',
    },
];

const faqs = [
    {
        q: 'Is JanAvlokan currently deployed?',
        a: 'JanAvlokan is currently a prototype developed as part of the Hack-4Viksit Bharat initiative. We are seeking partnerships for pilot deployments with state governments.',
    },
    {
        q: 'How does JanAvlokan protect beneficiary privacy?',
        a: 'All personally identifiable information is irreversibly hashed before processing. No PII enters our cloud infrastructure and all outputs are advisory-only with human decision-making.',
    },
    {
        q: 'Can JanAvlokan integrate with existing systems?',
        a: 'Yes, JanAvlokan is designed to work as an advisory layer over existing DBT/PFMS systems without requiring changes to payment infrastructure.',
    },
    {
        q: 'What schemes can JanAvlokan analyze?',
        a: 'The platform is scheme-agnostic and can be configured to analyze any welfare program that generates transactional data, including Pradhan Mantri Ujjwala Yojana, PM POSHAN, and more.',
    },
    {
        q: 'What types of fraud patterns does JanAvlokan detect?',
        a: 'JanAvlokan identifies five key fraud risk categories: Unusual Activity, Suspicious Locations, Scheme Overlaps, Beneficiary Clusters, and Repeat Withdrawals. Each category represents a different mode of potential fraud or system misuse.',
    },
    {
        q: 'Can I upload my own data for scanning?',
        a: 'Yes. The CSV Quick Scan feature lets you upload beneficiary transaction data in CSV format. The system validates the file, runs ML inference via the Vertex AI endpoint, and instantly returns per-row risk levels and flags.',
    },
    {
        q: 'How are audit reports generated?',
        a: 'JanAvlokan includes a full Report Builder with a collaborative rich-text editor. You can link flagged transactions as evidence, add findings with severity ratings, and export finalized reports to PDF or DOCX for official submission.',
    },
    {
        q: 'Does the system notify officials automatically?',
        a: 'Yes. Automated Email Alerts are sent to district-level officials via the Gmail API when high-risk anomalies are detected. Alerts include a risk summary, flagged beneficiary details, and direct links to the dashboard.',
    },
    {
        q: 'Does auditor feedback improve the AI?',
        a: 'Absolutely. The Audit Panel includes a feedback loop—officers can verify fraud or dismiss false positives. This feedback is stored and used to retrain models on Vertex AI, enabling Active Learning and continuously improving detection accuracy.',
    },
];

export default function AboutPage() {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        organization: '',
        subject: '',
        message: '',
    });

    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section - White */}
            <section className="bg-white py-12 md:py-16 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
                        About JanAvlokan
                    </h1>
                    <p className="text-lg text-gray-700 max-w-3xl">
                        An AI-powered decision-support platform enabling transparent, accountable,
                        and efficient welfare delivery across government schemes.
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="border-l-4 border-primary pl-6 mb-6">
                                <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                                    Our Mission
                                </h2>
                            </div>

                            <div className="prose prose-lg text-gray-700 space-y-4">
                                <p>
                                    Government welfare programs in India serve millions daily across food security,
                                    education, energy, and employment schemes. Due to the massive scale, diversity
                                    of schemes, and regional variations, traditional audit mechanisms struggle to
                                    monitor misuse in real time.
                                </p>
                                <p>
                                    Public finance studies and Comptroller and Auditor General (CAG) reports
                                    estimate that <strong>20-40% of subsidy value</strong> is lost to inefficiencies
                                    or leakage across large-scale schemes.
                                </p>
                                <p>
                                    JanAvlokan addresses this critical need for a <strong>scalable, privacy-preserving,
                                        and explainable intelligence system</strong> that can flag high-risk patterns early,
                                    assist administrators in prioritizing audits, and preserve fairness for genuine
                                    beneficiaries.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                            <h3 className="font-heading font-semibold text-gray-900 mb-4 text-lg border-b border-gray-200 pb-3">
                                Vision Statement
                            </h3>
                            <p className="text-gray-700">
                                To transform reactive audits into proactive governance intelligence,
                                strengthening transparency and public trust in India&apos;s welfare delivery system.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Principles */}
            <section className="py-12 md:py-16 bg-gray-50 border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Core Principles
                        </h2>
                        <p className="text-gray-600">Built on foundations of privacy, transparency, and ethical AI</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {principles.map((principle, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-5">
                                <div className="w-8 h-8 bg-primary text-white rounded flex items-center justify-center font-bold text-sm mb-3">
                                    {index + 1}
                                </div>
                                <h3 className="font-heading font-semibold text-gray-900 mb-2">{principle.title}</h3>
                                <p className="text-sm text-gray-600">{principle.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Schemes Currently Monitored */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Welfare Schemes Monitored
                        </h2>
                        <p className="text-gray-600">Current deployment covers major national welfare programs</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* PM POSHAN */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                <h3 className="text-xl font-heading font-bold text-gray-900">PM POSHAN</h3>
                                <p className="text-sm text-gray-600 mt-1">Mid-Day Meal Scheme</p>
                            </div>
                            <div className="p-6 space-y-3">
                                <div>
                                    <span className="font-medium text-gray-900">Official Name:</span>
                                    <p className="text-gray-600 text-sm">Pradhan Mantri Poshan Shakti Nirman (revamped 2021)</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">Coverage:</span>
                                    <p className="text-gray-600 text-sm">Children in Classes I–VIII in government & aided schools</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">Monitoring Focus:</span>
                                    <ul className="text-gray-600 text-sm list-disc list-inside mt-1 space-y-1">
                                        <li>Inflated beneficiary counts</li>
                                        <li>Duplicate student enrollments</li>
                                        <li>Ghost schools and fictitious claims</li>
                                        <li>Unusual meal distribution patterns</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* PMUY + PAHAL */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                <h3 className="text-xl font-heading font-bold text-gray-900">PMUY + PAHAL</h3>
                                <p className="text-sm text-gray-600 mt-1">LPG Subsidy Schemes</p>
                            </div>
                            <div className="p-6 space-y-3">
                                <div>
                                    <span className="font-medium text-gray-900">Official Names:</span>
                                    <p className="text-gray-600 text-sm">Pradhan Mantri Ujjwala Yojana (2016) & Direct Benefit Transfer for LPG (2014)</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">Coverage:</span>
                                    <p className="text-gray-600 text-sm">BPL/SECC households receiving LPG connections and subsidies</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-900">Monitoring Focus:</span>
                                    <ul className="text-gray-600 text-sm list-disc list-inside mt-1 space-y-1">
                                        <li>Duplicate LPG connections</li>
                                        <li>Fake beneficiary accounts</li>
                                        <li>Excessive refill frequency</li>
                                        <li>Shared bank account patterns</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h3 className="font-heading font-semibold text-gray-900 mb-3">System Capacity</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-heading font-bold text-primary">4.2 Cr</div>
                                <div className="text-sm text-gray-600">Beneficiaries Monitored</div>
                            </div>
                            <div>
                                <div className="text-2xl font-heading font-bold text-primary">12</div>
                                <div className="text-sm text-gray-600">Welfare Schemes</div>
                            </div>
                            <div>
                                <div className="text-2xl font-heading font-bold text-primary">28</div>
                                <div className="text-sm text-gray-600">States Covered</div>
                            </div>
                            <div>
                                <div className="text-2xl font-heading font-bold text-primary">100M+</div>
                                <div className="text-sm text-gray-600">Monthly Transactions</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Timeline */}
            <section className="py-12 md:py-16 bg-gray-50 border-y border-gray-200">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Implementation Phases
                        </h2>
                        <p className="text-gray-600">System deployment and operationalization</p>
                    </div>

                    <div className="space-y-4">
                        {timeline.map((item, index) => (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="w-16 h-10 bg-primary text-white rounded flex items-center justify-center font-bold text-sm flex-shrink-0">
                                    {item.year}
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex-1">
                                    <h3 className="font-heading font-semibold text-gray-900 mb-1">{item.title}</h3>
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-12 md:py-16 bg-gray-50 border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Support and Assistance
                        </h2>
                        <p className="text-gray-600">Need help using JanAvlokan? Our support team is here to assist you.</p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white border border-gray-200 rounded overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-xl font-heading font-bold text-gray-900">
                                        Submit a Support Request
                                    </h3>
                                </div>
                                <div className="p-6">
                                    {submitted ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-green-100 border border-green-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-green-700 text-2xl font-bold">OK</span>
                                            </div>
                                            <h3 className="text-lg font-heading font-semibold text-gray-900 mb-2">
                                                Message Sent Successfully
                                            </h3>
                                            <p className="text-gray-600 mb-6">
                                                Thank you for reaching out. We&apos;ll get back to you within 2-3 business days.
                                            </p>
                                            <Button onClick={() => setSubmitted(false)}>
                                                Send Another Message
                                            </Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Full Name <span className="text-red-600">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="name"
                                                        name="name"
                                                        required
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                                        placeholder="Your full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Email Address <span className="text-red-600">*</span>
                                                    </label>
                                                    <input
                                                        type="email"
                                                        id="email"
                                                        name="email"
                                                        required
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                                        placeholder="your.email@example.com"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Organization
                                                </label>
                                                <input
                                                    type="text"
                                                    id="organization"
                                                    name="organization"
                                                    value={formData.organization}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                                    placeholder="Your organization (optional)"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Subject <span className="text-red-600">*</span>
                                                </label>
                                                <select
                                                    id="subject"
                                                    name="subject"
                                                    required
                                                    value={formData.subject}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                                >
                                                    <option value="">-- Select a subject --</option>
                                                    <option value="general">General Inquiry</option>
                                                    <option value="demo">Request a Demo</option>
                                                    <option value="partnership">Partnership Opportunity</option>
                                                    <option value="technical">Technical Question</option>
                                                    <option value="feedback">Feedback</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Message <span className="text-red-600">*</span>
                                                </label>
                                                <textarea
                                                    id="message"
                                                    name="message"
                                                    required
                                                    rows={5}
                                                    value={formData.message}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                                                    placeholder="How can we help you?"
                                                />
                                            </div>

                                            <Button type="submit" className="w-full md:w-auto">
                                                Submit Message
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-4">
                            {contactInfo.map((info, index) => (
                                <div key={index} className="bg-white border border-gray-200 rounded overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <span className="font-heading font-semibold text-gray-900">{info.title}</span>
                                    </div>
                                    <div className="p-4">
                                        <p className="font-medium text-gray-900">{info.value}</p>
                                        <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Government Links */}
                            <div className="bg-primary text-white rounded overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/20">
                                    <span className="font-heading font-semibold">Important Links</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    <a href="https://india.gov.in" target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-white text-sm">
                                        National Portal of India
                                    </a>
                                    <a href="https://digitalindia.gov.in" target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-white text-sm">
                                        Digital India
                                    </a>
                                    <a href="https://meity.gov.in" target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-white text-sm">
                                        Ministry of Electronics and IT
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="border border-gray-200 rounded overflow-hidden bg-white">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                                    <span className="w-6 h-6 bg-primary text-white rounded text-sm flex items-center justify-center font-bold">
                                        {index + 1}
                                    </span>
                                    <h3 className="font-heading font-semibold text-gray-900">{faq.q}</h3>
                                </div>
                                <div className="p-4">
                                    <p className="text-gray-600">{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Get Started Section - White */}
            <section className="py-12 md:py-16 bg-gray-50 border-t border-gray-200">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="flex justify-center gap-2 mb-6">
                        <span className="w-5 h-5 rounded-full bg-govt-saffron"></span>
                        <span className="w-5 h-5 rounded-full bg-gray-300"></span>
                        <span className="w-5 h-5 rounded-full bg-govt-green"></span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-4">
                        Ready to Get Started?
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-3xl mx-auto">
                        Access the dashboard to view real-time risk assessments, explore flagged cases,
                        and generate audit reports for your schemes and jurisdiction.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button href="/dashboard">
                            Open Dashboard
                        </Button>
                        <Button variant="secondary" href="/technology">
                            System Documentation
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
