'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false to prevent hydration mismatch from Dialogflow iframe
const ChatWidget = dynamic(() => import('./ChatWidget'), {
  ssr: false,
});

export default function ChatWidgetWrapper() {
  return <ChatWidget />;
}
