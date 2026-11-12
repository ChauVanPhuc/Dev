import { useState, useCallback } from 'react';

/**
 * Hook quản lý trạng thái chung cho phân hệ Quản lý Kho
 */
export const useWarehouse = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    setLoading,
    setError,
    resetState
  };
};

export default useWarehouse;
