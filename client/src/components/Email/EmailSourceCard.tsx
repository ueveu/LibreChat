import React from 'react';
import { Card, CardContent } from '~/components/ui';
import { Badge } from '~/components/ui';
import { Button } from '~/components/ui';
import { Avatar, AvatarFallback } from '~/components/ui';
import { Mail, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

interface EmailSourceCardProps {
  email: {
    id?: string;
    subject: string;
    from: string;
    to?: string;
    date: string;
    body: string;
    is_read?: boolean;
    folder?: string;
  };
  variant?: 'default' | 'urgent' | 'compact';
  onOpenEmail?: (email: any) => void;
}

export const EmailSourceCard: React.FC<EmailSourceCardProps> = ({
  email,
  variant = 'default',
  onOpenEmail,
}) => {
  const getSenderInitials = (sender: string) => {
    const name = sender.split('@')[0] || sender;
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const cardClasses = {
    default: 'hover:shadow-md transition-shadow',
    urgent: 'border-red-200 bg-red-50 hover:bg-red-100',
    compact: 'hover:bg-gray-50'
  };

  return (
    <Card className={`${cardClasses[variant]} cursor-pointer`} onClick={() => onOpenEmail?.(email)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs">
              {getSenderInitials(email.from)}
            </AvatarFallback>
          </Avatar>

          {/* Email Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium truncate flex-1">
                {truncateText(email.from, 30)}
              </span>
              
              {variant === 'urgent' && (
                <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
              )}
              
              {!email.is_read && (
                <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
              )}
            </div>

            {/* Subject */}
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {truncateText(email.subject || '(No Subject)', variant === 'compact' ? 40 : 60)}
            </div>

            {/* Body Preview */}
            {variant !== 'compact' && (
              <div className="text-xs text-gray-600 mb-2">
                {truncateText(email.body || '', 120)}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatDate(email.date)}</span>
                {email.folder && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs px-1">
                      {email.folder}
                    </Badge>
                  </>
                )}
              </div>

              {onOpenEmail && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEmail(email);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};