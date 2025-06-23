import { useQuery } from '@tanstack/react-query';
import { QueryKeys, request } from 'librechat-data-provider';

interface N8NConfig {
  n8nUrl: string;
  enabled: boolean;
  features: {
    embedded: boolean;
    newWindow: boolean;
  };
}

interface N8NStatus {
  status: string;
  url: string;
  message: string;
  timestamp: string;
}

// Fetch N8N configuration
export const useN8NConfig = () => {
  return useQuery<N8NConfig>({
    queryKey: [QueryKeys.n8nConfig],
    queryFn: async () => {
      return request.get('/api/n8n/config');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Fetch N8N service status
export const useN8NStatus = () => {
  return useQuery<N8NStatus>({
    queryKey: [QueryKeys.n8nStatus],
    queryFn: async () => {
      return request.get('/api/n8n/status');
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 1,
  });
};

// Hook to get N8N URL (with fallback)
export const useN8NUrl = () => {
  const { data: config } = useN8NConfig();
  
  return config?.n8nUrl || process.env.REACT_APP_N8N_URL || 'http://localhost:5678';
};

// Hook to check if N8N is enabled
export const useN8NEnabled = () => {
  const { data: config } = useN8NConfig();
  
  return config?.enabled ?? true;
};