import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePolls, Poll } from '@/hooks/usePolls';
import { toast } from 'sonner';

interface EditPollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll: Poll | null;
}

export const EditPollDialog: React.FC<EditPollDialogProps> = ({ open, onOpenChange, poll }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
  });

  const [subPolls, setSubPolls] = useState<Array<{ id: string; title: string; description: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const { updatePoll } = usePolls();

  useEffect(() => {
    if (poll && open) {
      // Convert UTC deadline to local datetime-local string for input fields
      const utcDate = new Date(poll.deadline);
      const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
      const localString = localDate.toISOString().slice(0, 16);
      setFormData({
        title: poll.title,
        description: poll.description || '',
        deadline: localString,
      });
      
      setSubPolls(poll.sub_polls?.map(sp => ({
        id: sp.id,
        title: sp.title,
        description: sp.description || ''
      })) || []);
    }
  }, [poll, open]);

  const updateSubPoll = (index: number, field: 'title' | 'description', value: string) => {
    setSubPolls(prev => prev.map((sp, i) => 
      i === index ? { ...sp, [field]: value } : sp
    ));
  };

  const addSubPoll = () => {
    setSubPolls(prev => [
      ...prev,
      { id: Date.now().toString(), title: '', description: '' }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!poll) return;

    setSubmitting(true);
    
    try {
      // Convert local datetime-local string to UTC ISO string before saving
      const local = new Date(formData.deadline);
      const utc = new Date(local.getTime() - local.getTimezoneOffset() * 60000);
      const utcString = utc.toISOString();
      const success = await updatePoll(poll.id, {
        title: formData.title,
        description: formData.description,
        deadline: utcString,
        subPolls: subPolls
      });

      if (success) {
        onOpenChange(false);
        toast.success('Poll updated successfully');
      }
    } catch (error) {
      console.error('Error updating poll:', error);
      toast.error('Failed to update poll');
    } finally {
      setSubmitting(false);
    }
  };

  if (!poll) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          zIndex: 20000,
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'white',
        }}
        className="sm:max-w-[700px] w-full max-w-lg overflow-y-auto relative"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
        >
          <X className="h-5 w-5" />
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Edit Poll</span>
          </DialogTitle>
          <DialogDescription>
            Edit poll details and questions. Note: Changes will affect ongoing voting.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="edit-title">Poll Title</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter poll title..."
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide description of the poll..."
              rows={3}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="edit-deadline">Voting Deadline</Label>
            <div className="flex gap-4 mt-2">
              <Input
                id="edit-deadline"
                type="date"
                value={formData.deadline.slice(0, 10)}
                onChange={e => setFormData({ ...formData, deadline: e.target.value + formData.deadline.slice(10) })}
                className="w-40"
                required
              />
              <Input
                id="edit-deadline-time"
                type="time"
                value={formData.deadline.slice(11, 16)}
                onChange={e => setFormData({ ...formData, deadline: formData.deadline.slice(0, 10) + 'T' + e.target.value })}
                className="w-28"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Poll Questions</Label>
            <div className="flex justify-end mb-2">
              <Button type="button" variant="outline" size="sm" onClick={addSubPoll}>
                + Add Question
              </Button>
            </div>
            <div className="space-y-4">
              {subPolls.map((subPoll, index) => (
                <Card key={subPoll.id} className="border-2 border-dashed border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Question {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor={`edit-subpoll-title-${index}`}>Question Title</Label>
                      <Input
                        id={`edit-subpoll-title-${index}`}
                        value={subPoll.title}
                        onChange={(e) => updateSubPoll(index, 'title', e.target.value)}
                        placeholder="Enter the question..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-subpoll-description-${index}`}>Question Description</Label>
                      <Textarea
                        id={`edit-subpoll-description-${index}`}
                        value={subPoll.description}
                        onChange={(e) => updateSubPoll(index, 'description', e.target.value)}
                        placeholder="Additional details about this question..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Important Notice</h4>
            <p className="text-sm text-gray-800">
              Editing this poll may affect ongoing voting. Members who have already voted will keep their votes, 
              but changes to questions may cause confusion. Consider creating a new poll instead if major changes are needed.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
