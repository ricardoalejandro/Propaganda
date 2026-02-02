import { test, expect, Page } from '@playwright/test'

const BASE_URL = 'https://propaganda.naperu.cloud'
const CREDENTIALS = {
  username: 'admin',
  password: 'difusion123'
}

test.describe('Propaganda CRM E2E Tests', () => {
  
  test('should login successfully and see dashboard', async ({ page }) => {
    console.log('🔹 Navigating to login page...')
    await page.goto(`${BASE_URL}/login`)
    
    // Wait for login form
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 })
    
    console.log('🔹 Filling login form...')
    await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username)
    await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password)
    
    console.log('🔹 Submitting login...')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    console.log('✅ Login successful! Redirected to:', page.url())
    
    // Check dashboard loaded
    await expect(page).toHaveURL(/dashboard/)
  })

  test('should load chats page with data from DB', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 })
    await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username)
    await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    
    console.log('🔹 Navigating to chats page...')
    await page.goto(`${BASE_URL}/dashboard/chats`)
    
    // Wait for chats to load
    await page.waitForTimeout(3000)
    
    // Check for any chat items or loading state
    const pageContent = await page.content()
    console.log('🔹 Page URL:', page.url())
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/propaganda-chats.png', fullPage: true })
    console.log('📸 Screenshot saved to /tmp/propaganda-chats.png')
    
    // Check for errors in console
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Check network requests
    const failedRequests: string[] = []
    page.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`)
    })
    
    await page.waitForTimeout(2000)
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors:', consoleErrors)
    }
    if (failedRequests.length > 0) {
      console.log('❌ Failed requests:', failedRequests)
    }
    
    // Log API response
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch('/api/chats')
      return { status: res.status, data: await res.json() }
    })
    console.log('🔹 /api/chats response:', JSON.stringify(apiResponse, null, 2))
    
    expect(apiResponse.status).toBe(200)
    
    // Verify chats have data from PostgreSQL
    const chats = apiResponse.data?.results?.data || []
    console.log(`🔹 Found ${chats.length} chats in database`)
    expect(chats.length).toBeGreaterThan(0)
  })

  test('should load devices/connections page', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 })
    await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username)
    await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    
    console.log('🔹 Navigating to connections page...')
    await page.goto(`${BASE_URL}/dashboard/connections`)
    
    await page.waitForTimeout(2000)
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/propaganda-connections.png', fullPage: true })
    console.log('📸 Screenshot saved to /tmp/propaganda-connections.png')
    
    // Log API response
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch('/api/devices')
      return { status: res.status, data: await res.json() }
    })
    console.log('🔹 /api/devices response:', JSON.stringify(apiResponse, null, 2))
    
    expect(apiResponse.status).toBe(200)
  })

  test('should get QR code for device login', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 })
    await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username)
    await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    
    console.log('🔹 Testing GET /api/devices/{id}/login...')
    
    // First get the device ID
    const devicesResponse = await page.evaluate(async () => {
      const res = await fetch('/api/devices')
      return { status: res.status, data: await res.json() }
    })
    
    expect(devicesResponse.status).toBe(200)
    const connections = devicesResponse.data.results || []
    
    if (connections.length === 0) {
      console.log('⚠️ No connections found, skipping QR test')
      return
    }
    
    const connectionId = connections[0].id
    console.log('🔹 Using connection ID:', connectionId)
    
    // Try to get QR code
    const loginResponse = await page.evaluate(async (connId) => {
      const res = await fetch(`/api/devices/${connId}/login`)
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
      return { status: res.status, data }
    }, connectionId)
    
    console.log('🔹 /api/devices/{id}/login response:', JSON.stringify(loginResponse, null, 2))
    
    // Should return 200 (with QR) or 400 (device not registered) - NOT 405
    expect(loginResponse.status).not.toBe(405)
    expect(loginResponse.status).not.toBe(401)
  })

  test('should get device status without 401', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 })
    await page.fill('input[name="username"], input[type="text"]', CREDENTIALS.username)
    await page.fill('input[name="password"], input[type="password"]', CREDENTIALS.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    
    // Get device ID first
    const devicesResponse = await page.evaluate(async () => {
      const res = await fetch('/api/devices')
      return { status: res.status, data: await res.json() }
    })
    
    const connections = devicesResponse.data.results || []
    if (connections.length === 0) {
      console.log('⚠️ No connections found, skipping status test')
      return
    }
    
    const connectionId = connections[0].id
    console.log('🔹 Testing GET /api/devices/{id}/status...')
    
    const statusResponse = await page.evaluate(async (connId) => {
      const res = await fetch(`/api/devices/${connId}/status`)
      return { status: res.status, data: await res.json() }
    }, connectionId)
    
    console.log('🔹 /api/devices/{id}/status response:', JSON.stringify(statusResponse, null, 2))
    
    // Should NOT return 401
    expect(statusResponse.status).not.toBe(401)
    expect(statusResponse.status).toBe(200)
  })
})
