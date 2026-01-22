import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const status = await redis.get('whatsapp:status') || 'DISCONNECTED';
        const qr = await redis.get('whatsapp:qr');

        return NextResponse.json({
            status,
            qr
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
