
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, X, Mail } from 'lucide-react';

interface ManageAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

export const ManageAttendeesDialog: React.FC<ManageAttendeesDialogProps> = ({ open, onOpenChange, meeting }) => {
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [attendees, setAttendees] = useState([
    { id: 1, name: 'Radha Krishna Das', email: 'rk.das@iskcon.org', status: 'accepted' },
    { id: 2, name: 'Gopala Swami', email: 'gopala@iskcon.org', status: 'pending' },
    { id: 3, name: 'Sita Devi Dasi', email: 'sita.dd@iskcon.org', status: 'accepted' },
    { id: 4, name: 'Arjuna Das', email: 'arjuna@iskcon.org', status: 'declined' }
  ]);

  const addAttendee = () => {
    if (newAttendeeEmail) {
      const newAttendee = {
        id: Date.now(),
        name: newAttendeeEmail.split('@')[0],
        email: newAttendeeEmail,
        status: 'pending'
      };
      setAttendees([...attendees, newAttendee]);
      setNewAttendeeEmail('');
    }
  };

  const removeAttendee = (id: number) => {
    setAttendees(attendees.filter(a => a.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Attendees</DialogTitle>
          <DialogDescription>
            Add or remove attendees for {meeting.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter email address"
              value={newAttendeeEmail}
              onChange={(e) => setNewAttendeeEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
            />
            <Button onClick={addAttendee}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {attendees.map((attendee) => (
              <div key={attendee.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>{attendee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900">{attendee.name}</div>
                    <div className="text-sm text-gray-500">{attendee.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(attendee.status)}>
                    {attendee.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttendee(attendee.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Mail className="h-4 w-4 mr-2" />
            Send Invitations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
