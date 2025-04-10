import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ShiftRequestStatus } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

interface NotificationsBadgeProps {
  onClick: () => void;
}

export function NotificationsBadge({ onClick }: NotificationsBadgeProps) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  
  const isHeadNurse = user?.role === 'head_nurse';
  
  // Fetch pending shift requests if user is head nurse
  const { data: pendingRequests } = useQuery({
    queryKey: ['/api/shift-requests', { status: ShiftRequestStatus.PENDING }],
    enabled: isHeadNurse,
  });
  
  // Fetch activity logs for notifications
  const { data: activityLogs } = useQuery({
    queryKey: ['/api/activity-logs'],
    enabled: !!user,
  });
  
  useEffect(() => {
    let notificationCount = 0;
    
    // Count pending requests for head nurse
    if (isHeadNurse && pendingRequests) {
      notificationCount += pendingRequests.length;
    }
    
    // Count recent activity logs (last 24 hours) that are not created by the current user
    if (activityLogs) {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      notificationCount += activityLogs.filter((log: any) => {
        const logDate = new Date(log.createdAt);
        return (
          logDate > oneDayAgo && 
          log.userId !== user?.id &&
          (log.action === 'GENERATE_SCHEDULES' || log.action === 'CREATE_SHIFT_REQUEST')
        );
      }).length;
    }
    
    setCount(notificationCount);
  }, [pendingRequests, activityLogs, isHeadNurse, user?.id]);

  return (
    <Button 
      variant="ghost" 
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <Bell className="h-5 w-5 text-gray-600" />
      {count > 0 && (
        <Badge className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white rounded-full">
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </Button>
  );
}

export default NotificationsBadge;
