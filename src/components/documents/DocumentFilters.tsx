import React from 'react';
import { Input, SearchInput } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface DocumentFiltersProps {
  searchTerm: string;
  typeFilter: string;
  peopleFilter: string;
  dateFilter: string;
  uniqueUploaders: string[];
  userProfiles: {[key: string]: {first_name: string, last_name: string}};
  currentUserId: string | undefined;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onPeopleFilterChange: (value: string) => void;
  onDateFilterChange: (value: string) => void;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  searchTerm,
  typeFilter,
  peopleFilter,
  dateFilter,
  uniqueUploaders,
  userProfiles,
  currentUserId,
  onSearchChange,
  onTypeFilterChange,
  onPeopleFilterChange,
  onDateFilterChange
}) => {
  const getUserDisplayName = (userId: string) => {
    if (userId === currentUserId) return 'You';
    const profile = userProfiles[userId];
    if (profile && (profile.first_name || profile.last_name)) {
      return `${profile.first_name} ${profile.last_name}`.trim();
    }
    return 'User';
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <SearchInput
          placeholder="Search documents..."
          value={searchTerm || ''}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          className="pl-10 bg-background border-input"
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Select 
          value={typeFilter} 
          onValueChange={(value) => {
            console.log('Type filter select changed:', value);
            onTypeFilterChange(value);
          }}
        >
          <SelectTrigger className="w-full sm:w-32 bg-background border-input">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="word">Word</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="image">Images</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={peopleFilter} 
          onValueChange={(value) => {
            console.log('People filter select changed:', value);
            onPeopleFilterChange(value);
          }}
        >
          <SelectTrigger className="w-full sm:w-32 bg-background border-input">
            <SelectValue placeholder="All People" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
            <SelectItem value="all">All People</SelectItem>
            {uniqueUploaders.map(uploaderId => (
              <SelectItem key={uploaderId} value={uploaderId}>
                {getUserDisplayName(uploaderId)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={dateFilter} 
          onValueChange={(value) => {
            console.log('Date filter select changed:', value);
            onDateFilterChange(value);
          }}
        >
          <SelectTrigger className="w-full sm:w-32 bg-background border-input">
            <SelectValue placeholder="All Dates" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
