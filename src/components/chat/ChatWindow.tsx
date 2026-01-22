'use client';

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';

interface Message {
    id: string;
    body: string;
    fromMe: boolean;
    timestamp: string;
}

export function ChatWindow({ chatId }: { chatId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!isSending) {
            fetchMessages();
        }
        const interval = setInterval(() => {
            if (!isSending) fetchMessages();
        }, 3000);
        return () => clearInterval(interval);
    }, [chatId, isSending]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function fetchMessages() {
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        const tempId = `temp-${Date.now()}`;
        const tempMsg = {
            id: tempId,
            body: newMessage,
            fromMe: true,
            timestamp: new Date().toISOString()
        };

        // Optimistic update
        setMessages(prev => [...prev, tempMsg]);
        const currentMessage = newMessage;
        setNewMessage('');

        try {
            const res = await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: currentMessage })
            });

            if (!res.ok) throw new Error('Failed to send');

            // Wait a bit for worker to save it
            setTimeout(() => {
                setIsSending(false);
                fetchMessages();
            }, 2000);
        } catch (e) {
            console.error('Failed to send', e);
            setIsSending(false);
            // Optional: remove temp message on error
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative">
            {/* Chat Header */}
            <header className="h-[60px] bg-[#202c33] px-4 py-2 flex items-center justify-between z-10 border-b border-[#222d34]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#374248] flex items-center justify-center text-white">
                        #
                    </div>
                    <div>
                        <h2 className="text-[#e9edef] font-medium">Chat {chatId.slice(0, 4)}...</h2>
                        <p className="text-xs text-[#8696a0]">en línea</p>
                    </div>
                </div>
                <div className="flex gap-4 text-[#aebac1]">
                    <button>🔍</button>
                    <button>⋮</button>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 z-10 flex flex-col gap-1">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`max-w-[65%] rounded-lg p-2 text-sm relative shadow-sm ${msg.fromMe
                            ? 'bg-[#005c4b] self-end rounded-tr-none'
                            : 'bg-[#202c33] self-start rounded-tl-none'
                            }`}
                    >
                        <div className="text-[#e9edef] break-words pr-2">
                            {msg.body}
                        </div>
                        <div className={`text-[10px] text-right mt-1 ${msg.fromMe ? 'text-[#8696a0]' : 'text-[#8696a0]'}`}>
                            {format(new Date(msg.timestamp), 'HH:mm')}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <footer className="bg-[#202c33] px-4 py-3 z-10">
                <form onSubmit={sendMessage} className="flex gap-2 items-end">
                    <button type="button" className="text-[#8696a0] p-2 hover:text-[#aebac1]">
                        ➕
                    </button>
                    <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Escribe un mensaje"
                            className="w-full bg-transparent border-none outline-none text-[#d1d7db]"
                        />
                    </div>
                    <button
                        type="submit"
                        className="p-2 rounded-full text-[#8696a0] hover:text-[#aebac1]"
                        disabled={!newMessage.trim()}
                    >
                        ➤
                    </button>
                </form>
            </footer>
        </div>
    );
}
