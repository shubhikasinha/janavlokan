'use client';

import React, { useState, useEffect } from 'react';

interface Recipient {
    id: number;
    name: string;
    email: string;
    district: string;
}

interface EmailStatus {
    [key: number]: 'pending' | 'sending' | 'sent' | 'failed';
}

export default function MailAlertsPage() {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [emailStatus, setEmailStatus] = useState<EmailStatus>({});
    const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
    const [emailPreview, setEmailPreview] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sendingAll, setSendingAll] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');


    useEffect(() => {
        fetchRecipients();
    }, []);

    const fetchRecipients = async () => {
        try {
            const response = await fetch('/api/mail/send-alerts');
            const data = await response.json();
            if (data.success) {
                setRecipients(data.recipients);

                const initialStatus: EmailStatus = {};
                data.recipients.forEach((r: Recipient) => {
                    initialStatus[r.id] = 'pending';
                });
                setEmailStatus(initialStatus);
            }
        } catch (error) {
            console.error('Error fetching recipients:', error);
            setErrorMessage('Failed to load recipients');
        } finally {
            setLoading(false);
        }
    };

    const sendEmail = async (recipient: Recipient, showPreviewModal: boolean = true) => {
        setEmailStatus(prev => ({ ...prev, [recipient.id]: 'sending' }));
        setErrorMessage('');

        try {
            const response = await fetch('/api/mail/send-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: recipient.id,
                    recipientEmail: recipient.email,
                    recipientName: recipient.name,
                    district: recipient.district
                })
            });

            const data = await response.json();

            if (data.success) {
                setEmailStatus(prev => ({ ...prev, [recipient.id]: 'sent' }));
                if (showPreviewModal) {
                    setSelectedRecipient(recipient);
                    setEmailPreview(data.emailPreview);
                    setShowPreview(true);
                }
            } else {
                setEmailStatus(prev => ({ ...prev, [recipient.id]: 'failed' }));
                setErrorMessage(data.error || 'Failed to send email');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            setEmailStatus(prev => ({ ...prev, [recipient.id]: 'failed' }));
            setErrorMessage('Network error - failed to send email');
        }
    };

    const sendAllEmails = async () => {
        setSendingAll(true);
        for (const recipient of recipients) {
            if (emailStatus[recipient.id] !== 'sent') {
                await sendEmail(recipient, false);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        setSendingAll(false);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-gray-100 text-gray-600',
            sending: 'bg-yellow-100 text-yellow-700',
            sent: 'bg-green-100 text-green-700',
            failed: 'bg-red-100 text-red-700'
        };
        const labels: Record<string, string> = {
            pending: 'Pending',
            sending: 'Sending...',
            sent: 'Sent ✓',
            failed: 'Failed ✗'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-lightest flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading recipients...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-lightest py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Mail Alerts</h1>
                    <p className="text-gray-600">
                        Send fraud alert notifications to District Welfare Officers. Each email contains
                        the top 10 high-risk fraud cases detected in their respective districts.
                    </p>
                </div>



                {/* Error Banner */}
                {errorMessage && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-red-700">{errorMessage}</span>
                        </div>
                        <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Total Recipients</p>
                        <p className="text-2xl font-bold text-primary">{recipients.length}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Pending</p>
                        <p className="text-2xl font-bold text-gray-600">
                            {Object.values(emailStatus).filter(s => s === 'pending').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Sent</p>
                        <p className="text-2xl font-bold text-green-600">
                            {Object.values(emailStatus).filter(s => s === 'sent').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                            {Object.values(emailStatus).filter(s => s === 'failed').length}
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={sendAllEmails}
                        disabled={sendingAll}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sendingAll ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Sending All...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Send All Alerts
                            </>
                        )}
                    </button>
                </div>

                {/* Recipients Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-primary text-white">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">S.No</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">District</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {recipients.map((recipient, index) => (
                                    <tr key={recipient.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{recipient.name}</p>
                                            <p className="text-xs text-gray-500">District Welfare Officer</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{recipient.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                                {recipient.district}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(emailStatus[recipient.id])}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => sendEmail(recipient)}
                                                disabled={emailStatus[recipient.id] === 'sending'}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {emailStatus[recipient.id] === 'sending' ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Sending
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        Send Mail
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-900">About Mail Alerts</p>
                            <p className="text-sm text-blue-700 mt-1">
                                Each alert email contains a formal government-styled message with the top 10
                                high-risk fraud cases detected in the officer&apos;s district. The email includes
                                beneficiary IDs, risk scores, alert types, and recommended actions for investigation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Preview Modal */}
            {showPreview && selectedRecipient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                        <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Email Sent Successfully</h3>
                                <p className="text-sm text-white/80">To: {selectedRecipient.email}</p>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                {emailPreview}
                            </pre>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="btn-primary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
