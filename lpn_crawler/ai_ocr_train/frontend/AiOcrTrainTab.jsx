import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { TabTraining } from './components/TabTraining';
import { TabResults } from './components/TabResults';
import { TabTest } from './components/TabTest';
import './styles/aiOcrTrain.css';

const API_OCR_BASE = '/api/v1/lpn-crawler/ai-ocr';

export default function AiOcrTrainTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'test'; // 'training' | 'results' | 'test'
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [deviceInfo, setDeviceInfo] = useState(null);
  const outletContext = useOutletContext();

  // Global shared training state across tabs
  const [trainConfig, setTrainConfig] = useState({
    model_type: 'hybrid',
    epochs: 15,
    batch_size: 16,
    learning_rate: 0.0001,
    optimizer: 'adamw', // adamw, adam, sgd
    image_size: '1024x1024', // 1024x1024, 768x768, 512x512
    mixed_precision: true, // FP16
    random_seed: 42,
    dataset_scope: '50k', // 5k, 25k, 50k, 75k, 100k, full, custom
    custom_sample_count: 50000,
    train_val_split: 0.8, // 80% Train, 20% Validation
    use_synthetic_data: true,
    synthetic_samples: 50000,
    use_internal_dataset: true,
    data_augmentation: true,
    early_stopping: true,
    patience: 3,
    min_delta: 0.001,
    target_val_loss: 0.040,
    target_lpn_acc: 99.0,
    target_sku_acc: 98.5,
    best_criterion: 'lowest_val_loss',
    auto_oom_fallback: true
  });

  const [isTraining, setIsTraining] = useState(false);
  const [trainingState, setTrainingState] = useState({
    currentEpoch: 0,
    bestEpoch: 0,
    bestCheckpoint: '',
    bestValLoss: 999.0,
    epochsWithoutImprovement: 0,
    currentStep: 0,
    totalSteps: 150,
    progressPercent: 0,
    currentLoss: null,
    currentValLoss: null,
    currentLpnAcc: null,
    currentSkuAcc: null,
    currentAccuracy: null,
    gpuUsage: 2,
    vramUsed: 0.6,
    gpuTemp: 42,
    isPaused: false,
    resumableEpoch: 0,
    trainingComplete: false,
    savedModelName: ''
  });

  const [historyData, setHistoryData] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchDeviceInfo();
  }, []);

  const fetchDeviceInfo = async () => {
    try {
      const res = await fetch(`${API_OCR_BASE}/device-info`);
      const data = await res.json();
      if (data.success && data.device) {
        setDeviceInfo(data.device);
      }
    } catch (e) {
      console.error('Error fetching device info:', e);
    }
  };

  const hasOutlet = Boolean(outletContext);

  return (
    <div
      className="ai-ocr-container"
      style={{
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        padding: '0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      {/* Fallback Header Bar CHỈ hiển thị nếu không có thanh header SmartFlow */}
      {!hasOutlet && (
        <div className="ai-ocr-header" style={{ flexShrink: 0 }}>
          <div className="ai-ocr-title-group">
            <div>
              <h2 className="ai-ocr-title">Huấn Luyện & Kiểm Thử Mô Hình AI OCR Đọc Nhãn</h2>
            </div>
          </div>

          <div className="ai-mode-tabs">
            <button
              type="button"
              className={`ai-mode-tab-btn ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              1. Huấn Luyện Model
            </button>

            <button
              type="button"
              className={`ai-mode-tab-btn ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              2. Kết Quả & Biểu Đồ
            </button>

            <button
              type="button"
              className={`ai-mode-tab-btn ${activeTab === 'test' ? 'active' : ''}`}
              onClick={() => setActiveTab('test')}
            >
              3. Kiểm Thử Dữ Liệu Thực Tế
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Content of Selected Tab - Chiếm trọn chiều cao 100% không để dư trống */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden'
      }}>
        {activeTab === 'training' && (
          <TabTraining
            deviceInfo={deviceInfo || {}}
            trainConfig={trainConfig}
            setTrainConfig={setTrainConfig}
            isTraining={isTraining}
            setIsTraining={setIsTraining}
            trainingState={trainingState}
            setTrainingState={setTrainingState}
            historyData={historyData}
            setHistoryData={setHistoryData}
            logs={logs}
            setLogs={setLogs}
            onTrainingComplete={() => {
              // Optional callback when training finishes
            }}
          />
        )}

        {activeTab === 'results' && (
          <TabResults
            historyData={historyData}
            trainingState={trainingState}
            trainConfig={trainConfig}
          />
        )}

        {activeTab === 'test' && (
          <TabTest deviceInfo={deviceInfo || {}} trainingState={trainingState} />
        )}
      </div>
    </div>
  );
}
