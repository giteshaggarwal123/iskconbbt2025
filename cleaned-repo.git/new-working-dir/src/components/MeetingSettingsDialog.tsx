
import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MeetingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

export const MeetingSettingsDialog: React.FC<MeetingSettingsDialogProps> = ({ open, onOpenChange, meeting }) => {
  const { register, handleSubmit, setValue } = useForm();
  const [enableRecording, setEnableRecording] = React.useState(true);
  const [enableTranscription, setEnableTranscription] = React.useState(true);
  const [autoGenerateMom, setAutoGenerateMom] = React.useState(true);

  const onSubmit = (data: any) => {
    console.log('Meeting settings updated:', {
      ...data,
      enableRecording,
      enableTranscription,
      autoGenerateMom
    });
    alert('Meeting settings updated successfully!');
    onOpenChange(false);
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Meeting Settings</DialogTitle>
          <DialogDescription>
            Configure settings for {meeting.title}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminder">Reminder Time</Label>
              <Select onValueChange={(value) => setValue('reminder', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5min">5 minutes before</SelectItem>
                  <SelectItem value="15min">15 minutes before</SelectItem>
                  <SelectItem value="30min">30 minutes before</SelectItem>
                  <SelectItem value="1hour">1 hour before</SelectItem>
                  <SelectItem value="1day">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recording">Enable Recording</Label>
                <div className="text-sm text-gray-500">Automatically record the meeting</div>
              </div>
              <Switch
                id="recording"
                checked={enableRecording}
                onCheckedChange={setEnableRecording}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="transcription">Enable Transcription</Label>
                <div className="text-sm text-gray-500">Generate speech-to-text transcription</div>
              </div>
              <Switch
                id="transcription"
                checked={enableTranscription}
                onCheckedChange={setEnableTranscription}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-mom">Auto-generate MOM</Label>
                <div className="text-sm text-gray-500">Automatically create Meeting Minutes</div>
              </div>
              <Switch
                id="auto-mom"
                checked={autoGenerateMom}
                onCheckedChange={setAutoGenerateMom}
              />
            </div>

            <div>
              <Label htmlFor="passcode">Meeting Passcode</Label>
              <Input 
                id="passcode" 
                type="password"
                {...register('passcode')}
                placeholder="Enter meeting passcode (optional)"
              />
            </div>

            <div>
              <Label htmlFor="waiting-room">Waiting Room</Label>
              <Select onValueChange={(value) => setValue('waitingRoom', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select waiting room setting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="all">All attendees</SelectItem>
                  <SelectItem value="external">External attendees only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
