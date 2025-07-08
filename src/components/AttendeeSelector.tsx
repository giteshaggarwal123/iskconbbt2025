import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X, Users, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AttendeeSelectorProps {
  selectedAttendees: string[];
  onAttendeesChange: (attendees: string[]) => void;
  placeholder?: string;
}

export const AttendeeSelector: React.FC<AttendeeSelectorProps> = ({
  selectedAttendees,
  onAttendeesChange,
  placeholder = "Select attendees..."
}) => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setUsers((data || []).filter((u: any) => typeof u.email === 'string' && u.email).map((u: any) => ({
        ...u,
        email: String(u.email)
      })));
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userEmail: string) => {
    const isSelected = selectedAttendees.includes(userEmail);
    if (isSelected) {
      onAttendeesChange(selectedAttendees.filter(email => email !== userEmail));
    } else {
      onAttendeesChange([...selectedAttendees, userEmail]);
    }
  };

  const handleSelectAll = () => {
    const allEmails = users.map(user => user.email).filter(email => email);
    onAttendeesChange(allEmails);
  };

  const handleDeselectAll = () => {
    onAttendeesChange([]);
  };

  const handleAddManualEmail = () => {
    if (manualEmail && manualEmail.includes('@')) {
      if (!selectedAttendees.includes(manualEmail)) {
        onAttendeesChange([...selectedAttendees, manualEmail]);
      }
      setManualEmail('');
    } else {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
    }
  };

  const handleRemoveAttendee = (email: string) => {
    onAttendeesChange(selectedAttendees.filter(e => e !== email));
  };

  const getUserDisplayName = (email: string) => {
    const user = users.find(u => u.email === email);
    if (user && user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return email;
  };

  const handleDownloadBackup = async () => {
    const { data, error } = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-backup`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${yourSupabaseAuthToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!data || error) {
      // Show error toast
      return;
    }

    // Download the file
    const blob = await data.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iskcon-portal-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <Label>Meeting Attendees</Label>
      
      {/* Selected attendees display */}
      {selectedAttendees.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
          {selectedAttendees.map((email) => (
            <Badge key={email} variant="secondary" className="flex items-center gap-1">
              <span className="text-xs">{getUserDisplayName(email)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveAttendee(email)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* User selector dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : placeholder}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 bg-white border rounded-xl shadow-xl mt-2">
          <Command>
            <CommandInput placeholder="Search users..." className="px-4 py-2 border-b rounded-t-xl" />
            <CommandList className="max-h-[320px] overflow-y-auto">
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                <div className="flex items-center space-x-2 p-3 border-b bg-gray-50 rounded-t-xl">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectAll}
                    className="flex items-center space-x-1"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Select All</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="flex items-center space-x-1"
                  >
                    <Square className="h-4 w-4" />
                    <span>Deselect All</span>
                  </Button>
                </div>
                {loading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Loading users...</div>
                ) : (
                  users.map((user) => (
                    user.email && (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleUserToggle(user.email)}
                        className="flex items-center space-x-3 cursor-pointer px-4 py-2 hover:bg-gray-100 transition rounded-none group"
                      >
                        <div className="flex items-center justify-center h-8 w-8 bg-gray-200 rounded-full text-gray-500 font-bold text-xs">
                          {user.first_name ? user.first_name[0] : user.email[0]}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : user.email
                            }
                          </div>
                          <div className="text-xs text-gray-600 group-hover:text-white transition-colors duration-150">{user.email}</div>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            checked={selectedAttendees.includes(user.email)}
                            onChange={() => handleUserToggle(user.email)}
                            className="bg-white border-gray-400 group-hover:border-gray-600"
                          />
                        </div>
                      </CommandItem>
                    )
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Manual email input */}
      <div className="flex space-x-2">
        <Input
          placeholder="Add email manually..."
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddManualEmail();
            }
          }}
        />
        <Button
          variant="outline"
          onClick={handleAddManualEmail}
          disabled={!manualEmail}
        >
          Add
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Selected attendees will receive calendar invitations and meeting notifications.
      </p>
    </div>
  );
};
