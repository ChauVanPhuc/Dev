/**
 * File: NotificationController.jsx
 * Tự động comment: File này thuộc mô hình dự án, phụ trách NotificationController.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import ActionConfirmModal from '@mobile/Shared/Views/components/ui/ActionConfirmModal';
import Toast from '@mobile/Shared/Views/components/ui/Toast';

const NotificationContext = createContext();

/**
 * Hàm useNotification
 * Xử lý tác vụ, sự kiện tương ứng.
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

/**
 * Component NotificationProvider
 * Quản lý giao diện và xử lý logic cho NotificationProvider.
 * @returns {JSX.Element}
 */
export const NotificationProvider = ({ children }) => {
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  const [modal, setModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'confirm', 
    onConfirm: null,
    confirmText: '',
    cancelText: ''
  });

  const notify = useCallback((message, type = 'success') => {
    setToast({ isVisible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  const confirm = useCallback((title, message, onConfirm, type = 'confirm', confirmText = '', cancelText = '') => {
    setModal({ isOpen: true, title, message, type, onConfirm, confirmText, cancelText });
  }, []);

  const hideModal = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Hàm handleModalConfirm
   * Xử lý tác vụ, sự kiện tương ứng.
   */
  const handleModalConfirm = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
      notify('Thao tác đã được xác nhận thành công!', 'success');
    }
    hideModal();
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* Global Toast */}
      <Toast 
        isVisible={toast.isVisible} 
        onClose={hideToast} 
        message={toast.message} 
        type={toast.type} 
      />

      {/* Global Modal */}
      <ActionConfirmModal
        isOpen={modal.isOpen}
        onClose={hideModal}
        onAction={handleModalConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
    </NotificationContext.Provider>
  );
};
