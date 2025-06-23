import React, { useCallback, useState } from 'react';
import { Button } from '~/components/ui';
import { TooltipAnchor } from '~/components/ui';
import { useLocalize } from '~/hooks';

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
  const [isN8NOpen, setIsN8NOpen] = useState(false);

  const handleN8NClick = useCallback(() => {
    // Open N8N in a new window/tab
    const n8nUrl = process.env.REACT_APP_N8N_URL || 'http://localhost:5678';
    window.open(n8nUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <TooltipAnchor
      description="Open N8N Workflow Automation"
      render={
        <Button
          size="icon"
          variant="outline"
          data-testid="n8n-button"
          aria-label="Open N8N Workflow Automation"
          className="rounded-full border-none bg-transparent p-2 hover:bg-surface-hover md:rounded-xl"
          onClick={handleN8NClick}
        >
          <N8NIcon className="icon-md md:h-6 md:w-6" />
        </Button>
      }
    />
  );
};

export default N8NButton;