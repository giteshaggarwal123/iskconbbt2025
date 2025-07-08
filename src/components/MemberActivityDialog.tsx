
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Calendar, Clock, User } from 'lucide-react';

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  roles: string[];
}

interface MemberActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
}

interface ActivityItem {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
  type: 'login' | 'logout' | 'meeting' | 'document' | 'vote' | 'other';
}

// Mock activity data - in real app this would come from your backend
const mockActivity: ActivityItem[] = [
  {
    id: '1',
    action: 'Logged in',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    type: 'login'
  },
  {
    id: '2',
    action: 'Joined meeting',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    details: 'Monthly Board Meeting',
    type: 'meeting'
  },
  {
    id: '3',
    action: 'Downloaded document',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    details: 'Financial Report Q4.pdf',
    type: 'document'
  },
  {
    id: '4',
    action: 'Voted on poll',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    details: 'Budget Approval 2024',
    type: 'vote'
  },
  {
    id: '5',
    action: 'Logged out',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'logout'
  }
];

export const MemberActivityDialog: React.FC<MemberActivityDialogProps> = ({
  open,
  onOpenChange,
  member
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'document':
        return <Activity className="h-4 w-4" />;
      case 'vote':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const colors = {
      login: 'bg-green-100 text-green-800',
      logout: 'bg-gray-100 text-gray-800',
      meeting: 'bg-blue-100 text-blue-800',
      document: 'bg-purple-100 text-purple-800',
      vote: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Log - {member.first_name} {member.last_name}</span>
          </DialogTitle>
          <DialogDescription>
            Recent activity and actions performed by this member
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96 w-full">
          <div className="space-y-4">
            {mockActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    {getActivityBadge(activity.type)}
                  </div>
                  
                  {activity.details && (
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.details}
                    </p>
                  )}
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimestamp(activity.timestamp)}
                    <span className="mx-2">•</span>
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
