'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import EditorToolbar from './EditorToolbar';

interface CollaborativeEditorProps {
    roomId: string;
    userName?: string;
    userColor?: string;
    placeholder?: string;
}

// Generate random color for cursor
const getRandomColor = () => {
    const colors = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
        '#ffeaa7', '#dfe6e9', '#fd79a8', '#6c5ce7',
        '#00b894', '#e17055', '#0984e3', '#00cec9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
    roomId,
    userName = 'Anonymous',
    userColor,
    placeholder = 'Start typing...',
}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState<{ name: string; color: string }[]>([]);

    // Create Y.Doc and provider
    const { ydoc, provider } = useMemo(() => {
        const doc = new Y.Doc();
        const prov = new WebrtcProvider(`janavlokan-report-${roomId}`, doc, {
            signaling: ['wss://signaling.yjs.dev'],
        });

        return { ydoc: doc, provider: prov };
    }, [roomId]);

    // Track connection status
    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        provider.on('synced', onConnect);
        provider.on('status', (event: { connected: boolean }) => {
            setIsConnected(event.connected);
        });

        // Track awareness (users)
        const awareness = provider.awareness;
        const updateUsers = () => {
            const users: { name: string; color: string }[] = [];
            awareness.getStates().forEach((state) => {
                if (state.user) {
                    users.push(state.user);
                }
            });
            setConnectedUsers(users);
        };

        awareness.on('change', updateUsers);
        updateUsers();

        return () => {
            provider.destroy();
            ydoc.destroy();
        };
    }, [provider, ydoc]);

    // Set current user in awareness
    useEffect(() => {
        provider.awareness.setLocalStateField('user', {
            name: userName,
            color: userColor || getRandomColor(),
        });
    }, [provider, userName, userColor]);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Collaboration.configure({
                document: ydoc,
            }),
            CollaborationCursor.configure({
                provider: provider,
                user: {
                    name: userName,
                    color: userColor || getRandomColor(),
                },
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
    });

    if (!editor) {
        return (
            <div className="border border-gray-200 rounded-lg bg-white h-[400px] animate-pulse flex items-center justify-center">
                <span className="text-gray-400">Loading collaborative editor...</span>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            {/* Connection Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-gray-500">
                        {isConnected ? 'Connected' : 'Connecting...'}
                    </span>
                </div>

                {/* Connected Users */}
                {connectedUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            {connectedUsers.length} user(s) online
                        </span>
                        <div className="flex -space-x-2">
                            {connectedUsers.slice(0, 5).map((user, idx) => (
                                <div
                                    key={idx}
                                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                                    style={{ backgroundColor: user.color }}
                                    title={user.name}
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            ))}
                            {connectedUsers.length > 5 && (
                                <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                                    +{connectedUsers.length - 5}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <EditorToolbar editor={editor} />

            {/* Editor Content */}
            <div className="relative">
                <EditorContent editor={editor} />
                {editor.isEmpty && (
                    <p className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                        {placeholder}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CollaborativeEditor;
