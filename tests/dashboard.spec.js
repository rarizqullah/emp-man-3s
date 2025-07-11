/* eslint import/no-unresolved: off */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint import/no-commonjs: off */
const { test, expect } = require('@playwright/test')
const { format } = require('date-fns')

function createMockData(days) {
  const today = new Date('2024-06-30')
  const data = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    data.push({
      date: date.toISOString().split('T')[0],
      day: format(date, 'EEE'),
      present: 100,
      late: 10,
      punctual: 90,
      absent: 0,
      attendanceRate: 90,
      punctualityRate: 90,
    })
  }
  return data
}

test.describe('Dashboard page', () => {
  test('renders chart ticks correctly for each time filter', async ({ page }) => {
    await page.route('**/api/analytics/dashboard-v2**', async (route) => {
      const url = new URL(route.request().url())
      const days = Number(url.searchParams.get('days') || '7')

      const chartData = {
        punctualityTrend: createMockData(days),
        attendanceTrend: createMockData(days),
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            activeShift: { id: '1', name: 'Shift', shiftType: 'REGULAR', mainWorkStart: null, mainWorkEnd: null },
            stats: { totalEmployees: 200, presentToday: 180, lateToday: 10, leaveToday: 10 },
            filteredStats: null,
            subDepartments: [],
            chartData,
            recentActivity: [],
            metadata: { timestamp: new Date().toISOString(), subDepartmentFilter: null, currentTime: '', currentDay: '' },
          },
        }),
      })
    })

    // Stub EventSource
    await page.addInitScript(() => {
      // Bypass auth redirect
      window.__FORCE_STAY_ON_PAGE__ = true

      window.EventSource = class {
        constructor() {}
        close() {}
        addEventListener() {}
      }
    })

    await page.goto('/dashboard')
    await expect(page.locator('text=Total Karyawan')).toBeVisible()

    // Verify 7-day ticks
    await expect(page.locator('g.recharts-cartesian-axis-tick')).toHaveCount(7)

    // Switch to 30 days
    await page.locator('button:has-text("7 Hari Terakhir")').click()
    await page.locator('div[role="option"]:has-text("30 Hari Terakhir")').click()
    await expect(page.locator('g.recharts-cartesian-axis-tick')).toHaveCount(15)

    // Switch to 3 months (90 days)
    await page.locator('button:has-text("30 Hari Terakhir")').click()
    await page.locator('div[role="option"]:has-text("3 Bulan Terakhir")').click()
    await expect(page.locator('g.recharts-cartesian-axis-tick')).toHaveCount(18)
  })
}) 