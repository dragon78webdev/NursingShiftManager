import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, RefreshCw, CalendarCheck, AlertTriangle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { ShiftRequestStatus } from '@shared/schema';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: 'SHIFT_REQUEST' | 'SCHEDULES_GENERATED' | 'SICKNESS_REPORT';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  isNew?: boolean;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHeadNurse = user?.role === 'head_nurse';
  
  // Fetch shift requests for pending notifications
  const { data: shiftRequests } = useQuery({
    queryKey: ['/api/shift-requests', { status: 'pending' }],
    enabled: isHeadNurse && isOpen
  });
  
  // Fetch activity logs for notifications
  const { data: activityLogs } = useQuery({
    queryKey: ['/api/activity-logs'],
    enabled: isOpen
  });
  
  // Combine and process notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  useEffect(() => {
    const notificationItems: NotificationItem[] = [];
    
    // Add shift requests as notifications for head nurse
    if (isHeadNurse && shiftRequests) {
      shiftRequests.forEach((request: any) => {
        notificationItems.push({
          id: `request-${request.id}`,
          type: 'SHIFT_REQUEST',
          title: 'Richiesta cambio turno',
          message: `${request.requestedByStaff.user.name} ha richiesto un cambio turno per il ${new Date(request.shiftDate).toLocaleDateString('it-IT')}.`,
          timestamp: new Date(request.createdAt),
          data: request,
          isNew: true
        });
      });
    }
    
    // Add activity logs as notifications
    if (activityLogs) {
      activityLogs.forEach((log: any) => {
        if (log.action === 'GENERATE_SCHEDULES') {
          notificationItems.push({
            id: `log-${log.id}`,
            type: 'SCHEDULES_GENERATED',
            title: 'Turni generati',
            message: `I turni per il periodo ${new Date(log.details.startDate).toLocaleDateString('it-IT')}-${new Date(log.details.endDate).toLocaleDateString('it-IT')} sono stati generati.`,
            timestamp: new Date(log.createdAt)
          });
        } else if (log.action === 'CREATE_SHIFT_REQUEST' && log.userId !== user?.id) {
          notificationItems.push({
            id: `log-${log.id}`,
            type: 'SHIFT_REQUEST',
            title: 'Nuova richiesta cambio turno',
            message: `${log.user.name} ha creato una nuova richiesta di cambio turno.`,
            timestamp: new Date(log.createdAt)
          });
        }
      });
    }
    
    // Sort by timestamp, newest first
    notificationItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    setNotifications(notificationItems);
  }, [shiftRequests, activityLogs, isHeadNurse, user?.id]);
  
  // Handle shift request approval/rejection
  const handleRequestAction = async (requestId: number, status: ShiftRequestStatus) => {
    try {
      await apiRequest('PUT', `/api/shift-requests/${requestId}/status`, { status });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/shift-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
      
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };
  
  // Format relative time
  const formatRelativeTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: it });
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SHIFT_REQUEST':
        return <RefreshCw className="text-blue-500" />;
      case 'SCHEDULES_GENERATED':
        return <CalendarCheck className="text-green-500" />;
      case 'SICKNESS_REPORT':
        return <AlertTriangle className="text-red-500" />;
      default:
        return <Bell className="text-gray-500" />;
    }
  };
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-40 transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div 
        className="absolute inset-0 bg-gray-600 bg-opacity-50"
        onClick={onClose}
      />
      
      <div 
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-xs bg-white shadow-lg",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Notifiche</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto h-full pb-20">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>Nessuna notifica</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "p-4",
                    notification.isNew ? "bg-blue-50" : ""
                  )}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        notification.type === 'SHIFT_REQUEST' ? "bg-blue-100" :
                        notification.type === 'SCHEDULES_GENERATED' ? "bg-green-100" :
                        "bg-red-100"
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-700">{notification.message}</p>
                      
                      {/* Action buttons for shift requests that head nurses can approve/reject */}
                      {isHeadNurse && notification.type === 'SHIFT_REQUEST' && notification.data?.status === 'pending' && (
                        <div className="mt-2 flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 border-green-200"
                            onClick={() => handleRequestAction(notification.data.id, ShiftRequestStatus.APPROVED)}
                          >
                            Approva
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
                            onClick={() => handleRequestAction(notification.data.id, ShiftRequestStatus.REJECTED)}
                          >
                            Rifiuta
                          </Button>
                        </div>
                      )}
                      
                      <p className="mt-1 text-xs text-gray-500">
                        {formatRelativeTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationsPanel;
