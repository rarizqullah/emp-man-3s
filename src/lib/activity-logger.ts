import { prisma } from '@/lib/db'

export interface ActivityLogData {
  type: 'AUTH' | 'ATTENDANCE' | 'EMPLOYEE' | 'PERMISSION' | 'SALARY' | 'SYSTEM'
  action: string
  title: string
  description: string
  email?: string | null // Email user yang melakukan aktivitas
  userId?: string | null
  employeeId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export class ActivityLogger {
  
  // Method khusus untuk log login - HANYA untuk login yang valid
  static async logLogin(email: string, ipAddress?: string, userAgent?: string, io?: unknown) {
    try {
      // Validasi email - jangan log jika email kosong atau invalid
      if (!email || email.includes('unknown') || email.includes('system')) {
        console.log('🚫 Skipping login log for invalid email:', email)
        return null
      }

      const activityLog = await prisma.activityLog.create({
        data: {
          email: email,
          waktuLogin: new Date(),
        }
      })

      console.log('✅ Login activity logged for:', email)
      return activityLog
    } catch (error) {
      console.error('❌ Failed to log login activity:', error)
      throw error
    }
  }

  static async log(data: ActivityLogData, io?: unknown) {
    try {
      // Jangan log jika email kosong atau invalid untuk AUTH activities
      if (data.type === 'AUTH' && (!data.email || data.email.includes('unknown') || data.email.includes('system'))) {
        console.log('🚫 Skipping auth log for invalid email:', data.email)
        return null
      }

      // Only log to ActivityLog for LOGIN activities, skip other types
      if (data.type !== 'AUTH' || data.action !== 'LOGIN') {
        console.log('🚫 Skipping non-login activity:', data.type, data.action)
        return null
      }

      const activityLog = await prisma.activityLog.create({
        data: {
          email: data.email!,
          waktuLogin: new Date(),
        }
      })

      // Format activity for real-time broadcast
      const formattedActivity = {
        id: activityLog.id,
        type: 'AUTH',
        action: 'LOGIN',
        title: 'User Login',
        description: `Login berhasil untuk ${data.email}`,
        email: data.email,
        user: data.email,
        department: 'System',
        timestamp: activityLog.waktuLogin.toISOString(),
        icon: this.getActivityIcon('AUTH', 'LOGIN')
      }

      // Broadcast to connected clients if Socket.io instance is provided
      if (io) {
        try {
          const socketIO = io as { to: (room: string) => { emit: (event: string, data: unknown) => void } }
          socketIO.to('activities').emit('new-activity', formattedActivity)
          socketIO.to('dashboard').emit('dashboard-update', { 
            type: 'activity',
            data: formattedActivity 
          })
        } catch (ioError) {
          console.error('⚠️ Failed to broadcast activity:', ioError)
        }
      }

      return activityLog
    } catch (error) {
      console.error('❌ Failed to log activity:', error)
      throw error
    }
  }

  static async getRecentActivities(limit = 10) {
    try {
      const activities = await prisma.activityLog.findMany({
        take: limit,
        orderBy: {
          waktuLogin: 'desc'
        },
        // Filter out system activities
        where: {
          email: {
            not: {
              contains: 'system'
            }
          }
        }
      })

      return activities.map(activity => ({
        id: activity.id,
        type: 'AUTH',
        action: 'LOGIN',
        title: 'Login Activity',
        description: `Login berhasil untuk ${activity.email}`,
        email: activity.email,
        user: activity.email,
        department: 'System',
        timestamp: activity.waktuLogin.toISOString(),
        icon: this.getActivityIcon('AUTH', 'LOGIN')
      }))
    } catch (error) {
      console.error('❌ Failed to get recent activities:', error)
      return []
    }
  }

  // Method khusus untuk mengambil aktivitas login saja
  static async getRecentLoginActivities(limit = 20) {
    try {
      const activities = await prisma.activityLog.findMany({
        take: limit,
        orderBy: {
          waktuLogin: 'desc'
        },
        // Filter out system activities
        where: {
          email: {
            not: {
              contains: 'system'
            }
          }
        }
      })

      return activities.map(activity => ({
        id: activity.id,
        type: 'AUTH',
        action: 'LOGIN',
        title: 'Login Activity',
        description: `Login berhasil untuk ${activity.email}`,
        email: activity.email,
        user: activity.email,
        department: 'System',
        timestamp: activity.waktuLogin.toISOString(),
        timeAgo: this.getTimeAgo(activity.waktuLogin),
        formattedTime: this.formatDateTime(activity.waktuLogin),
        icon: this.getActivityIcon('AUTH', 'LOGIN')
      }))
    } catch (error) {
      console.error('❌ Failed to get recent login activities:', error)
      return []
    }
  }

  // Helper method untuk format waktu
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

  private static getActivityIcon(type: string, action: string): string {
    switch (type) {
      case 'AUTH':
        return action.includes('LOGIN') ? 'user-check' : 'user-x'
      case 'ATTENDANCE':
        return action.includes('CHECK_IN') ? 'clock' : 'clock'
      case 'EMPLOYEE':
        return 'users'
      case 'PERMISSION':
        return 'file-text'
      case 'SALARY':
        return 'dollar-sign'
      case 'SYSTEM':
        return 'settings'
      default:
        return 'activity'
    }
  }

  // Helper method untuk log auth - HANYA untuk login yang valid
  static async logAuth(action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED', email: string, ipAddress?: string, userAgent?: string, io?: unknown) {
    // Validasi email terlebih dahulu
    if (!email || email.includes('unknown') || email.includes('system')) {
      console.log('🚫 Skipping auth log for invalid email:', email)
      return null
    }

    try {
      if (action === 'LOGIN') {
        return this.logLogin(email, ipAddress, userAgent, io)
      } else if (action === 'LOGIN_FAILED') {
        // For failed login, don't log to ActivityLog, just console log
        console.log(`🚫 Login failed for: ${email}`)
        return null
      } else {
        // For logout, don't log to ActivityLog since it's for login activities only
        console.log(`👋 User logout: ${email} (not logged to ActivityLog)`)
        return null
      }
    } catch (error) {
      console.error('❌ Failed to log auth activity:', error)
      throw error
    }
  }

  // Log attendance - tidak menggunakan ActivityLog model
  static async logAttendance(action: 'CHECK_IN' | 'CHECK_OUT', employeeId: string, _metadata?: Record<string, unknown>, _io?: unknown) {
    // Skip logging attendance to ActivityLog since it's for login activities only
    console.log(`📝 Attendance ${action} for employee ${employeeId} (not logged to ActivityLog)`)
    return null
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
            },
            email: {
              not: {
                contains: 'system'
              }
            }
          }
        }),
        prisma.activityLog.count({
          where: {
            email: {
              not: {
                contains: 'system'
              }
            }
          }
        }),
        prisma.activityLog.findMany({
          distinct: ['email'],
          select: { email: true },
          where: {
            email: {
              not: {
                contains: 'system'
              }
            }
          }
        })
      ])

      return {
        todayLogins,
        totalLogins,
        uniqueUsers: uniqueUsers.length
      }
    } catch (error) {
      console.error('❌ Failed to get login stats:', error)
      return {
        todayLogins: 0,
        totalLogins: 0,
        uniqueUsers: 0
      }
    }
  }

  // Get activities by date range
  static async getLoginActivitiesByDateRange(startDate: Date, endDate: Date, limit = 100) {
    try {
      const activities = await prisma.activityLog.findMany({
        take: limit,
        orderBy: {
          waktuLogin: 'desc'
        },
        where: {
          waktuLogin: {
            gte: startDate,
            lte: endDate
          },
          email: {
            not: {
              contains: 'system'
            }
          }
        }
      })

      return activities.map(activity => ({
        id: activity.id,
        type: 'AUTH',
        action: 'LOGIN',
        title: 'Login Activity',
        description: `Login berhasil untuk ${activity.email}`,
        email: activity.email,
        user: activity.email,
        department: 'System',
        timestamp: activity.waktuLogin.toISOString(),
        timeAgo: this.getTimeAgo(activity.waktuLogin),
        formattedTime: this.formatDateTime(activity.waktuLogin),
        icon: this.getActivityIcon('AUTH', 'LOGIN')
      }))
    } catch (error) {
      console.error('❌ Failed to get activities by date range:', error)
      return []
    }
  }
}

export default ActivityLogger
