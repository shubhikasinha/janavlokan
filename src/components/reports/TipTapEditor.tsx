'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import EditorToolbar from './EditorToolbar';

interface TipTapEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    placeholder?: string;
    editable?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
    content = '',
    onChange,
    placeholder = 'Start writing your audit report...',
    editable = true
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
        ],
        content,
        editable,
        immediatelyRender: false, // Fix SSR hydration mismatch
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(JSON.stringify(editor.getJSON()));
            }
        },
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
    });

    return (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <EditorToolbar editor={editor} />
            <div className="relative">
                <EditorContent editor={editor} />
                {editor?.isEmpty && (
                    <p className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                        {placeholder}
                    </p>
                )}
            </div>
        </div>
    );
};

export default TipTapEditor;
