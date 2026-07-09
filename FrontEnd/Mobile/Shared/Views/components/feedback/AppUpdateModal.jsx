import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Loader2, CheckCircle2 } from 'lucide-react';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import apiClient, { API_ROOT } from '@shared/services/api';

// Version được nhúng bởi Vite lúc build - luôn chính xác 100%
// eslint-disable-next-line no-undef
const BUILT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

const AppUpdateModal = () => {
    const [updateInfo, setUpdateInfo] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [currentVersion, setCurrentVersion] = useState(BUILT_VERSION);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState(''); // 'downloading', 'completed', 'error'

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const resp = await apiClient.get('/system/app-version');
                const latest = resp.data;
                
                if (isNewerVersion(latest.version, BUILT_VERSION)) {
                    setUpdateInfo(latest);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error('Lỗi kiểm tra phiên bản:', err);
            }
        };

        checkVersion();
    }, []);

    const isNewerVersion = (latest, current) => {
        const l = latest.split('.').map(Number);
        const c = current.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if (l[i] > c[i]) return true;
            if (l[i] < c[i]) return false;
        }
        return false;
    };

    const handleUpdate = async () => {
        if (isDownloading) return;
        
        if (updateInfo?.download_url) {
            let fullUrl = updateInfo.download_url;
            if (fullUrl.startsWith('/')) {
                const base = API_ROOT.replace(/\/$/, '');
                fullUrl = `${base}${fullUrl}`;
            }

            // Thêm skip warning của ngrok
            if (fullUrl.includes('?')) {
                fullUrl += '&ngrok-skip-browser-warning=1';
            } else {
                fullUrl += '?ngrok-skip-browser-warning=1';
            }

            try {
                setIsDownloading(true);
                setDownloadStatus('downloading');
                setDownloadProgress(0);

                const fileName = `SmartFlow_v${updateInfo.version}.apk`;
                
                // Tải file dùng Filesystem
                const downloadResult = await Filesystem.downloadFile({
                    url: fullUrl,
                    path: fileName,
                    directory: Directory.Data, // Lưu vào thư mục dữ liệu nội bộ của App
                    progress: true
                });

                setDownloadProgress(100);
                setDownloadStatus('completed');

                // Mở file để cài đặt
                await FileOpener.open({
                    filePath: downloadResult.path,
                    contentType: 'application/vnd.android.package-archive',
                });

                // Nếu cài đặt thành công, app sẽ bị đóng hoặc khởi động lại bởi hệ thống
            } catch (error) {
                console.error('Lỗi tải/cài đặt app:', error);
                setDownloadStatus('error');
                setIsDownloading(false);
                alert('Có lỗi xảy ra khi tải bản cập nhật. Vui lòng thử lại hoặc tải thủ công.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '340px',
                padding: '28px 20px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                position: 'relative',
                textAlign: 'center'
            }}>
                {/* Close Button (only if not forced and not downloading) */}
                {!updateInfo?.force_update && !isDownloading && (
                    <button 
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'absolute',
                            top: '16px', right: '16px',
                            border: 'none', background: '#f1f5f9',
                            borderRadius: '50%', padding: '6px',
                            color: '#64748b'
                        }}
                    >
                        <X size={18} />
                    </button>
                )}

                <div style={{
                    width: '64px', height: '64px',
                    backgroundColor: isDownloading ? '#f0fdf4' : '#eff6ff',
                    borderRadius: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    color: isDownloading ? '#22c55e' : '#3b82f6'
                }}>
                    {isDownloading ? (
                        <Download size={32} className="animate-bounce" />
                    ) : (
                        <RefreshCw size={32} />
                    )}
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                    {isDownloading ? 'Đang tải bản cập nhật...' : `Phiên bản mới ${updateInfo?.version}`}
                </h2>
                
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5', marginBottom: '20px' }}>
                    {isDownloading 
                        ? 'Vui lòng không đóng ứng dụng trong khi đang tải xuống.' 
                        : (updateInfo?.release_notes || 'Ứng dụng đã có bản cập nhật mới. Vui lòng nâng cấp để trải nghiệm tính năng mới nhất.')}
                </p>

                {isDownloading ? (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ 
                            height: '10px', 
                            width: '100%', 
                            backgroundColor: '#f1f5f9', 
                            borderRadius: '10px',
                            overflow: 'hidden',
                            marginBottom: '10px'
                        }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${downloadProgress || 10}%`, 
                                backgroundColor: '#22c55e',
                                transition: 'width 0.3s ease',
                                borderRadius: '10px'
                            }} />
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#16a34a' }}>
                            Đang xử lý... (Vui lòng đợi)
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '24px',
                            textAlign: 'left'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Phiên bản hiện tại
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
                                v{currentVersion}
                            </div>
                        </div>

                        <button
                            onClick={handleUpdate}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '1rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={20} /> Cập nhật ngay
                        </button>
                    </>
                )}

                {!isDownloading && (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '15px' }}>
                        Quá trình tải về và cài đặt sẽ diễn ra tự động.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppUpdateModal;
