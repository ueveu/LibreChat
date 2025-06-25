import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui';
import { Button } from '~/components/ui';
import { Badge } from '~/components/ui';
import { ScrollArea } from '~/components/ui';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui';
import { ChevronDown, ChevronUp, Mail, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { EmailSourceCard } from './EmailSourceCard';
import { EmailCategories } from './EmailCategories';
import { EmailActionItems } from './EmailActionItems';

interface EmailSummary {
  total_emails: number;
  unread_count: number;
  summary: string;
  key_topics: string[];
  urgent_emails: any[];
  action_items: any[];
  sender_breakdown: Record<string, number>;
  date_range?: {
    earliest: string;
    latest: string;
  };
}

interface EmailSummaryPanelProps {
  summary: EmailSummary;
  categories?: any[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const EmailSummaryPanel: React.FC<EmailSummaryPanelProps> = ({
  summary,
  categories = [],
  onRefresh,
  isLoading = false,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    topics: false,
    urgent: false,
    actions: false,
    senders: false,
    categories: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const topSenders = Object.entries(summary.sender_breakdown || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Email Summary</h2>
        </div>
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Overview Stats */}
      <Collapsible 
        open={expandedSections.overview} 
        onOpenChange={() => toggleSection('overview')}
      >
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Overview</CardTitle>
                {expandedSections.overview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{summary.total_emails}</div>
                  <div className="text-sm text-gray-600">Total Emails</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{summary.unread_count || 0}</div>
                  <div className="text-sm text-gray-600">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.urgent_emails?.length || 0}</div>
                  <div className="text-sm text-gray-600">Urgent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.action_items?.length || 0}</div>
                  <div className="text-sm text-gray-600">Action Items</div>
                </div>
              </div>

              {/* Summary Text */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">{summary.summary}</p>
              </div>

              {/* Date Range */}
              {summary.date_range && (
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(summary.date_range.earliest).toLocaleDateString()} - {' '}
                    {new Date(summary.date_range.latest).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Key Topics */}
      {summary.key_topics && summary.key_topics.length > 0 && (
        <Collapsible 
          open={expandedSections.topics} 
          onOpenChange={() => toggleSection('topics')}
        >
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Key Topics ({summary.key_topics.length})</CardTitle>
                  {expandedSections.topics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {summary.key_topics.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Urgent Emails */}
      {summary.urgent_emails && summary.urgent_emails.length > 0 && (
        <Collapsible 
          open={expandedSections.urgent} 
          onOpenChange={() => toggleSection('urgent')}
        >
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors border-red-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <CardTitle className="text-base text-red-700">
                      Urgent Emails ({summary.urgent_emails.length})
                    </CardTitle>
                  </div>
                  {expandedSections.urgent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <Card className="border-red-200">
              <CardContent className="pt-4">
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {summary.urgent_emails.map((email, index) => (
                      <EmailSourceCard key={index} email={email} variant="urgent" />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Action Items */}
      {summary.action_items && summary.action_items.length > 0 && (
        <Collapsible 
          open={expandedSections.actions} 
          onOpenChange={() => toggleSection('actions')}
        >
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors border-green-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <CardTitle className="text-base text-green-700">
                      Action Items ({summary.action_items.length})
                    </CardTitle>
                  </div>
                  {expandedSections.actions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <Card className="border-green-200">
              <CardContent className="pt-4">
                <EmailActionItems actionItems={summary.action_items} />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Top Senders */}
      {topSenders.length > 0 && (
        <Collapsible 
          open={expandedSections.senders} 
          onOpenChange={() => toggleSection('senders')}
        >
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Top Senders</CardTitle>
                  {expandedSections.senders ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {topSenders.map(([sender, count], index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm truncate flex-1">{sender}</span>
                      <Badge variant="outline" className="text-xs ml-2">
                        {count} emails
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Email Categories */}
      {categories.length > 0 && (
        <Collapsible 
          open={expandedSections.categories} 
          onOpenChange={() => toggleSection('categories')}
        >
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Categories ({categories.length})</CardTitle>
                  {expandedSections.categories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-4">
                <EmailCategories categories={categories} />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};