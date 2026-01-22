'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { LogOut } from 'lucide-react';

interface Chat {
    id: string;
    name: string | null;
    phoneNumber: string;
    lastMessageAt: string;
    unreadCount: number;
}

export function Sidebar({ onSelectChat, selectedChatId }: { onSelectChat: (id: string) => void, selectedChatId?: string }) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Initial fetch
        fetchChats();

        // Poll for updates (in a real app, use SWR or React Query)
        const interval = setInterval(fetchChats, 5000);
        return () => clearInterval(interval);
    }, []);

    async function fetchChats() {
        try {
            const res = await fetch('/api/chats');
            if (res.ok) {
                const data = await res.json();
                setChats(data);
                setIsConnected(true);
            }
        } catch (e) {
            setIsConnected(false);
        }
    }

    return (
        <aside className="w-80 h-full border-r border-[#222d34] flex flex-col bg-[#111b21]">
            <header className="h-[60px] bg-[#202c33] flex items-center justify-between px-4 py-2 border-b border-[#222d34]">
                <div className="flex items-center gap-3">
                    {/* User Avatar Placeholder */}
                    <div className="w-10 h-10 rounded-full bg-[#374248] overflow-hidden">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-[#cfd7dc] mt-2">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                </div>
                <div className="flex gap-4 text-[#aebac1]">
                    <button title="Status"><div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} /></button>
                    <button title="New Chat">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    <button title="Menu">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </button>
                </div>
            </header>

            {/* Search */}
            <div className="p-2 border-b border-[#222d34]">
                <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-1.5">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#8696a0" strokeWidth="2" fill="none" className="mr-3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                        type="text"
                        placeholder="Busca un chat o inicia uno nuevo."
                        className="bg-transparent border-none outline-none text-[#d1d7db] text-sm w-full placeholder-[#8696a0]"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {chats.map(chat => (
                    <div
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#202c33] transition-colors border-b border-[#222d34] ${selectedChatId === chat.id ? 'bg-[#2a3942]' : ''}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-[#374248] flex-shrink-0 flex items-center justify-center text-white font-medium text-lg">
                            {chat.name ? chat.name[0].toUpperCase() : '#'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className="text-[#e9edef] font-medium text-base truncate pr-2">
                                    {chat.name || chat.phoneNumber}
                                </h3>
                                <span className="text-xs text-[#8696a0] flex-shrink-0">
                                    {format(new Date(chat.lastMessageAt), 'HH:mm')}
                                </span>
                            </div>
                            <p className="text-[#8696a0] text-sm truncate">
                                {/* Last message preview would go here */}
                                {chat.phoneNumber}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
