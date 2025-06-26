import React, { useState } from 'react';
import { Card, CardContent } from '~/components/ui';
import { Badge } from '~/components/ui';
import { Button } from '~/components/ui';
import { Checkbox } from '~/components/ui';
import { ScrollArea } from '~/components/ui';
import { CheckCircle, Circle, Clock, AlertTriangle, User, Mail } from 'lucide-react';

interface ActionItem {
  description: string;
  email_subject: string;
  sender: string;
  urgency: 'low' | 'medium' | 'high';
  due_date?: string;
  completed?: boolean;
}

interface EmailActionItemsProps {
  actionItems: ActionItem[];
  onToggleComplete?: (index: number) => void;
  onViewEmail?: (sender: string, subject: string) => void;
}

export const EmailActionItems: React.FC<EmailActionItemsProps> = ({
  actionItems,
  onToggleComplete,
  onViewEmail,
}) => {
  const [localCompleted, setLocalCompleted] = useState<Set<number>>(new Set());

  const handleToggleComplete = (index: number) => {
    const newCompleted = new Set(localCompleted);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setLocalCompleted(newCompleted);
    onToggleComplete?.(index);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-orange-600 bg-orange-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const sortedActionItems = [...actionItems].sort((a, b) => {
    // Sort by urgency (high -> medium -> low) then by completion status
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    const aCompleted = localCompleted.has(actionItems.indexOf(a)) || a.completed;
    const bCompleted = localCompleted.has(actionItems.indexOf(b)) || b.completed;
    
    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1; // Incomplete items first
    }
    
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  if (!actionItems || actionItems.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No action items found</p>
        <p className="text-xs mt-1">Action items will be automatically extracted from your emails</p>
      </div>
    );
  }

  const completedCount = Array.from(localCompleted).length + actionItems.filter(item => item.completed).length;
  const totalCount = actionItems.length;

  return (
    <div className="space-y-3">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {completedCount} of {totalCount} completed
        </div>
        <div className="flex-1 mx-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="text-sm font-medium text-gray-700">
          {Math.round((completedCount / totalCount) * 100) || 0}%
        </div>
      </div>

      {/* Action Items List */}
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {sortedActionItems.map((item, originalIndex) => {
            const index = actionItems.indexOf(item);
            const isCompleted = localCompleted.has(index) || item.completed;
            
            return (
              <Card
                key={index}
                className={`transition-all duration-200 ${
                  isCompleted 
                    ? 'opacity-60 bg-gray-50 border-gray-200' 
                    : 'hover:shadow-md border-gray-300'
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Completion Checkbox */}
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleToggleComplete(index)}
                      className="mt-0.5"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Action Description */}
                      <div className={`text-sm font-medium mb-2 ${
                        isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}>
                        {item.description}
                      </div>

                      {/* Email Context */}
                      <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                        <User className="h-3 w-3" />
                        <span className="truncate">{item.sender}</span>
                        <span>•</span>
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{item.email_subject}</span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        {/* Urgency Badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getUrgencyColor(item.urgency)} border-current`}
                        >
                          <span className="flex items-center gap-1">
                            {getUrgencyIcon(item.urgency)}
                            {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
                          </span>
                        </Badge>

                        {/* View Email Button */}
                        {onViewEmail && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => onViewEmail(item.sender, item.email_subject)}
                          >
                            View Email
                          </Button>
                        )}
                      </div>

                      {/* Due Date */}
                      {item.due_date && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};