import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook useLongPress
 * @param {Function} callback - Hàm được gọi khi nhấn giữ thành công
 * @param {number} ms - Thời gian nhấn giữ (mặc định 600ms)
 * @returns {Object} - Các event handlers
 */
const useLongPress = (callback, ms = 600) => {
  const [startLongPress, setStartLongPress] = useState(false);
  const timerRef = useRef();

  const start = useCallback((event) => {
    // Ngăn chặn context menu mặc định trên di động
    setStartLongPress(true);
    timerRef.current = setTimeout(() => {
      callback(event);
      setStartLongPress(false);
    }, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    setStartLongPress(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
};

export default useLongPress;
