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

export default function ContactPage() {
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

    const contactInfo = [
        {
            title: 'Support Email',
            value: 'support@janavlokan.gov.in',
            description: 'For technical assistance',
        },
        {
            title: 'Helpdesk',
            value: 'Ministry of Electronics & IT',
            description: 'New Delhi, India',
        },
        {
            title: 'Phone',
            value: '+91-11-XXXX-XXXX',
            description: 'Mon-Fri, 9:30 AM - 5:30 PM IST',
        },
    ];

    return (
        <div className="min-h-screen">
            {/* Hero Section - White */}
            <section className="bg-white py-12 md:py-16 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
                        Support & Assistance
                    </h1>
                    <p className="text-lg text-gray-700 max-w-3xl">
                        Need help using JanAvlokan? Have questions about flagged cases or reports?
                        Our support team is here to assist you.
                    </p>
                </div>
            </section>

            {/* Contact Content */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white border border-gray-200 rounded overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-xl font-heading font-bold text-gray-900">
                                        Submit a Support Request
                                    </h2>
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
                                        → National Portal of India
                                    </a>
                                    <a href="https://digitalindia.gov.in" target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-white text-sm">
                                        → Digital India
                                    </a>
                                    <a href="https://meity.gov.in" target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-white text-sm">
                                        → Ministry of Electronics &amp; IT
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-12 md:py-16 bg-gray-50 border-t border-gray-200">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {[
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
                                a: 'The platform is scheme-agnostic and can be configured to analyze any welfare program that generates transactional data, including PM-KISAN, MGNREGA, PDS, Ujjwala, and more.',
                            },
                        ].map((faq, index) => (
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
        </div>
    );
}
