import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Trash2, Upload, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePolls } from '@/hooks/usePolls';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { toast } from 'sonner';

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubPoll {
  id: string;
  title: string;
  description: string;
}

export const CreatePollDialog: React.FC<CreatePollDialogProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    notifyMembers: true
  });

  const [subPolls, setSubPolls] = useState<SubPoll[]>([
    { id: '1', title: '', description: '' }
  ]);

  const [attachment, setAttachment] = useState<File | null>(null);
  const { createPoll } = usePolls();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [deadlineTime, setDeadlineTime] = useState<string>('');
  const [uniqueId, setUniqueId] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    return `CR 1 / ${year} / ${month} / ${random}`;
  });

  const addSubPoll = () => {
    const newSubPoll: SubPoll = {
      id: Date.now().toString(),
      title: '',
      description: ''
    };
    setSubPolls([...subPolls, newSubPoll]);
  };

  const removeSubPoll = (id: string) => {
    if (subPolls.length > 1) {
      setSubPolls(subPolls.filter(poll => poll.id !== id));
    }
  };

  const updateSubPoll = (id: string, field: keyof SubPoll, value: string) => {
    setSubPolls(subPolls.map(poll => 
      poll.id === id ? { ...poll, [field]: value } : poll
    ));
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.type)) {
        setAttachment(file);
      } else {
        alert('Please select a PDF, DOC, or DOCX file.');
        e.target.value = '';
      }
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deadline: '',
      notifyMembers: true
    });
    setSubPolls([{ id: '1', title: '', description: '' }]);
    setAttachment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const validSubPolls = subPolls.filter(poll => poll.title.trim() !== '');
    if (validSubPolls.length === 0) {
      alert('Please add at least one sub-poll with a title.');
      setIsSubmitting(false);
      return;
    }
    let deadline = '';
    if (deadlineDate && deadlineTime) {
      const [hours, minutes] = deadlineTime.split(':');
      const combined = new Date(deadlineDate);
      combined.setHours(Number(hours), Number(minutes), 0, 0);
      deadline = combined.toISOString();
    }
    const result = await createPoll({
      title: formData.title,
      description: formData.description,
      deadline,
      notify_members: formData.notifyMembers,
      subPolls: validSubPolls.map(sp => ({ title: sp.title, description: sp.description })),
      attachment: attachment || undefined,
      unique_id: uniqueId
    });
    setIsSubmitting(false);
    if (result) {
      onOpenChange(false);
      resetForm();
      setDeadlineDate(null);
      setDeadlineTime('');
    } else {
      toast.error('Failed to create poll. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-white pointer-events-auto px-6 sm:px-10 py-8">
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
        >
          <X className="h-5 w-5" />
        </button>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-1">Create New Poll</DialogTitle>
          <DialogDescription className="mb-6 text-gray-600">
            Create a new poll with multiple questions for committee voting
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Poll Details */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="text-lg font-bold mb-4">Poll Details</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Main Poll Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter main poll title..."
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="description">Main Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide overall description of the poll..."
                  rows={2}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          {/* Section: Voting Deadline & Attachment */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="text-lg font-bold mb-4">Voting Deadline & Attachment</h3>
            <div className="space-y-4">
              <div>
                <Label>Voting Deadline</Label>
                <div className="flex gap-2 mt-2">
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-40 justify-start text-left font-normal",
                          !deadlineDate && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadlineDate ? format(deadlineDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadlineDate || undefined}
                        onSelect={(date: Date | undefined) => {
                          setDeadlineDate(date || null);
                          setShowCalendar(false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <select
                    className="border rounded px-2 py-1 w-28"
                    value={deadlineTime}
                    onChange={e => setDeadlineTime(e.target.value)}
                  >
                    <option value="">Pick time</option>
                    {Array.from({ length: 24 * 4 }, (_, i) => {
                      const h = Math.floor(i / 4).toString().padStart(2, '0');
                      const m = (i % 4 * 15).toString().padStart(2, '0');
                      return <option key={`${h}:${m}`} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="attachment">Supporting Document (Optional)</Label>
                <div className="mt-2">
                  {!attachment ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-600 mb-2">
                        Upload a supporting document (PDF, DOC, DOCX)
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleAttachmentChange}
                        className="hidden"
                        id="attachment-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('attachment-input')?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate max-w-[120px]">{attachment.name}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeAttachment}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Section: Poll Questions */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Poll Questions</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSubPoll}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {subPolls.map((subPoll, index) => (
                <AccordionItem key={subPoll.id} value={subPoll.id} className="border-2 border-dashed border-gray-200 rounded mb-2">
                  <AccordionTrigger className="flex items-center justify-between px-2 py-1">
                    <span className="text-base font-medium">Question {index + 1}</span>
                    {subPolls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); removeSubPoll(subPoll.id); }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`subpoll-title-${subPoll.id}`}>Question Title *</Label>
                        <Input
                          id={`subpoll-title-${subPoll.id}`}
                          value={subPoll.title}
                          onChange={(e) => updateSubPoll(subPoll.id, 'title', e.target.value)}
                          placeholder="Enter the question..."
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`subpoll-description-${subPoll.id}`}>Question Description</Label>
                        <Textarea
                          id={`subpoll-description-${subPoll.id}`}
                          value={subPoll.description}
                          onChange={(e) => updateSubPoll(subPoll.id, 'description', e.target.value)}
                          placeholder="Additional details about this question..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <p className="text-xs text-blue-800">
                          Members will vote: <strong>For</strong>, <strong>Against</strong>, or <strong>Abstain</strong> on this question
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          {/* Section: Notify Members */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify">Notify Members</Label>
                <p className="text-xs text-gray-500">Send notification to all eligible voters</p>
              </div>
              <Switch
                id="notify"
                checked={formData.notifyMembers}
                onCheckedChange={(checked) => setFormData({ ...formData, notifyMembers: checked })}
              />
            </div>
          </div>
          {/* Section: Voting Rules */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Voting Rules</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Members must vote on each question: For, Against, or Abstain</li>
              <li>• Votes cannot be changed once submitted</li>
              <li>• Each question is evaluated independently</li>
              <li>• Voting is anonymous - individual choices are hidden from other members</li>
            </ul>
          </div>
          <div>
            <Label>Voting Unique ID</Label>
            <Input
              value={uniqueId}
              onChange={e => setUniqueId(e.target.value)}
              placeholder="CIRCULAR RESOLUTION 1 / YEAR / MONTH / UNIQUE IDENTIFIER"
              className="mb-4"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-700 hover:bg-red-800 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : `Create Poll (${subPolls.length} question${subPolls.length > 1 ? 's' : ''})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
