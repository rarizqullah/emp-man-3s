'use client'

import React, { useState } from 'react'
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  useNotifications, 
  useDashboardActions, 
  useUIState,
  type Notification 
} from '@/lib/dashboard-store'
import { cn } from '@/lib/utils'

// Notification type icons and colors
const notificationConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
}

// Format relative time
const formatRelativeTime = (date: Date) => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  
  return date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short',
    year: diffDay > 365 ? 'numeric' : undefined
  })
}

// Single notification item component
const NotificationItem = ({ notification }: { notification: Notification }) => {
  const { markNotificationAsRead, removeNotification } = useDashboardActions()
  const config = notificationConfig[notification.type]
  const IconComponent = config.icon

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    markNotificationAsRead(notification.id)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeNotification(notification.id)
  }

  const handleNotificationClick = () => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id)
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  return (
    <div
      className={cn(
        'p-4 border rounded-lg transition-all duration-200 hover:shadow-sm cursor-pointer',
        config.bgColor,
        config.borderColor,
        !notification.isRead && 'ring-2 ring-primary/20'
      )}
      onClick={handleNotificationClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          <IconComponent className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              'font-medium text-sm leading-tight',
              !notification.isRead && 'font-semibold'
            )}>
              {notification.title}
            </h4>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={handleMarkAsRead}
                  title="Mark as read"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-black/5 dark:hover:bg-white/5"
                onClick={handleRemove}
                title="Remove notification"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(notification.timestamp)}
            </span>
            
            {!notification.isRead && (
              <Badge variant="secondary" className="text-xs">
                New
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Notification bell button
export const NotificationBell = () => {
  const { notifications, unreadCount } = useNotifications()
  const { isNotificationOpen } = useUIState()
  const { setNotificationOpen, markAllNotificationsAsRead } = useDashboardActions()

  return (
    <DropdownMenu open={isNotificationOpen} onOpenChange={setNotificationOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="relative"
          title={`${unreadCount} unread notifications`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={markAllNotificationsAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <ScrollArea className="h-96">
          {notifications.length > 0 ? (
            <div className="p-2 space-y-2">
              {notifications.slice(0, 10).map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                />
              ))}
              
              {notifications.length > 10 && (
                <div className="text-center p-2">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all notifications
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Full notification center component
export const NotificationCenter = () => {
  const { notifications, unreadCount } = useNotifications()
  const { markAllNotificationsAsRead } = useDashboardActions()
  const [activeTab, setActiveTab] = useState('all')

  const unreadNotifications = notifications.filter(n => !n.isRead)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Center
            </CardTitle>
            <CardDescription>
              Real-time alerts and system notifications
            </CardDescription>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllNotificationsAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All
              <Badge variant="secondary" className="text-xs">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <NotificationsList notifications={notifications} />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-4">
            <NotificationsList notifications={unreadNotifications} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Notifications list component
const NotificationsList = ({ notifications }: { notifications: Notification[] }) => {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Bell className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No notifications to show</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-96">
      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
          />
        ))}
      </div>
    </ScrollArea>
  )
}

export default NotificationCenter 