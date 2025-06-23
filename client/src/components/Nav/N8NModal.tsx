import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui';
import { Button } from '~/components/ui';
import { TooltipAnchor } from '~/components/ui';
import { useLocalize } from '~/hooks';
import { useN8NUrl, useN8NEnabled, useN8NStatus } from '~/hooks/useN8N';

// N8N icon SVG component
const N8NIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zM12 4.236L19.382 8 12 11.764 4.618 8 12 4.236zM4 9.236l7 3.5v7.528l-7-3.5V9.236zm16 0v7.528l-7 3.5v-7.528l7-3.5z"/>
  </svg>
);

interface N8NModalProps {
  isSmallScreen?: boolean;
}

const N8NModal: React.FC<N8NModalProps> = ({ isSmallScreen }) => {
  const localize = useLocalize();
  const [isOpen, setIsOpen] = useState(false);
  const n8nUrl = useN8NUrl();
  const n8nEnabled = useN8NEnabled();
  const { data: status, isLoading: statusLoading } = useN8NStatus();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  // Don't render if N8N is disabled
  if (!n8nEnabled) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <TooltipAnchor
          description={`N8N Workflow Automation ${status?.status === 'running' ? '(Online)' : '(Checking...)'}`}
          render={
            <Button
              size="icon"
              variant="outline"
              data-testid="n8n-modal-button"
              aria-label="Open N8N Workflow Automation"
              className="rounded-full border-none bg-transparent p-2 hover:bg-surface-hover md:rounded-xl relative"
            >
              <N8NIcon className="icon-md md:h-6 md:w-6" />
              {status?.status === 'running' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
              {statusLoading && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </Button>
          }
        />
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <N8NIcon className="h-5 w-5" />
            N8N Workflow Automation
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-4 pt-0">
          <iframe
            src={n8nUrl}
            className="w-full h-[80vh] border rounded-lg"
            title="N8N Workflow Automation"
            allow="fullscreen"
            style={{ minHeight: '600px' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default N8NModal;