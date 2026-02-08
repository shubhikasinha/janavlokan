'use client';

import React, { useState } from 'react';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {/* Chat Window */}
            <div
                className={`transition-all duration-300 origin-bottom-right transform ${isOpen
                        ? 'scale-100 opacity-100 translate-y-0'
                        : 'scale-90 opacity-0 translate-y-4 pointer-events-none'
                    }`}
            >
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 w-[350px]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary to-primary-light p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-heading font-semibold text-sm">JanAvlokan Assistant</h3>
                                <p className="text-white/80 text-xs">Always here to help</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Iframe Content */}
                    <div className="bg-neutral-lightest h-[430px]">
                        <iframe
                            role="dialog"
                            height="430"
                            width="350"
                            src="https://bot.dialogflow.com/2a0d8900-9c31-421b-9f87-8d4ddd686568"
                            className="border-none w-full h-full"
                        ></iframe>
                    </div>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 ${isOpen
                        ? 'bg-gray-700 hover:bg-gray-800 rotate-90'
                        : 'bg-primary hover:bg-primary-dark rotate-0'
                    }`}
                aria-label="Toggle chat"
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
