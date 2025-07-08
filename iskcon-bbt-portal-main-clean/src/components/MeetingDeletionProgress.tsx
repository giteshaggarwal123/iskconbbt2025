
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface DeletionProgress {
  step: string;
  completed: boolean;
  error?: string;
}

interface MeetingDeletionProgressProps {
  progress: DeletionProgress[];
  meetingTitle: string;
}

export const MeetingDeletionProgress: React.FC<MeetingDeletionProgressProps> = ({
  progress,
  meetingTitle
}) => {
  const completedSteps = progress.filter(step => step.completed).length;
  const totalSteps = progress.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const hasErrors = progress.some(step => step.error);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Deleting "{meetingTitle}"
        </CardTitle>
        <div className="space-y-2">
          <Progress value={progressPercentage} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{completedSteps} of {totalSteps} steps completed</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {progress.map((step, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            {step.completed ? (
              step.error ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.step}
                </span>
                {step.completed && (
                  <Badge 
                    variant={step.error ? "secondary" : "default"} 
                    className={step.error ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}
                  >
                    {step.error ? "Warning" : "Done"}
                  </Badge>
                )}
              </div>
              {step.error && (
                <p className="text-xs text-yellow-600 mt-1 break-words">
                  {step.error}
                </p>
              )}
            </div>
          </div>
        ))}
        
        {hasErrors && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Some steps completed with warnings
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              The meeting is being deleted but some external services may have connection issues.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
