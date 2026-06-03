import { useEffect, useRef, useCallback } from 'react';

import useAuthStore from '@modules/auth/Models/authModel';



/**

 * Custom Hook quản lý kết nối WebSocket Realtime.

 * @param {Function} onMessage Callback khi nhận được tin nhắn từ server.

 */

export const useWebSocket = (onMessage) => {

  const { user } = useAuthStore();

  const socketRef = useRef(null); // Lưu trữ instance của WebSocket

  const reconnectTimerRef = useRef(null); // Timer để quản lý việc kết nối lại tự động

  const onMessageRef = useRef(onMessage); // Sử dụng ref cho callback để tránh reconnect loop khi component re-render



  // Cập nhật ref mỗi khi callback thay đổi mà không ngắt kết nối WebSocket

  useEffect(() => {

    onMessageRef.current = onMessage;

  }, [onMessage]);



  const connect = useCallback(() => {

    if (!user?.id) return;

    

    // Kiểm tra nếu đang có kết nối sẵn (đang mở hoặc đang kết nối) thì không tạo mới

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {

        return;

    }



    // Tự động tính toán WebSocket URL
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    let wsBase;
    if (port === '3000' || port === '5173' || hostname === 'localhost' || hostname.startsWith('192.168.')) {
      wsBase = `ws://${hostname}:8000`;
    } else if (hostname.includes('smartflowg7.cloud')) {
      wsBase = `wss://${hostname}`;
    } else {
      wsBase = `wss://smartflowg7.cloud`;
    }
    
    const socketUrl = `${wsBase}/ws/${user.id}`;

    

    let ws;

    try {

      ws = new WebSocket(socketUrl);

    } catch (err) {

      console.error('[WS] Connection error:', err);

      return;

    }



    ws.onopen = () => {

      console.log('[WS] Connected');

      if (reconnectTimerRef.current) {

        clearTimeout(reconnectTimerRef.current);

        reconnectTimerRef.current = null;

      }

    };



    ws.onmessage = (event) => {

      try {

        const data = JSON.parse(event.data);

        // Gọi callback từ Ref để lấy logic mới nhất từ phía màn hình

        if (onMessageRef.current) onMessageRef.current(data);

      } catch (err) {

        console.error('[WS] Parse error:', err);

      }

    };



    ws.onclose = (e) => {

      // Chỉ tự động kết nối lại nếu kết nối bị đóng không phải do component bị Unmount

      if (socketRef.current === ws) {

          console.log('[WS] Disconnected, retrying in 5s...');

          reconnectTimerRef.current = setTimeout(() => {

            connect();

          }, 5000);

      }

    };



    ws.onerror = (err) => {

      ws.close();

    };



    socketRef.current = ws;

  }, [user?.id]); // Chỉ phụ thuộc vào user.id



  useEffect(() => {

    connect();

    return () => {

      const socket = socketRef.current;

      socketRef.current = null; // Đánh dấu là đã unmount

      if (socket) socket.close();

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

    };

  }, [connect]);



  return socketRef.current;

};

