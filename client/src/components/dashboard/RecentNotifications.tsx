import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Repeat2, AlertTriangle, Check } from "lucide-react";
import { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";

const RecentNotifications = () => {
  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
  });

  // Format notification time
  const formatNotificationTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: it
      });
    } catch (e) {
      return "";
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'change_request':
        return (
          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
            <Repeat2 className="h-4 w-4 text-red-500" />
          </div>
        );
      case 'schedule_issue':
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
        );
      case 'schedule_generated':
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Check className="h-4 w-4 text-primary" />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="flex space-x-3">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sort notifications by date and take the most recent 3
  const recentNotifications = [...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
      <div className="flex justify-between items-center p-4 border-b border-neutral-200 bg-neutral-50">
        <h2 className="text-lg font-semibold text-neutral-800">Notifiche Recenti</h2>
        <Button variant="link" size="sm" className="text-primary">
          Vedi tutte
        </Button>
      </div>
      <div className="p-4">
        {recentNotifications.length === 0 ? (
          <div className="text-center py-4 text-neutral-500">
            Nessuna notifica recente
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {recentNotifications.map((notification) => (
              <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex">
                  <div className="flex-shrink-0 mr-3">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{notification.title}</p>
                    <p className="text-xs text-neutral-600">{notification.message}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RecentNotifications;
