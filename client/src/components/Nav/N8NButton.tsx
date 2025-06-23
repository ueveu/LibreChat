import React, { useCallback } from 'react';
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

interface N8NButtonProps {
  isSmallScreen?: boolean;
}

const N8NButton: React.FC<N8NButtonProps> = ({ isSmallScreen }) => {
  const localize = useLocalize();
  const n8nUrl = useN8NUrl();
  const n8nEnabled = useN8NEnabled();
  const { data: status, isLoading: statusLoading } = useN8NStatus();

  const handleN8NClick = useCallback(() => {
    // Open N8N in a new window/tab - much more reliable than iframe
    const windowFeatures = isSmallScreen 
      ? 'noopener,noreferrer' 
      : 'width=1400,height=900,scrollbars=yes,resizable=yes,noopener,noreferrer';
    
    window.open(n8nUrl, '_blank', windowFeatures);
  }, [n8nUrl, isSmallScreen]);

  // Don't render if N8N is disabled
  if (!n8nEnabled) {
    return null;
  }

  return (
    <TooltipAnchor
      description={`Open N8N Workflow Automation ${status?.status === 'running' ? '(Online)' : '(Checking...)'}`}
      render={
        <Button
          size="icon"
          variant="outline"
          data-testid="n8n-button"
          aria-label="Open N8N Workflow Automation"
          className="rounded-full border-none bg-transparent p-2 hover:bg-surface-hover md:rounded-xl relative"
          onClick={handleN8NClick}
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
  );
};

export default N8NButton;