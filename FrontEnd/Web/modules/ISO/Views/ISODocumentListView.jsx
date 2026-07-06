import React, { useState, useEffect, useMemo } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Search, Filter, Upload, FileText, Download, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import '@styles/components.css';

const ISODocumentListView = ({ mode = 'documents' }) => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Custom confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    id: null,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    setCustomTitle('G7 - Smart Flow');
    if (mode === 'processes') {
      setCustomSubtitle('Quản lý & Thiết lập quy trình ISO');
      setCustomScreenCode('ISO-PROCS');
    } else {
      setCustomSubtitle('Quản lý hồ sơ tài liệu ISO');
      setCustomScreenCode('ISO-DOCS');
    }
    fetchDocuments();
  }, [mode]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/iso-documents/');
      setDocuments(data || []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách hồ sơ ISO:', error);
      showFeedback('error', 'Không thể kết nối đến máy chủ để tải danh sách quy trình');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 4000);
  };

  // Xử lý upload file Word .docx
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.docx)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadLoading(true);
    showFeedback('info', 'Đang tải lên và phân tích tài liệu quy trình...');

    try {
      // Gọi API upload để parse dữ liệu bằng Axios
      const parsedData = await api.post('/iso-documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Chuyển hướng sang màn hình form editor kèm dữ liệu phân tích được truyền qua state
      navigate('/admin/iso-documents/edit/new', { state: { parsedData, fromProcesses: mode === 'processes' } });

    } catch (error) {
      console.error('Lỗi khi tải lên file:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Lỗi khi upload tệp quy trình ISO';
      showFeedback('error', errMsg);
    } finally {
      setUploadLoading(false);
      e.target.value = ''; // Reset input file
    }
  };

  // Xử lý xoá tài liệu quy trình
  const handleDeleteDoc = (id, code, name) => {
    setConfirmModal({
      show: true,
      id,
      title: 'Xác nhận xoá tài liệu ISO',
      message: `Bạn có chắc chắn muốn xoá quy trình '${code} - ${name}' cùng toàn bộ lưu đồ và thiết lập checklist liên quan?`,
      onConfirm: async () => {
        try {
          await api.delete(`/iso-documents/${id}`);
          showFeedback('success', `Đã xoá quy trình ${code} thành công!`);
          fetchDocuments();
        } catch (error) {
          console.error('Lỗi khi xoá quy trình:', error);
          showFeedback('error', 'Không thể xoá quy trình này');
        }
        setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null });
      }
    });
  };

  // Lọc danh sách tài liệu
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = 
        (doc.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.issuer || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === '' || doc.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [documents, searchTerm, statusFilter]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Alert Thông báo phản hồi */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: message.type === 'success' ? '#e6f4ea' : message.type === 'error' ? '#fce8e6' : '#e8f0fe',
          color: message.type === 'success' ? '#137333' : message.type === 'error' ? '#c5221f' : '#1a73e8',
          border: `1px solid ${message.type === 'success' ? '#137333' : message.type === 'error' ? '#c5221f' : '#1a73e8'}`,
          transition: 'all 0.3s ease'
        }}>
          <AlertCircle size={18} />
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. Bộ điều khiển hành động và bộ lọc */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #EADCC9',
        boxShadow: '0 4px 12px rgba(45, 26, 18, 0.03)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        
        {/* Tìm kiếm & Lọc */}
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} />
            <input
              type="text"
              placeholder="Tìm theo mã, tên hoặc người ban hành..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #7B5233',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ position: 'relative', width: '150px' }}>
            <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 8px 8px 30px',
                borderRadius: '8px',
                border: '1px solid #7B5233',
                fontSize: '0.88rem',
                backgroundColor: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Hiệu lực">Hiệu lực</option>
              <option value="Hết hiệu lực">Hết hiệu lực</option>
              <option value="Dự thảo">Dự thảo</option>
            </select>
          </div>
        </div>

        {/* Nút Tạo mới & Upload */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/admin/iso-documents/edit/new', { state: { fromProcesses: mode === 'processes' } })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FAF6F0',
              color: '#7B5233',
              border: '1px solid #7B5233',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
          >
            <Plus size={16} /> {mode === 'processes' ? 'Tạo quy trình mới' : 'Tạo form trống'}
          </button>

          {mode === 'documents' && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#7B5233',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 'bold',
                cursor: uploadLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 10px rgba(123, 82, 51, 0.25)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => !uploadLoading && (e.currentTarget.style.backgroundColor = '#5D3E26')}
              onMouseLeave={(e) => !uploadLoading && (e.currentTarget.style.backgroundColor = '#7B5233')}
            >
              <Upload size={16} /> {uploadLoading ? 'Đang phân tích...' : 'Upload File Word (.docx)'}
              <input
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      {/* 2. Bảng Danh sách Quy trình ISO */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #EADCC9',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw className="animate-spin" size={28} />
            <span style={{ fontWeight: '600' }}>Đang tải danh sách hồ sơ ISO...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#a0a0a0' }}>
            <FileText size={48} style={{ margin: '0 auto 16px auto', color: '#d0d0d0' }} />
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>Không tìm thấy tài liệu ISO quy trình nào</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Vui lòng nhấn tải lên file Word hoặc thêm mới để bắt đầu cấu hình</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '50px' }}>STT</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '120px' }}>MÃ QUY TRÌNH</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>TÊN QUY TRÌNH</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '100px', textAlign: 'center' }}>PHIÊN BẢN</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '120px' }}>NGÀY BAN HÀNH</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '150px' }}>NGƯỜI BIÊN SOẠN</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '100px', textAlign: 'center' }}>ĐÍNH KÈM</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '100px', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, index) => (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.2s',
                      backgroundColor: index % 2 === 1 ? '#fdfcfb' : 'white'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 1 ? '#fdfcfb' : 'white'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>{index + 1}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>{doc.code}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>{doc.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', textAlign: 'center', fontWeight: '500' }}>{doc.version}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>{doc.issue_date}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', fontWeight: '500' }}>{doc.issuer || '---'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {doc.file_path ? (
                        <a
                          href={`${api.defaults.baseURL.replace('/api/v1', '')}/${doc.file_path}`}
                          download
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#7B5233', display: 'inline-flex', padding: '4px', borderRadius: '4px', backgroundColor: '#FAF6F0', cursor: 'pointer' }}
                        >
                          <Download size={14} />
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>Không có</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: doc.status === 'Hiệu lực' ? '#e6f4ea' : doc.status === 'Dự thảo' ? '#fff7ed' : '#f1f5f9',
                        color: doc.status === 'Hiệu lực' ? '#137333' : doc.status === 'Dự thảo' ? '#c2410c' : '#64748b',
                        border: `1px solid ${doc.status === 'Hiệu lực' ? '#137333' : doc.status === 'Dự thảo' ? '#c2410c' : '#cbd5e1'}`
                      }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => navigate(`/admin/iso-documents/edit/${doc.id}`, { state: { fromProcesses: mode === 'processes' } })}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#1a73e8',
                            padding: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={mode === 'processes' ? "Thiết lập quy trình & Lưu đồ" : "Tùy chỉnh form quy trình"}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id, doc.code, doc.name)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#d93025',
                            padding: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Xóa quy trình"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Confirm Modal xoá tài liệu */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '100%',
            margin: '20px',
            boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
            border: '1px solid #EADCC9'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#7B5233', fontWeight: 'bold' }}>{confirmModal.title}</h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.45' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#d93025',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ISODocumentListView;
