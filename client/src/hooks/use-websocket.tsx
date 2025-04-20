import { useState, useEffect, useRef, useCallback } from 'react';

type WebSocketHookOptions = {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  shouldReconnect?: boolean;
};

type ConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'RECONNECTING';

export const useWebSocket = (
  url: string | null,
  {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    shouldReconnect = true,
  }: WebSocketHookOptions = {}
) => {
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [data, setData] = useState<any>(null);
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectCountRef = useRef(0);

  // Cleanup function to close WebSocket and clear timeouts
  const cleanup = useCallback(() => {
    if (socket.current) {
      if (socket.current.readyState === WebSocket.OPEN) {
        socket.current.close();
      }
      socket.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Handle connection
  const connect = useCallback(() => {
    cleanup();

    // Si la URL es nula, no intentamos conectar
    if (!url) {
      console.log('[WebSocket] No URL provided, not connecting');
      setStatus('CLOSED');
      return;
    }

    try {
      // Create WebSocket connection with dynamic protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;
      
      console.log(`[WebSocket] Connecting to ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      socket.current = ws;
      setStatus('CONNECTING');

      ws.onopen = () => {
        console.log('[WebSocket] Connection established');
        setStatus('OPEN');
        reconnectCountRef.current = 0;
        if (onOpen) onOpen();
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          if (onMessage) onMessage(parsedData);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
          setData(event.data);
          if (onMessage) onMessage(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        if (onError) onError(error);
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed (${event.code}): ${event.reason}`);
        setStatus('CLOSED');
        
        if (onClose) onClose();

        // Attempt to reconnect if enabled and not a normal closure
        if (shouldReconnect && event.code !== 1000) {
          if (reconnectCountRef.current < reconnectAttempts) {
            setStatus('RECONNECTING');
            reconnectCountRef.current += 1;
            
            reconnectTimeoutRef.current = window.setTimeout(() => {
              console.log(`[WebSocket] Reconnecting (${reconnectCountRef.current}/${reconnectAttempts})...`);
              connect();
            }, reconnectInterval);
          } else {
            console.log('[WebSocket] Max reconnect attempts reached');
          }
        }
      };
    } catch (error) {
      console.error('[WebSocket] Setup error:', error);
    }
  }, [url, onOpen, onMessage, onClose, onError, shouldReconnect, reconnectAttempts, reconnectInterval, cleanup]);

  // Send message to WebSocket
  const sendMessage = useCallback((data: string | object) => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socket.current.send(message);
      return true;
    }
    console.warn('[WebSocket] Cannot send message - connection not open');
    return false;
  }, []);

  // Initial connect
  useEffect(() => {
    let isSubscribed = true;

    const initializeWebSocket = async () => {
      if (typeof window !== 'undefined' && url && !socket.current && isSubscribed) {
        cleanup(); // Limpiar conexión existente si hay
        await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña pausa
        connect();
      }
    };

    initializeWebSocket();
    
    return () => {
      isSubscribed = false;
      cleanup();
    };
  }, [url]);
  
  // Reconectar si la pestaña vuelve a tener foco
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && socket.current?.readyState !== WebSocket.OPEN) {
          console.log('[WebSocket] Page became visible again, reconnecting...');
          connect();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [connect]);

  return {
    status,
    data,
    sendMessage,
    reconnect: connect,
    disconnect: cleanup,
    isConnecting: status === 'CONNECTING' || status === 'RECONNECTING',
    isConnected: status === 'OPEN'
  };
};