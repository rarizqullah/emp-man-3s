import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import EnhancedActivityComponent from './EnhancedActivityComponent';

export default function ActivityPanel() {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="h-full">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Aktivitas Sistem</h3>
          </div>
          <EnhancedActivityComponent />
        </div>
      </CardContent>
    </Card>
  );
}
