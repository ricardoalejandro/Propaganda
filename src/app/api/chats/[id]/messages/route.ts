import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const messages = await prisma.message.findMany({
            where: {
                conversationId: id
            },
            orderBy: {
                timestamp: 'asc'
            },
            take: 100
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { body } = await request.json();

        if (!body) {
            return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: id }
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Publish to Redis
        await redis.publish('whatsapp-commands', JSON.stringify({
            type: 'send_message',
            to: conversation.phoneNumber,
            body: body
        }));

        return NextResponse.json({ status: 'queued' });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
