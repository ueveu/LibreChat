import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui';
import { Badge } from '~/components/ui';
import { ScrollArea } from '~/components/ui';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui';
import { ChevronDown, ChevronUp, Folder, AlertTriangle, Briefcase, User, Bell, FileText } from 'lucide-react';
import { EmailSourceCard } from './EmailSourceCard';

interface EmailCategory {
  name: string;
  count: number;
  emails: any[];
  description: string;
}

interface EmailCategoriesProps {
  categories: EmailCategory[];
  onEmailOpen?: (email: any) => void;
}

export const EmailCategories: React.FC<EmailCategoriesProps> = ({
  categories,
  onEmailOpen,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    switch (name) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'work':
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      case 'personal':
        return <User className="h-4 w-4 text-green-600" />;
      case 'newsletters':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'notifications':
        return <Bell className="h-4 w-4 text-orange-600" />;
      default:
        return <Folder className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    switch (name) {
      case 'urgent':
        return 'border-red-200 bg-red-50';
      case 'work':
        return 'border-blue-200 bg-blue-50';
      case 'personal':
        return 'border-green-200 bg-green-50';
      case 'newsletters':
        return 'border-purple-200 bg-purple-50';
      case 'notifications':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getBadgeVariant = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    switch (name) {
      case 'urgent':
        return 'destructive';
      case 'work':
        return 'default';
      case 'personal':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No email categories found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.name);
        
        return (
          <Collapsible
            key={category.name}
            open={isExpanded}
            onOpenChange={() => toggleCategory(category.name)}
          >
            <CollapsibleTrigger asChild>
              <Card className={`cursor-pointer hover:shadow-md transition-all ${getCategoryColor(category.name)}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category.name)}
                      <CardTitle className="text-sm font-medium">
                        {category.name}
                      </CardTitle>
                      <Badge variant={getBadgeVariant(category.name)} className="text-xs">
                        {category.count}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {category.description}
                  </p>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <Card className={getCategoryColor(category.name)}>
                <CardContent className="pt-3">
                  {category.emails && category.emails.length > 0 ? (
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {category.emails.map((email, index) => (
                          <EmailSourceCard
                            key={email.id || index}
                            email={email}
                            variant={category.name.toLowerCase() === 'urgent' ? 'urgent' : 'compact'}
                            onOpenEmail={onEmailOpen}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No emails in this category</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};