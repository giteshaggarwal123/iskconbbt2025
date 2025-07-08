import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, SearchInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Calendar, Mail, Users, ArrowRight, X } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useMeetings } from '@/hooks/useMeetings';
import { useEmails } from '@/hooks/useEmails';
import { useMembers } from '@/hooks/useMembers';
import { debounce } from '@/lib/performance';
import { logger } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: 'document' | 'meeting' | 'email' | 'member';
  title: string;
  subtitle: string;
  date: string;
  icon: React.ComponentType<any>;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onOpenChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const { documents } = useDocuments();
  const { meetings } = useMeetings();
  const { emails } = useEmails();
  const { members } = useMembers();

  // Memoized search function with debouncing
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      logger.log('Performing global search for:', query);

      try {
        const searchResults: SearchResult[] = [];
        const searchTerm = query.toLowerCase();

        // Search documents
        const documentMatches = documents
          .filter(doc => doc.name.toLowerCase().includes(searchTerm))
          .map(doc => ({
            id: doc.id,
            type: 'document' as const,
            title: doc.name,
            subtitle: `${doc.folder || 'general'} folder`,
            date: new Date(doc.created_at).toLocaleDateString(),
            icon: FileText
          }));

        // Search meetings
        const meetingMatches = meetings
          .filter(meeting => 
            meeting.title.toLowerCase().includes(searchTerm) ||
            meeting.description?.toLowerCase().includes(searchTerm)
          )
          .map(meeting => ({
            id: meeting.id,
            type: 'meeting' as const,
            title: meeting.title,
            subtitle: meeting.description || '',
            date: new Date(meeting.start_time).toLocaleDateString(),
            icon: Calendar
          }));

        // Search emails
        const emailMatches = emails
          .filter(email => 
            email.subject.toLowerCase().includes(searchTerm) ||
            email.from.name.toLowerCase().includes(searchTerm)
          )
          .map(email => ({
            id: email.id,
            type: 'email' as const,
            title: email.subject,
            subtitle: `From ${email.from.name}`,
            date: new Date(email.receivedDateTime).toLocaleDateString(),
            icon: Mail
          }));

        // Search members
        const memberMatches = members
          .filter(member => 
            `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm)
          )
          .map(member => ({
            id: member.id,
            type: 'member' as const,
            title: `${member.first_name} ${member.last_name}`,
            subtitle: member.email,
            date: new Date(member.created_at).toLocaleDateString(),
            icon: Users
          }));

        searchResults.push(...documentMatches, ...meetingMatches, ...emailMatches, ...memberMatches);
        
        // Sort by relevance (exact matches first, then by date)
        searchResults.sort((a, b) => {
          const aExact = a.title.toLowerCase() === searchTerm;
          const bExact = b.title.toLowerCase() === searchTerm;
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setResults(searchResults.slice(0, 20)); // Limit to 20 results for performance
      } catch (error) {
        logger.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [documents, meetings, emails, members]
  );

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Memoized type color function
  const getTypeColor = useMemo(() => (type: string) => {
    switch (type) {
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      case 'email': return 'bg-purple-100 text-purple-800';
      case 'member': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Memoized type label function
  const getTypeLabel = useMemo(() => (type: string) => {
    switch (type) {
      case 'document': return 'Document';
      case 'meeting': return 'Meeting';
      case 'email': return 'Email';
      case 'member': return 'Member';
      default: return 'Item';
    }
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    logger.log('Search result clicked:', result);
    // Handle navigation based on result type
    // This would typically navigate to the specific item
    onOpenChange(false);
  }, [onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Global Search</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <SearchInput
              placeholder="Search documents, meetings, emails, members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto max-h-96 px-6 pb-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}

            {!loading && results.length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No results found for "{searchQuery}"</p>
              </div>
            )}

            {!loading && results.length === 0 && !searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Start typing to search across all content</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex-shrink-0">
                      <result.icon className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                          {getTypeLabel(result.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {result.subtitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        {result.date}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Tips */}
          {!searchQuery && (
            <div className="text-xs text-gray-500 px-6 pb-4">
              <p className="mb-2">Search tips:</p>
              <ul className="space-y-1">
                <li>• Type document names to find files</li>
                <li>• Search meeting titles or descriptions</li>
                <li>• Find emails by subject or sender</li>
                <li>• Look up members by name or email</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
