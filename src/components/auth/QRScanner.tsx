'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function QRScanner() {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('CHECKING');
    const [showScanner, setShowScanner] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/auth/status');
                const data = await res.json();

                setStatus(data.status);

                if (data.qr) {
                    setQrCode(data.qr);
                }

                // If connected, hide the scanner permanently (don't reload page)
                if (data.status === 'READY' || data.status === 'AUTHENTICATED') {
                    setShowScanner(false);
                }
            } catch (e) {
                console.error('Error checking status', e);
            }
        };

        // Only poll if we're still showing the scanner
        if (showScanner) {
            const interval = setInterval(checkStatus, 3000);
            checkStatus();
            return () => clearInterval(interval);
        }
    }, [showScanner]);

    // Don't render if connected or explicitly hidden
    if (!showScanner || status === 'READY' || status === 'AUTHENTICATED') {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-2xl max-w-sm mx-auto">
            <h2 className="text-2xl font-light text-gray-800 mb-2">Vincula tu dispositivo</h2>
            <p className="text-center text-gray-500 text-sm mb-6">
                Abre WhatsApp en tu teléfono {'>'} Configuración {'>'} Dispositivos vinculados {'>'} Vincular
            </p>

            <div className="relative w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {qrCode ? (
                    <Image
                        src={qrCode}
                        alt="Scan QR"
                        width={256}
                        height={256}
                        className="w-full h-full"
                        unoptimized
                    />
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-[#00a884] rounded-full animate-spin"></div>
                        <span className="text-xs text-gray-400">Generando QR...</span>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
                <span>🔒</span>
                <span>Cifrado de extremo a extremo</span>
            </div>
        </div>
    );
}
