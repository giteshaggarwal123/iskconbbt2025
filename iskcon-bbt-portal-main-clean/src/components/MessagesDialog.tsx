
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Clock, Reply, User } from 'lucide-react';

interface MessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MessagesDialog: React.FC<MessagesDialogProps> = ({ open, onOpenChange }) => {
  const messages = [
    {
      id: 1,
      sender: 'Radha Krishna Das',
      subject: 'Meeting Documents Ready for Review',
      preview: 'The agenda and supporting documents for tomorrow\'s meeting are ready...',
      time: '1 hour ago',
      read: false,
      priority: 'high'
    },
    {
      id: 2,
      sender: 'Govinda Maharaj',
      subject: 'Voting Clarification Required',
      preview: 'I need clarification on the temple expansion budget proposal...',
      time: '3 hours ago',
      read: false,
      priority: 'normal'
    },
    {
      id: 3,
      sender: 'Gauranga Prabhu',
      subject: 'Thank you for the policy update',
      preview: 'Thank you for sharing the updated prasadam distribution policy...',
      time: '1 day ago',
      read: true,
      priority: 'low'
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-error text-white text-xs">High</Badge>;
      case 'normal':
        return <Badge variant="secondary" className="text-xs">Normal</Badge>;
      case 'low':
        return <Badge className="bg-gray-400 text-white text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Messages</span>
            <Badge className="bg-primary text-white">3 unread</Badge>
          </DialogTitle>
          <DialogDescription>
            Recent messages and communications
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                message.read ? 'bg-white' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center space-x-2">
                      <h4 className={`text-sm font-medium ${!message.read ? 'font-semibold' : ''}`}>
                        {message.sender}
                      </h4>
                      {getPriorityBadge(message.priority)}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!message.read && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{message.time}</span>
                    </div>
                  </div>
                  <h5 className={`text-sm ${!message.read ? 'font-semibold' : 'font-medium'} text-gray-900 mb-1`}>
                    {message.subject}
                  </h5>
                  <p className="text-sm text-gray-600 truncate">{message.preview}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" size="sm">
            <Reply className="h-4 w-4 mr-2" />
            Compose Reply
          </Button>
          <Button variant="outline" size="sm">
            View All Messages
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
