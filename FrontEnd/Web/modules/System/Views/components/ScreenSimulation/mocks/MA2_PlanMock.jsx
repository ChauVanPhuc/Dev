import React, { useState, useRef } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import { Upload, X, Check, AlertCircle, FileText, Plus, Search, Filter, FileSpreadsheet } from 'lucide-react';
import { planService } from '@modules/Plan/Models/plan.service';
import '../Simulation.css';

export const MA2_PlanMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = [],
  startGlobalUpload,
  onRefresh
}) => {
  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  // State management for upload functionality
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    file: null,
    preview: null
  });

  // State management for add plan modal
  const [addModalState, setAddModalState] = useState({
    isOpen: false,
    data: { name: '', year: '', month: '', description: '' },
    isSubmitting: false
  });

  // State for notifications
  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState('');

  // Refs for file input
  const fileInputRef = useRef(null);

  // Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadState(prev => ({
        ...prev,
        file,
        preview: file.name
      }));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!uploadState.file) return;

    setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));

    try {
      if (startGlobalUpload) {
        // Use real API upload
        await startGlobalUpload(
          uploadState.file,
          '/production-plans/import',
          () => {
            setUploadState({ isUploading: false, progress: 0, file: null, preview: null });
            showNotification('success', 'Upload file thành công!');
            if (onRefresh) onRefresh();
          }
        );
      } else {
        // Fallback to simulation
        const progressInterval = setInterval(() => {
          setUploadState(prev => {
            if (prev.progress >= 100) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, progress: prev.progress + 10 };
          });
        }, 200);

        setTimeout(() => {
          clearInterval(progressInterval);
          setUploadState(prev => ({ ...prev, isUploading: false, progress: 100 }));
          showNotification('success', 'Upload file thành công (simulation)!');
        }, 2000);
      }
    } catch (error) {
      setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
      showNotification('error', 'Upload file thất bại: ' + error.message);
    }
  };

  const handleAddPlanClick = () => {
    setAddModalState(prev => ({ ...prev, isOpen: true }));
  };

  const handleAddPlanSubmit = async (e) => {
    e.preventDefault();
    setAddModalState(prev => ({ ...prev, isSubmitting: true }));

    try {
      if (planService) {
        // Use real API to create plan
        const planData = {
          name: addModalState.data.name,
          year: parseInt(addModalState.data.year),
          month: parseInt(addModalState.data.month),
          description: addModalState.data.description
        };

        await planService.createPlan(planData);

        setAddModalState(prev => ({
          ...prev,
          isOpen: false,
          isSubmitting: false,
          data: { name: '', year: '', month: '', description: '' }
        }));
        showNotification('success', 'Tạo kế hoạch thành công!');
        if (onRefresh) onRefresh();
      } else {
        // Fallback to simulation
        setTimeout(() => {
          setAddModalState(prev => ({
            ...prev,
            isOpen: false,
            isSubmitting: false,
            data: { name: '', year: '', month: '', description: '' }
          }));
          showNotification('success', 'Tạo kế hoạch thành công (simulation)!');
        }, 1500);
      }
    } catch (error) {
      setAddModalState(prev => ({ ...prev, isSubmitting: false }));
      showNotification('error', 'Tạo kế hoạch thất bại: ' + error.message);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  return (
    <div className="mock-plan-layout" style={{ background: '#FAF6F0', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'system-ui, -apple-system, sans-serif', textAlign: 'left' }}>
      
      {/* 1. Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#2D1A12' }}>Kế hoạch sản xuất</h2>
          <span style={{ fontSize: '0.75rem', color: '#8C6239' }}>MA2 - Quản lý lệnh sản xuất</span>
        </div>
      </div>

      {/* 2. Four Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: '16px 20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(74,46,32,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8C6239', letterSpacing: '0.5px', marginBottom: 6 }}>TỔNG SỐ KẾ HOẠCH</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4D331F' }}>2 KH</div>
        </div>
        <div style={{ background: '#FFFDF9', border: '1px solid #F3E5D8', borderRadius: 8, padding: '16px 20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(74,46,32,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D48743', letterSpacing: '0.5px', marginBottom: 6 }}>ĐANG SẢN XUẤT</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D48743' }}>1 KH</div>
        </div>
        <div style={{ background: '#F4FAF6', border: '1px solid #D5EBE1', borderRadius: 8, padding: '16px 20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(74,46,32,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2E7D32', letterSpacing: '0.5px', marginBottom: 6 }}>ĐÃ HOÀN THÀNH</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2E7D32' }}>0 KH</div>
        </div>
        <div style={{ background: '#FFF8F8', border: '1px solid #FADBD8', borderRadius: 8, padding: '16px 20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(74,46,32,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C62828', letterSpacing: '0.5px', marginBottom: 6 }}>QUÁ HẠN</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C62828' }}>1 KH</div>
        </div>
      </div>

      {/* 3. Control / Search & Action Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        
        {/* Left side: Search and Filter/Sort wrapper (PlanFilter) */}
        <InteractiveBlock
          name="PlanFilter"
          type={getCompType('PlanFilter')}
          description={getCompDesc('PlanFilter')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search Input Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFFFFF',
              border: '1px solid #EADCC9',
              borderRadius: 10,
              padding: '0 12px',
              height: 42,
              width: 300,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <Search size={18} color="#64748B" />
              <input
                type="text"
                placeholder="Tìm kiếm mã Lệnh, sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.85rem',
                  flex: 1,
                  background: 'transparent',
                  color: '#334155'
                }}
              />
            </div>

            {/* Filter button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyCenter: 'center',
              background: '#FFFFFF',
              border: '1px solid #EADCC9',
              borderRadius: 10,
              width: 42,
              height: 42,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <Filter size={18} color="#64748B" />
            </div>

            {/* + Thêm kế hoạch button */}
            <div
              onClick={handleAddPlanClick}
              style={{
                background: '#5C3A21',
                color: '#FFFFFF',
                fontWeight: 700,
                padding: '0 16px',
                height: 42,
                borderRadius: 10,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(92, 58, 33, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(92, 58, 33, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(92, 58, 33, 0.2)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(1px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
            >
              <Plus size={15} style={{ marginRight: 6 }} />
              Thêm Kế hoạch
            </div>
          </div>
        </InteractiveBlock>

        {/* Right side: Import (PlanImportButton) and Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* PlanImportButton */}
          <InteractiveBlock
            name="PlanImportButton"
            type={getCompType('PlanImportButton')}
            description={getCompDesc('PlanImportButton')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div
              onClick={handleUploadClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid #EADCC9',
                borderRadius: 10,
                padding: '0 14px',
                height: 42,
                background: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#4A2E20',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#D4A574';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#EADCC9';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(1px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
            >
              <Upload size={15} />
              Nhập Excel
            </div>
          </InteractiveBlock>

          {/* Export Excel button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid #EADCC9',
              borderRadius: 10,
              padding: '0 14px',
              height: 42,
              background: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#4A2E20',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = '#D4A574';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = '#EADCC9';
            }}
          >
            <FileSpreadsheet size={15} />
            Xuất Excel
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
      />

      {/* File Preview Panel */}
      {uploadState.file && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #EADCC9',
          borderRadius: 8,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: 48,
            height: 48,
            background: '#F5F5F5',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={24} color="#8C6239" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#4A2E20', fontSize: '0.85rem' }}>
              {uploadState.preview}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8C6239', marginTop: 2 }}>
              {(uploadState.file.size / 1024).toFixed(2)} KB
            </div>
          </div>
          <button
            onClick={() => setUploadState({ isUploading: false, progress: 0, file: null, preview: null })}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid #EADCC9',
              background: '#FFF5F5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#FFE0E0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#FFF5F5'}
          >
            <X size={16} color="#C62828" />
          </button>
          <button
            onClick={handleUpload}
            disabled={uploadState.isUploading}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: uploadState.isUploading ? '#E0E0E0' : '#5C3A21',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: uploadState.isUploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {uploadState.isUploading ? 'Đang upload...' : 'Upload'}
          </button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadState.isUploading && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #EADCC9',
          borderRadius: 8,
          padding: '12px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4A2E20' }}>
              Đang upload file...
            </span>
            <span style={{ fontSize: '0.8rem', color: '#8C6239' }}>
              {uploadState.progress}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: 8,
            background: '#F5F5F5',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${uploadState.progress}%`,
              height: '100%',
              background: '#5C3A21',
              borderRadius: 4,
              transition: 'width 0.2s ease'
            }} />
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {addModalState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '24px',
            width: '90%',
            maxWidth: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#2D1A12' }}>
                Tạo Kế Hoạch Mới
              </h3>
              <button
                onClick={() => setAddModalState(prev => ({ ...prev, isOpen: false }))}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: '1px solid #EADCC9',
                  background: '#F5F5F5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} color="#8C6239" />
              </button>
            </div>

            <form onSubmit={handleAddPlanSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4A2E20', marginBottom: 6 }}>
                  Tên kế hoạch *
                </label>
                <input
                  type="text"
                  value={addModalState.data.name}
                  onChange={(e) => setAddModalState(prev => ({
                    ...prev,
                    data: { ...prev.data, name: e.target.value }
                  }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #EADCC9',
                    borderRadius: 6,
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  placeholder="Nhập tên kế hoạch"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4A2E20', marginBottom: 6 }}>
                    Năm *
                  </label>
                  <input
                    type="number"
                    value={addModalState.data.year}
                    onChange={(e) => setAddModalState(prev => ({
                      ...prev,
                      data: { ...prev.data, year: e.target.value }
                    }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #EADCC9',
                      borderRadius: 6,
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    placeholder="2026"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4A2E20', marginBottom: 6 }}>
                    Tháng *
                  </label>
                  <input
                    type="number"
                    value={addModalState.data.month}
                    onChange={(e) => setAddModalState(prev => ({
                      ...prev,
                      data: { ...prev.data, month: e.target.value }
                    }))}
                    required
                    min="1"
                    max="12"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #EADCC9',
                      borderRadius: 6,
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    placeholder="5"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4A2E20', marginBottom: 6 }}>
                  Mô tả
                </label>
                <textarea
                  value={addModalState.data.description}
                  onChange={(e) => setAddModalState(prev => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #EADCC9',
                    borderRadius: 6,
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  placeholder="Mô tả kế hoạch sản xuất..."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAddModalState(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: '1px solid #EADCC9',
                    background: '#FFFFFF',
                    color: '#4A2E20',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addModalState.isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: addModalState.isSubmitting ? '#E0E0E0' : '#5C3A21',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: addModalState.isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {addModalState.isSubmitting ? 'Đang tạo...' : 'Tạo kế hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: notification.type === 'success' ? '#E8F5E9' : '#FFF5F5',
          border: `1px solid ${notification.type === 'success' ? '#BBF7D0' : '#FADBD8'}`,
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1001,
          animation: 'slideIn 0.3s ease'
        }}>
          {notification.type === 'success' ? (
            <Check size={20} color="#2E7D32" />
          ) : (
            <AlertCircle size={20} color="#C62828" />
          )}
          <span style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: notification.type === 'success' ? '#2E7D32' : '#C62828'
          }}>
            {notification.message}
          </span>
        </div>
      )}

      {/* 4. Table & Pagination Card (PlanTable) */}
      <InteractiveBlock
        name="PlanTable"
        type={getCompType('PlanTable')}
        description={getCompDesc('PlanTable')}
        activeComponent={activeComponent}
        hoveredComponent={hoveredComponent}
        onHover={onHover}
        onClick={onClick}
      >
        <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, overflow: 'hidden' }}>
          {/* Plan list table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#8C6239', width: 60 }}>STT</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#8C6239' }}>KHSX</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#8C6239' }}>ĐƠN HÀNG</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#8C6239' }}>SẢN PHẨM</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#8C6239', width: 100 }}>SL</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#8C6239', width: 120 }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #F5EFE6' }}>
                <td style={{ padding: '12px 16px', color: '#8C6239' }}>1</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4A2E20' }}>📄 KHSX T5 - 2026</td>
                <td style={{ padding: '12px 16px', color: '#606060' }}>293 Đơn hàng</td>
                <td style={{ padding: '12px 16px', color: '#606060' }}>544 Sản phẩm</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4A2E20' }}>28552</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'inline-block', background: '#E3F2FD', color: '#1E88E5', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: '0.62rem' }}>
                    Đang sản xuất
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px 16px', color: '#8C6239' }}>2</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4A2E20' }}>📄 KHSX T4 - 2026</td>
                <td style={{ padding: '12px 16px', color: '#606060' }}>327 Đơn hàng</td>
                <td style={{ padding: '12px 16px', color: '#606060' }}>813 Sản phẩm</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4A2E20' }}>74162</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'inline-block', background: '#FFEBEE', color: '#E53935', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: '0.62rem' }}>
                    Quá hạn
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div style={{ background: '#FAF6F0', borderTop: '1px solid #EADCC9', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.68rem', color: '#8C6239' }}>
              <span style={{ fontWeight: 700 }}>Tổng cộng (2 Kế hoạch)</span>
              <span style={{ marginLeft: 10 }}>Trang 1 trên 1</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled style={{ border: '1px solid #EADCC9', background: '#FFFFFF', borderRadius: 4, padding: '3px 10px', fontSize: '0.68rem', color: '#A0A0A0', cursor: 'not-allowed' }}>Trước</button>
              <button style={{ border: '1px solid #7B5233', background: '#7B5233', borderRadius: 4, padding: '3px 10px', fontSize: '0.68rem', color: '#FFFFFF', fontWeight: 700 }}>1</button>
              <button disabled style={{ border: '1px solid #EADCC9', background: '#FFFFFF', borderRadius: 4, padding: '3px 10px', fontSize: '0.68rem', color: '#A0A0A0', cursor: 'not-allowed' }}>Tiếp</button>
            </div>
          </div>
        </div>
      </InteractiveBlock>

    </div>
  );
};

export default MA2_PlanMock;
