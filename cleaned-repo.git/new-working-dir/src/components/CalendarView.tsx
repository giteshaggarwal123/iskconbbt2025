
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, Video, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarViewProps {
  meetings: any[];
  onMeetingClick: (meeting: any) => void;
  onDateClick?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ meetings, onMeetingClick, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getMeetingsForDay = (day: Date) => {
    return meetings.filter(meeting => 
      isSameDay(new Date(meeting.start_time), day)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (day: Date) => {
    if (onDateClick) {
      onDateClick(day);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <Calendar className="h-5 w-5" />
            <span>Meeting Calendar</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[100px] sm:min-w-[120px] text-center text-sm sm:text-base">
              {format(currentDate, 'MMM yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>
        
        {/* Calendar grid - Cubic layout for all screen sizes */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {calendarDays.map(day => {
            const dayMeetings = getMeetingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`
                  aspect-square min-h-[45px] sm:min-h-[100px] p-1 sm:p-2 border border-border relative group cursor-pointer
                  ${isCurrentMonth ? 'bg-background hover:bg-muted/50' : 'bg-muted/30'}
                  ${isDayToday ? 'ring-2 ring-primary' : ''}
                  transition-colors
                `}
                onClick={() => handleDateClick(day)}
              >
                {/* Date number */}
                <div className={`
                  text-xs sm:text-sm font-medium mb-1 text-left
                  ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                  ${isDayToday ? 'text-primary font-bold' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Add meeting button - Only show on hover for desktop */}
                {isCurrentMonth && onDateClick && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDateClick(day);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {/* Meetings display */}
                <div className="space-y-0.5 overflow-hidden">
                  {/* Mobile: Show dots for meetings */}
                  <div className="sm:hidden">
                    {dayMeetings.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {dayMeetings.slice(0, 3).map((meeting, index) => (
                          <div
                            key={meeting.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMeetingClick(meeting);
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-primary cursor-pointer"
                            title={meeting.title}
                          />
                        ))}
                        {dayMeetings.length > 3 && (
                          <div className="text-[10px] text-muted-foreground ml-0.5">+{dayMeetings.length - 3}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop: Show meeting details */}
                  <div className="hidden sm:block">
                    {dayMeetings.slice(0, 2).map(meeting => (
                      <div
                        key={meeting.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMeetingClick(meeting);
                        }}
                        className="text-[10px] p-1 rounded cursor-pointer hover:opacity-80 transition-opacity bg-primary/10 text-primary border border-primary/20 mb-0.5"
                      >
                        <div className="flex items-center space-x-1 mb-0.5">
                          {meeting.meeting_type === 'online' ? (
                            <Video className="h-2 w-2 flex-shrink-0" />
                          ) : (
                            <Users className="h-2 w-2 flex-shrink-0" />
                          )}
                          <span className="truncate flex-1 text-[10px] font-medium">
                            {meeting.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-2 w-2 flex-shrink-0" />
                          <span className="text-[9px]">{format(new Date(meeting.start_time), 'HH:mm')}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show meeting count if more than 2 */}
                    {dayMeetings.length > 2 && (
                      <div className="text-[9px] text-muted-foreground text-center bg-muted rounded px-1 py-0.5">
                        +{dayMeetings.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instruction text */}
        <div className="mt-4 text-xs sm:text-sm text-muted-foreground text-center">
          <span className="hidden sm:inline">Click on any date to create a meeting, or click on existing meetings to view details</span>
          <span className="sm:hidden">Tap dates to create meetings • Tap dots to view meetings</span>
        </div>
      </CardContent>
    </Card>
  );
};
