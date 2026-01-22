const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth';

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: SESSION_PATH
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    }
});

client.on('qr', async (qr) => {
    console.log('📲 QR Code received');
    try {
        const url = await qrcode.toDataURL(qr);
        await redis.set('whatsapp:qr', url, 'EX', 60);
        await redis.set('whatsapp:status', 'WAITING_QR');
    } catch (error) {
        console.error('Error generating QR:', error);
    }
});

client.on('ready', async () => {
    console.log('🚀 WhatsApp Client is ready!');
    await redis.set('whatsapp:status', 'READY');
    await redis.del('whatsapp:qr');

    const subRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    subRedis.subscribe('whatsapp-commands');

    subRedis.on('message', async (channel, message) => {
        if (channel === 'whatsapp-commands') {
            const command = JSON.parse(message);
            if (command.type === 'send_message') {
                try {
                    let to = command.to.replace('+', '').trim();
                    if (!to.includes('@')) to = `${to}@c.us`;

                    console.log(`⏳ Sending to ${to}: "${command.body}"`);

                    // Simple timeout wrap for sendMessage
                    const sendPromise = client.sendMessage(to, command.body);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Send timeout')), 15000)
                    );

                    const result = await Promise.race([sendPromise, timeoutPromise]);
                    console.log(`✅ Sent successfully to ${to}`);
                } catch (error) {
                    console.error('❌ Failed to send:', error.message);
                }
            }
        }
    });
});

client.on('authenticated', () => {
    console.log('✅ Authenticated');
    redis.set('whatsapp:status', 'AUTHENTICATED');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failure', msg);
    redis.set('whatsapp:status', 'AUTH_FAILURE');
});

client.on('message', async (message) => {
    console.log('📩 New message from:', message.from);
    await handleMessage(message);
});

client.on('message_create', async (message) => {
    if (message.fromMe) {
        console.log('📤 message_create (from me):', message.to);
        await handleMessage(message);
    }
});

async function handleMessage(message) {
    try {
        if (message.from === 'status@broadcast') return;

        const contactData = await message.getContact();
        const phoneNumber = contactData.id._serialized;

        let contact = await prisma.contact.findUnique({ where: { phoneNumber } });

        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    phoneNumber,
                    name: contactData.name || contactData.pushname || contactData.number || phoneNumber,
                    status: 'NEW'
                }
            });
        }

        const chatId = message.id.remote;
        let conversation = await prisma.conversation.findFirst({
            where: { phoneNumber: chatId }
        });

        if (!conversation) {
            const chat = await message.getChat();

            // Ensure group/chat contact exists
            let chatContact = await prisma.contact.findUnique({ where: { phoneNumber: chatId } });
            if (!chatContact) {
                await prisma.contact.create({
                    data: {
                        phoneNumber: chatId,
                        name: chat.name,
                        status: 'NEW'
                    }
                });
            }

            conversation = await prisma.conversation.create({
                data: {
                    phoneNumber: chatId,
                    name: chat.name,
                    isGroup: chat.isGroup,
                    lastMessageAt: new Date(message.timestamp * 1000)
                }
            });
        } else {
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: new Date(message.timestamp * 1000) }
            });
        }

        // Upsert message to handle duplicates if message_create and message fire for same msg
        await prisma.message.upsert({
            where: { id: message.id._serialized },
            update: {},
            create: {
                id: message.id._serialized,
                conversationId: conversation.id,
                body: message.body,
                fromMe: message.fromMe,
                type: message.type,
                timestamp: new Date(message.timestamp * 1000),
                hasMedia: message.hasMedia
            }
        });

    } catch (error) {
        console.error('Error handling message:', error);
    }
}

client.initialize();
