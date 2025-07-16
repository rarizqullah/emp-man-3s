import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, Users, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginActivity {
  id: string;
  email: string;
  waktuLogin: string;
  timeAgo: string;
  formattedTime: string;
}

interface LoginStats {
  todayLogins: number;
  totalLogins: number;
  uniqueUsers: number;
}

interface LoginActivitiesData {
  activities: LoginActivity[];
  stats: LoginStats;
  total: number;
}

export default function LoginActivitiesPanel() {
  const [data, setData] = useState<LoginActivitiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLoginActivities = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/activities/login?limit=50');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to fetch login activities:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch login activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoginActivities();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchLoginActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchLoginActivities();
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Aktivitas Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Aktivitas Login
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        
        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Hari Ini</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {data.stats.todayLogins}
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Total User</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {data.stats.uniqueUsers}
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-600">Total Login</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {data.stats.totalLogins}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {data?.activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Belum ada aktivitas login</p>
              <p className="text-sm mt-2">Aktivitas login karyawan akan muncul di sini</p>
            </div>
          ) : (
            data?.activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activity.email}</p>
                    <p className="text-xs text-gray-500">{activity.formattedTime}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {activity.timeAgo}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
        
        {data?.total && data.total > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 text-center">
              Menampilkan {data.activities.length} aktivitas login terbaru
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
