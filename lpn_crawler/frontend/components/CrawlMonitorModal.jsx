import React, { useState, useEffect, useRef } from 'react';
import { Minus, Maximize2, Minimize2, Pause, Play, Square } from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';

export const CrawlMonitorModal = ({
  currentJob,
  progressData,
  liveLogs = [],
  onStopCrawl,
  onClose
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (progressData?.current_status === 'PAUSED') {
      setIsPaused(true);
    } else if (progressData?.current_status === 'CRAWLING' || progressData?.current_status === 'DONE') {
      setIsPaused(false);
    }
  }, [progressData?.current_status]);

  const handlePauseResume = async () => {
    if (!currentJob || !currentJob.id) return;
    const nextState = !isPaused;
    setIsPaused(nextState);
    try {
      if (nextState) {
        await lpnCrawlerApi.pauseCrawlJob(currentJob.id);
      } else {
        await lpnCrawlerApi.resumeCrawlJob(currentJob.id);
      }
    } catch (e) {
      console.error('Pause/Resume error:', e);
      setIsPaused(!nextState);
    }
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs]);

  const [countdownEta, setCountdownEta] = useState(null);

  useEffect(() => {
    if (progressData?.eta_seconds !== undefined && progressData?.eta_seconds !== null) {
      setCountdownEta(progressData.eta_seconds);
    }
  }, [progressData?.eta_seconds]);

  useEffect(() => {
    if (countdownEta === null || isPaused) return;
    const timer = setInterval(() => {
      setCountdownEta((prev) => {
        if (prev === null) return null;
        const isDone = (progressData?.percent || 0) >= 100 || progressData?.current_status === 'COMPLETED' || currentJob?.status === 'completed';
        if (isDone) return 0;
        return prev > 5 ? prev - 1 : 5;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownEta, isPaused, progressData?.percent, progressData?.current_status, currentJob?.status]);

  const percent = progressData?.percent || 0;
  const currentContainer = progressData?.current_container || '—';
  const currentAction = progressData?.current_action || (currentJob?.status === 'failed' ? `Job thất bại: ${currentJob.error_message || ''}` : '');
  const processed = progressData?.processed || currentJob?.containers_processed || 0;
  const total = progressData?.total || currentJob?.total_containers_found || 0;
  const itemsCount = progressData?.items_crawled || currentJob?.total_items_crawled || 0;
  const imagesCount = progressData?.images_downloaded || currentJob?.total_images_downloaded || 0;
  const skuCount = progressData?.sku_crawled || 0;
  const elapsedSec = progressData?.elapsed_seconds || 0;
  const etaSec = countdownEta !== null ? countdownEta : progressData?.eta_seconds;
  const speedStr = progressData?.speed_str || '—';
  const crawlMode = progressData?.crawl_mode || 'Fast-Path API';

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${s}s`;
  };

  const isFailed = currentJob?.status === 'failed' || progressData?.current_status === 'FAILED';
  const isCompleted = currentJob?.status === 'completed' || currentJob?.status === 'completed_with_errors' || progressData?.current_status === 'COMPLETED' || progressData?.current_status === 'DONE' || (progressData?.percent || 0) >= 100;

  // Expanded Floating Modal Window
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: isFullscreen ? '0' : '14px',
          width: isFullscreen ? '100vw' : '1100px',
          maxWidth: isFullscreen ? '100vw' : '1260px',
          height: isFullscreen ? '100vh' : '88vh',
          maxHeight: isFullscreen ? '100vh' : '88vh',
          boxShadow: '0 16px 48px rgba(123, 82, 51, 0.3)',
          border: '1px solid #EADCC9',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#FAF6F0',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Terminal size={20} color="#7B5233" />
            <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#2D1A12' }}>
              Tiến Trình Crawl AppSheet
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isCompleted && !isFailed && (
              <>
                <button
                  type="button"
                  onClick={handlePauseResume}
                  style={{
                    padding: '5px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '6px',
                    border: isPaused ? '1px solid #16A34A' : '1px solid #F59E0B',
                    backgroundColor: isPaused ? '#DCFCE7' : '#FFFBEB',
                    color: isPaused ? '#15803D' : '#B45309', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title={isPaused ? "Tiếp tục tiến trình" : "Tạm dừng tiến trình"}
                >
                  {isPaused ? 'Tiếp Tục' : 'Tạm Dừng'}
                </button>
                <button
                  type="button"
                  onClick={onStopCrawl}
                  style={{
                    padding: '5px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '6px',
                    border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2',
                    color: '#DC2626', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Dừng hoàn toàn tiến trình cào"
                >
                  Dừng Tiến Trình
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer',
                color: '#4E3629', display: 'flex', alignItems: 'center', borderRadius: '4px'
              }}
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Mở rộng toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer',
                color: '#8D6E63', display: 'flex', alignItems: 'center', borderRadius: '4px'
              }}
              title="Đóng cửa sổ giám sát (tiến trình vẫn tiếp tục chạy ngầm)"
            >
              <Minus size={19} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* Progress Overview Card */}
          <div style={{
            backgroundColor: '#FAF6F0',
            border: '1px solid #EADCC9',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#4E3629' }}>
                  Tiến độ tổng thể:
                </span>
                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#7B5233' }}>
                  {percent}%
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#666', fontWeight: '600' }}>
                {isCompleted ? (
                  <span style={{ color: '#15803D', fontWeight: '700' }}>Đã hoàn tất tất cả Container</span>
                ) : isFailed ? (
                  <span style={{ color: '#DC2626', fontWeight: '700' }}>Job dừng do lỗi</span>
                ) : isPaused ? (
                  <span>Tạm dừng tại Container: <span style={{ fontWeight: '800', color: '#2D1A12' }}>{currentContainer}</span></span>
                ) : (
                  <>Đang xử lý Container: <span style={{ fontWeight: '800', color: '#2D1A12' }}>{currentContainer}</span></>
                )}
              </div>
            </div>

            <div style={{
              width: '100%',
              height: '10px',
              backgroundColor: '#EADCC9',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${percent}%`,
                height: '100%',
                backgroundColor: isFailed ? '#DC2626' : isPaused ? '#F59E0B' : '#7B5233',
                transition: 'width 0.4s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63' }}>
              <span style={{ fontStyle: 'italic', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentAction || 'Đang sẵn sàng...'}
              </span>
              <span>{Number(processed || 0).toLocaleString()} / {Number(total || 0).toLocaleString()} Container</span>
            </div>
          </div>

          {/* Quick Metrics Grid - Căng đều 6 cột, chống tràn & chống rớt dòng */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: '8px',
            backgroundColor: '#FAF6F0',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #EADCC9',
            flexShrink: 0
          }}>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Đã Quét:</span>
              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{Number(processed || 0).toLocaleString()} / {Number(total || 0).toLocaleString()}</div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>SKU:</span>
              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{Number(skuCount || 0).toLocaleString()}</div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Ảnh:</span>
              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{Number(imagesCount || 0).toLocaleString()}</div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Dự Kiến Còn Lại:</span>
              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{etaSec ? `~${formatDuration(etaSec)}` : '—'}</div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Tốc độ:</span>
              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{speedStr}</div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Chế Độ:</span>
              <div
                style={{
                  fontWeight: '800',
                  color: '#2D1A12',
                  fontSize: '0.92rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={crawlMode}
              >
                {(crawlMode || 'Fast-Path API').replace(' (Dự Phòng)', '').replace('(Dự Phòng)', '')}
              </div>
            </div>
          </div>

          {/* Full-Width Live Terminal Log Stream Box */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1,
            minHeight: '200px',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#7B5233' }}>
                Nhật Ký Tiến Trình Thời Gian Thực (Live Log Stream Console):
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500' }}>
                {liveLogs.length} dòng log
              </span>
            </div>

            <div style={{
              backgroundColor: '#18181B',
              color: '#4ADE80',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.82rem',
              padding: '12px 16px',
              borderRadius: '8px',
              flex: 1,
              overflowY: 'auto',
              border: '1.5px solid #3F3F46',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
              lineHeight: '1.5'
            }}>
              {liveLogs.length === 0 ? (
                <div style={{ color: '#71717A', fontStyle: 'italic', padding: '8px 0' }}>
                  Đang kết nối luồng sự kiện SSE... Hệ thống sẽ tự động cập nhật nhật ký cào theo thời gian thực.
                </div>
              ) : (
                liveLogs.map((log, lIdx) => {
                  const rawMsg = log.message || '';
                  const msg = rawMsg.replace(/\bBỏ qua\b/g, 'Bỏ\u00A0qua');
                  const lvl = (log.level || '').toUpperCase();
                  
                  // Check Success / Completed FIRST to prevent 'Lỗi: 0' from coloring the line Red!
                  const isSuccess = lvl === 'SUCCESS' || msg.includes('hoàn tất') || msg.includes('Hoàn tất') || msg.includes('THÀNH CÔNG') || msg.includes('Đã lưu mới') || msg.includes('ĐÃ ĐỦ 100%');
                  const isErr = !isSuccess && (lvl === 'ERROR' || (msg.toLowerCase().includes('lỗi') && !msg.includes('Lỗi: 0') && !msg.includes('lỗi: 0')));
                  const isWarn = !isSuccess && (lvl === 'WARNING' || msg.includes('CẢNH BÁO') || msg.includes('THIẾU') || msg.includes('FALLBACK'));
                  const isSkip = msg.includes('[ĐÃ ĐỦ TRONG DB]') || msg.includes('[FAST-SKIP]') || lvl === 'SKIP' || msg.includes('Bỏ qua');
                  const isHealed = msg.includes('[BỔ SUNG THÀNH CÔNG]');
                  const isNew = msg.includes('[CONTAINER MỚI]') || msg.includes('[LƯU MỚI THÀNH CÔNG]');
                  const isCont = msg.includes('Bắt đầu');

                  const msgColor = isSuccess
                    ? '#4ADE80'  // Bright Green for Success / Complete!
                    : isErr
                    ? '#F87171'  // Red for actual Error
                    : isWarn
                    ? '#FBBF24'  // Amber/Yellow for Warning
                    : isHealed
                    ? '#2DD4BF'  // Teal for Healing
                    : isNew
                    ? '#60A5FA'  // Blue for New container
                    : isSkip
                    ? '#94A3B8'  // Muted Slate for Skip
                    : isCont
                    ? '#38BDF8'  // Cyan for Start
                    : '#E2E8F0'; // Default light gray text

                  const isCompletionLine = isSuccess && (msg.includes('hoàn tất') || msg.includes('Hoàn tất') || msg.includes('THÀNH CÔNG'));

                  if (isCompletionLine) {
                    return (
                      <div
                        key={lIdx}
                        style={{
                          marginTop: '4px',
                          marginBottom: '4px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(74, 222, 128, 0.1)',
                          borderLeft: '3px solid #4ADE80',
                          borderRadius: '3px',
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          whiteSpace: 'pre-wrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ color: '#86EFAC', fontSize: '0.74rem', fontWeight: '600' }}>
                          [{log.timestamp || 'LOG'}]
                        </span>
                        <span style={{ color: '#4ADE80', fontSize: '0.82rem', fontWeight: '700' }}>
                          {msg}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={lIdx} style={{ marginBottom: '2px', wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                      <span style={{ color: '#71717A', fontSize: '0.72rem', marginRight: '5px' }}>
                        [{log.timestamp || 'LOG'}]
                      </span>
                      {log.container_number && (
                        <span style={{
                          backgroundColor: '#27272A',
                          color: '#93C5FD',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          marginRight: '5px',
                          fontSize: '0.72rem',
                          fontWeight: '700'
                        }}>
                          {log.container_number}
                        </span>
                      )}
                      <span style={{
                        color: msgColor,
                        fontWeight: isErr ? '700' : isWarn ? '600' : isSuccess ? '700' : '500',
                        fontSize: isWarn ? '0.74rem' : isSuccess ? '0.78rem' : '0.75rem',
                        lineHeight: '1.4'
                      }}>
                        {msg}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
