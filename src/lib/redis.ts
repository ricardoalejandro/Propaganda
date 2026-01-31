import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Create Redis client (singleton)
let redisClient: Redis | null = null

export function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            lazyConnect: true
        })

        redisClient.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message)
        })

        redisClient.on('connect', () => {
            console.log('[Redis] Connected')
        })
    }
    return redisClient
}

// Cache helpers with automatic JSON serialization
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedisClient()
        const data = await redis.get(key)
        if (data) {
            return JSON.parse(data) as T
        }
        return null
    } catch (err) {
        console.error('[Redis] Get error:', err)
        return null
    }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number = 60): Promise<void> {
    try {
        const redis = getRedisClient()
        await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (err) {
        console.error('[Redis] Set error:', err)
    }
}

export async function cacheDelete(pattern: string): Promise<void> {
    try {
        const redis = getRedisClient()
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
            await redis.del(...keys)
        }
    } catch (err) {
        console.error('[Redis] Delete error:', err)
    }
}

// Cache keys
export const CACHE_KEYS = {
    CHATS: 'chats',
    CONTACTS: 'contacts',
    STATUS: 'status',
    MESSAGES: (jid: string) => `messages:${jid}`,
}

// TTL values in seconds
export const CACHE_TTL = {
    CHATS: 30,      // 30 seconds - chats change frequently
    CONTACTS: 300,  // 5 minutes - contacts are more stable
    STATUS: 10,     // 10 seconds - status needs to be fresh
    MESSAGES: 60,   // 1 minute - messages can be cached longer
}
