import React, { useState } from 'react';
import { EmailActionItems } from './EmailActionItems';
import { EmailCategories } from './EmailCategories';
import { EmailSourceCard } from './EmailSourceCard';

interface EmailDashboardProps {
  className?: string;
}

/**
 * Email Dashboard Component
 * Main page for email management and summarization features
 */
export const EmailDashboard: React.FC<EmailDashboardProps> = ({ className = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [emails, setEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sample data for demonstration
  const sampleEmails = [
    {
      id: '1',
      subject: 'Weekly Team Meeting',
      sender: 'team@company.com',
      date: new Date().toISOString(),
      summary: 'Discussion of project milestones and upcoming deadlines',
      category: 'meetings',
      priority: 'high'
    },
    {
      id: '2',
      subject: 'Budget Review Q4',
      sender: 'finance@company.com',
      date: new Date(Date.now() - 86400000).toISOString(),
      summary: 'Financial report and budget allocation for next quarter',
      category: 'finance',
      priority: 'medium'
    }
  ];

  const handleFetchEmails = async () => {
    setIsLoading(true);
    try {
      // TODO: Integrate with IMAP-MCP server
      console.log('Fetching emails from IMAP-MCP server...');
      
      // Simulate API call
      setTimeout(() => {
        setEmails(sampleEmails);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setIsLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Emails', count: sampleEmails.length },
    { id: 'meetings', name: 'Meetings', count: 1 },
    { id: 'finance', name: 'Finance', count: 1 },
    { id: 'projects', name: 'Projects', count: 0 }
  ];

  return (
    <div className={`flex h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Left Sidebar - Categories */}
      <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            📧 Email Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI-powered email summarization and management
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={handleFetchEmails}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {isLoading ? '🔄 Fetching...' : '📥 Fetch Emails'}
          </button>
        </div>

        <EmailCategories
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          className="mb-6"
        />

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            🔧 Email Settings
          </h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Configure IMAP
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Email List */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedCategory === 'all' ? 'All Emails' : `${selectedCategory} Emails`}
            </h2>
            <span className="text-sm text-gray-500">
              {emails.length} emails
            </span>
          </div>

          <div className="space-y-3">
            {emails.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📬</div>
                <p className="text-gray-500 dark:text-gray-400">
                  {isLoading ? 'Loading emails...' : 'No emails found. Click "Fetch Emails" to get started.'}
                </p>
              </div>
            ) : (
              emails.map((email) => (
                <EmailSourceCard
                  key={email.id}
                  email={email}
                  onClick={() => console.log('Email clicked:', email.id)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Action Items */}
        <div className="w-1/2 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📋 Action Items
          </h2>
          
          <EmailActionItems
            emails={emails}
            className="mb-6"
          />

          {/* Email Summary Stats */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              📊 Summary Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Emails:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {emails.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Unread:</span>
                <span className="ml-2 font-medium text-red-600">
                  {emails.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">High Priority:</span>
                <span className="ml-2 font-medium text-orange-600">
                  {emails.filter(e => e.priority === 'high').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Categories:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {categories.length - 1}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              ⚡ Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors duration-200">
                🤖 Summarize All Emails
              </button>
              <button className="w-full text-left px-3 py-2 text-sm bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg transition-colors duration-200">
                📋 Extract Action Items
              </button>
              <button className="w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg transition-colors duration-200">
                🏷️ Auto-Categorize
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailDashboard;