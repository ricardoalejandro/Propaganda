'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { QRScanner } from '@/components/auth/QRScanner';

export default function Home() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  return (
    <main className="flex h-screen bg-[#111b21] overflow-hidden">
      <Sidebar
        onSelectChat={setSelectedChatId}
        selectedChatId={selectedChatId || undefined}
      />

      {selectedChatId ? (
        <ChatWindow chatId={selectedChatId} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35] border-b-[6px] border-[#00a884] relative">

          <QRScanner />

          <div className="text-[#e9edef] text-center max-w-md mt-8 opacity-50">
            <h1 className="text-3xl font-light mb-4 text-[#e9edef]">Propaganda WhatsApp</h1>
            <p className="text-[#8696a0] text-sm">
              Envía y recibe mensajes sin mantener tu teléfono conectado.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
