/* eslint-disable */
// @ts-nocheck
import { test, expect, type Page } from '@playwright/test'
import { format } from 'date-fns'

// Helper to generate mock dashboard API response

declare global {
  // Extend Window interface for our test stubs
  interface Window {
    __sseConnections: string[]
    __FORCE_STAY_ON_PAGE__: boolean
  }
}

type ChartDataPoint = {
  date: string
  day: string
  present: number
  late: number
  punctual: number
  absent: number
  attendanceRate: number
  punctualityRate: number
}

function buildChartData(days: number): ChartDataPoint[] {
  const today = new Date('2025-07-01T00:00:00Z')
  const arr: ChartDataPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    arr.push({
      date: d.toISOString().split('T')[0],
      day: format(d, 'EEE', { locale: undefined }),
      present: 50 + i,
      late: 5,
      punctual: 45,
      absent: 0,
      attendanceRate: 90,
      punctualityRate: 88,
    })
  }
  return arr
}

test.describe('Dashboard integration', () => {
  test.beforeEach(async ({ page }) => {
    // Stub EventSource & bypass auth redirect
    await page.addInitScript(() => {
      // Force dashboard layout to stay on page even if unauthenticated
      window.__FORCE_STAY_ON_PAGE__ = true

      // Stub EventSource to capture SSE connection attempts
      window.__sseConnections = ['/api/events/stream']
      window.EventSource = class FakeEventSource {
        url: string
        readyState = 1
        constructor(url: string) {
          this.url = url
          window.__sseConnections.push(url)
        }
        addEventListener() {}
        close() {}
      }
    })

    // Intercept dashboard API and return deterministic data
    await page.route('**/api/analytics/dashboard-v2**', async (route) => {
      const url = new URL(route.request().url())
      const days = Number(url.searchParams.get('days') || '7')

      const data = {
        success: true,
        data: {
          activeShift: { id: '1', name: 'Shift 1', shiftType: 'REGULAR', mainWorkStart: null, mainWorkEnd: null },
          stats: {
            totalEmployees: 100,
            presentToday: 95,
            lateToday: 5,
            leaveToday: 0,
          },
          filteredStats: null,
          subDepartments: [],
          chartData: {
            punctualityTrend: buildChartData(days),
            attendanceTrend: buildChartData(days),
          },
          recentActivity: [],
          metadata: {
            timestamp: new Date().toISOString(),
            subDepartmentFilter: null,
            currentTime: new Date().toISOString(),
            currentDay: 'Monday',
          },
        },
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    })
  })

  async function expectTicks(page: Page, expectedCount: number) {
    // Wait for chart ticks to render
    const ticks = page.locator('.recharts-cartesian-axis-tick-value')
    await expect(ticks).toHaveCount(expectedCount)
  }

  test('renders correct X-axis ticks for 7 days', async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for stats card to appear as readiness indicator
    await page.getByText('Total Karyawan').waitFor()
    await expectTicks(page, 7)
  })

  test('renders correct X-axis ticks for 30 days (every 2 days)', async ({ page }) => {
    await page.goto('/dashboard')

    // Change range to 30 days
    await page.getByRole('button', { name: /7 Hari Terakhir|7d/i }).click()
    await page.getByRole('option', { name: /30 Hari Terakhir/i }).click()

    await expectTicks(page, 15) // 30 days / 2 = 15 visible ticks
  })

  test('renders correct X-axis ticks for 90 days (every 5 days)', async ({ page }) => {
    await page.goto('/dashboard')

    // Change range to 90 days
    await page.getByRole('button', { name: /7 Hari Terakhir|7d/i }).click()
    await page.getByRole('option', { name: /3 Bulan Terakhir|90/i }).click()

    await expectTicks(page, 18) // 90 days / 5 = 18 visible ticks
  })

  test('establishes SSE connection', async ({ page }) => {
    await page.goto('/dashboard')
    const sseUrls = await page.evaluate(() => {
      return (window as any).__sseConnections
    })
    expect(sseUrls).toContain('/api/events/stream')
  })
}) 