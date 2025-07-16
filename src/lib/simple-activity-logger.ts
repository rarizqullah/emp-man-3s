import { prisma } from '@/lib/db'

export interface LoginActivityData {
  email: string
  waktuLogin?: Date
}

export class SimpleActivityLogger {
  
  // Log login activity
  static async logLogin(email: string, waktuLogin: Date = new Date()) {
    try {
      const activity = await prisma.activityLog.create({
        data: {
          email,
          waktuLogin,
        }
      })
      
      console.log(`✅ Login activity logged for: ${email}`)
      return activity
    } catch (error) {
      console.error('Failed to log login activity:', error)
      throw error
    }
  }

  // Get recent login activities
  static async getRecentLoginActivities(limit = 50) {
    try {
      const activities = await prisma.activityLog.findMany({
        take: limit,
        orderBy: {
          waktuLogin: 'desc'
        }
      })

      return activities.map(activity => ({
        id: activity.id,
        email: activity.email,
        waktuLogin: activity.waktuLogin.toISOString(),
        timeAgo: this.getTimeAgo(activity.waktuLogin),
        formattedTime: this.formatDateTime(activity.waktuLogin)
      }))
    } catch (error) {
      console.error('Failed to get recent login activities:', error)
      return []
    }
  }

  // Get login statistics
  static async getLoginStats() {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const [todayLogins, totalLogins, uniqueUsers] = await Promise.all([
        prisma.activityLog.count({
          where: {
            waktuLogin: {
              gte: startOfDay
            }
          }
        }),
        prisma.activityLog.count(),
        prisma.activityLog.findMany({
          distinct: ['email'],
          select: { email: true }
        })
      ])

      return {
        todayLogins,
        totalLogins,
        uniqueUsers: uniqueUsers.length
      }
    } catch (error) {
      console.error('Failed to get login stats:', error)
      return {
        todayLogins: 0,
        totalLogins: 0,
        uniqueUsers: 0
      }
    }
  }

  // Get login activities by date range
  static async getLoginActivitiesByDateRange(startDate: Date, endDate: Date) {
    try {
      const activities = await prisma.activityLog.findMany({
        where: {
          waktuLogin: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          waktuLogin: 'desc'
        }
      })

      return activities.map(activity => ({
        id: activity.id,
        email: activity.email,
        waktuLogin: activity.waktuLogin,
        formattedTime: this.formatDateTime(activity.waktuLogin)
      }))
    } catch (error) {
      console.error('Failed to get login activities by date range:', error)
      return []
    }
  }

  // Helper methods
  private static getTimeAgo(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} hari yang lalu`
    if (hours > 0) return `${hours} jam yang lalu`
    if (minutes > 0) return `${minutes} menit yang lalu`
    return 'Baru saja'
  }

  private static formatDateTime(date: Date): string {
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

export default SimpleActivityLogger
