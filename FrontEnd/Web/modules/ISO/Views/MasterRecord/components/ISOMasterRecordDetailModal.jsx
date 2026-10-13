import React from 'react';
import { 
  Info, FileText, Clock, Paperclip, FolderGit2, Edit, X, Save, Send, AlertTriangle 
} from 'lucide-react';
import { formatClassificationText } from './isoMasterRecordUtils';
import ISOGeneralInfoTab from './ISOGeneralInfoTab';
import ISODocumentContentTab from './ISODocumentContentTab';
import ISOAuditHistoryTab from './ISOAuditHistoryTab';
import ISOAttachmentsTab from './ISOAttachmentsTab';
import ISORelatedRecordsTab from './ISORelatedRecordsTab';

const ISOMasterRecordDetailModal = ({
  showDetailModal,
  detailRecord,
  isCreateMode,
  onSelectProcess,
  selectedChildDoc,
  groupChildDocs = [],
  handleSelectChildDoc,
  isEditing,
  editFormData,
  setEditFormData,
  isFormDirty,
  formatDateOnly,
  linkedDocData,
  actionLoading,
  handleStartEdit,
  handleRequestClose,
  handleCancelClick,
  handleSaveDraft,
  handleSubmitApproval,
  acceptedDraft,
  viewerActiveTab,
  setViewerActiveTab,
  handleTabChange,
  showUnsavedWarning,
  handleStayAndContinue,
  handleDiscardChanges,
  
  // Tab 2 specific props
  selectedWordDoc,
  setSelectedWordDoc,
  uniqueWordDocs = [],
  filteredWordDocs = [],
  docSearchTerm = '',
  setDocSearchTerm,
  docDropdownOpen,
  setDocDropdownOpen,
  hasDuplicateDocName,
  getDocFolderContext,
  loadTab2Doc,
  loadingRealFiles,
  docViewerZoom = 100,
  setDocViewerZoom,
  isWordEditMode = false,
  setIsWordEditMode,
  isWordEditorDirty = false,
  setIsWordEditorDirty,
  savingWordDirect = false,
  handleCancelWordEdit,
  handleSaveDirectWordContent,
  wordEditorRef,
  wordEditorFont = 'Times New Roman',
  setWordEditorFont,
  wordEditorFontSize = '3',
  setWordEditorFontSize,
  wordEditorStyle = 'p',
  setWordEditorStyle,
  wordEditorZoom = 100,
  handleExecWordCmd,
  handleInsertTable,
  conversionState = {},
  conversionStatus = 'IDLE',
  conversionError = null,
  handleSwitchConversionTab,
  handleStartConversion,
  handleRetryConversion,
  handleAcceptConversion,
  handleCancelConversion,
  handleOpenCompareModal,
  handleOpenDirectWordEditor,
  handleDownloadWorkingDraft,
  wordInputRef,
  handleUploadWordInTab2,
  handleDownloadFile,
  downloadingFile,
  uploadingWord,
  tab2DocContent = {},
  activeHeadingId,
  scrollToHeading,
  toast,
  
  // Tab 3 specific props
  auditLogs = [],
  loadingAuditLogs = false,
  fetchAuditLogs,
  
  // Tab 4 specific props
  realFilesData = null,
  handleToggleFileUsage,
  handleUnlinkFile,
  handleUploadRelatedFileInTab4,
  uploadingRelated = false,
  relatedFileInputRef,
  fileSearchText = '',
  setFileSearchText,
  fileTypeFilter = 'all',
  setFileTypeFilter,
  expandedChildDocId,
  setExpandedChildDocId,
  activeFileMenuKey,
  setActiveFileMenuKey,
  openDocumentViewer
}) => {
  if (!showDetailModal || !detailRecord) return null;

  // Lấy chuỗi định dạng: Mã mục – Phân loại – Trạng thái cho header popup
  const getHeaderMetaBadge = (record, linkedDoc) => {
    if (isCreateMode) {
      const cls = formatClassificationText(record?.classification || 'Hồ sơ');
      return `HỒ SƠ MỚI - ${cls} - Dự thảo`;
    }
    if (!record) return '';
    const itemCode = record.source_code || record.item_code || 'HỒ SƠ';
    const clsFormatted = formatClassificationText(record.classification);
    const classificationText = clsFormatted === '---' ? 'Tài liệu' : clsFormatted;
    const statusText = linkedDoc?.status || record.source_status || record.status || 'Đã có hồ sơ';
    return `${itemCode} - ${classificationText} - ${statusText}`;
  };

  const fileCount = Array.isArray(realFilesData?.files) 
    ? realFilesData.files.length 
    : (Array.isArray(detailRecord.files) ? detailRecord.files.length : (groupChildDocs?.length || 0));

  return (
    <>
      <div className="iso-modal-overlay" onClick={handleRequestClose}>
        <div className="iso-viewer-modal iso-record-modal" onClick={(e) => e.stopPropagation()}>
          
          {/* 1. Header Bar */}
          <div className="iso-viewer-header">
            <div className="iso-viewer-header-left">
              <span className="iso-viewer-header-badge">
                {getHeaderMetaBadge(isEditing ? editFormData : (selectedChildDoc || detailRecord), linkedDocData)}
              </span>
              <h3 
                className="iso-viewer-header-title" 
                title={isEditing ? editFormData.document_name : (selectedChildDoc?.document_name || selectedChildDoc?.file_name || detailRecord.document_name)}
              >
                {isEditing ? editFormData.document_name : (selectedChildDoc?.document_name || selectedChildDoc?.file_name || detailRecord.document_name)}
              </h3>
            </div>
            
            <div className="iso-viewer-header-actions">
              {!isEditing ? (
                <button 
                  type="button"
                  onClick={handleStartEdit}
                  className="iso-viewer-header-edit-btn"
                  title="Chuyển sang chế độ chỉnh sửa thông tin"
                >
                  <Edit size={14} />
                  <span>Chỉnh sửa</span>
                </button>
              ) : (
                <span className="iso-viewer-header-editing-badge" title="Đang ở chế độ chỉnh sửa thông tin">
                  <Edit size={13} />
                  <span>Đang chỉnh sửa</span>
                </span>
              )}

              <button 
                type="button"
                onClick={handleRequestClose}
                className="iso-viewer-close-btn"
                title="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 2. Top Tabs Bar: 5 tabs */}
          <div className="iso-viewer-tabs-bar">
            <button
              type="button"
              className={`iso-viewer-tab-btn ${viewerActiveTab === 'general' ? 'active' : ''}`}
              onClick={() => handleTabChange('general')}
            >
              <Info size={16} />
              <span>1. Thông tin chung</span>
            </button>

            <button
              type="button"
              className={`iso-viewer-tab-btn ${viewerActiveTab === 'content' ? 'active' : ''}`}
              onClick={() => handleTabChange('content')}
            >
              <FileText size={16} />
              <span>2. Nội dung</span>
            </button>

            <button
              type="button"
              className={`iso-viewer-tab-btn ${viewerActiveTab === 'history' ? 'active' : ''}`}
              onClick={() => handleTabChange('history')}
            >
              <Clock size={16} />
              <span>3. Lịch sử thay đổi</span>
            </button>

            <button
              type="button"
              className={`iso-viewer-tab-btn ${viewerActiveTab === 'attachments' ? 'active' : ''}`}
              onClick={() => handleTabChange('attachments')}
            >
              <Paperclip size={16} />
              <span>4. Tài liệu đính kèm</span>
            </button>

            <button
              type="button"
              className={`iso-viewer-tab-btn ${viewerActiveTab === 'related' ? 'active' : ''}`}
              onClick={() => handleTabChange('related')}
            >
              <FolderGit2 size={16} />
              <span>5. Hồ sơ liên quan</span>
            </button>
          </div>

          {/* 3. Modal Body: Render Active Tab */}
          <div className="iso-viewer-body" style={{ flex: 1, minHeight: 0, height: '100%', overflowY: viewerActiveTab === 'content' ? 'hidden' : 'auto', overflowX: 'hidden' }}>
            {viewerActiveTab === 'general' && (
              <ISOGeneralInfoTab
                detailRecord={detailRecord}
                selectedChildDoc={selectedChildDoc}
                groupChildDocs={groupChildDocs}
                handleSelectChildDoc={handleSelectChildDoc}
                isEditing={isEditing}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
                formatDateOnly={formatDateOnly}
                loadTab2Doc={loadTab2Doc}
                setSelectedWordDoc={setSelectedWordDoc}
                onSelectProcess={onSelectProcess}
              />
            )}

            {viewerActiveTab === 'content' && (
              <ISODocumentContentTab
                selectedWordDoc={selectedWordDoc}
                setSelectedWordDoc={setSelectedWordDoc}
                uniqueWordDocs={uniqueWordDocs}
                filteredWordDocs={filteredWordDocs}
                docSearchTerm={docSearchTerm}
                setDocSearchTerm={setDocSearchTerm}
                docDropdownOpen={docDropdownOpen}
                setDocDropdownOpen={setDocDropdownOpen}
                hasDuplicateDocName={hasDuplicateDocName}
                getDocFolderContext={getDocFolderContext}
                loadTab2Doc={loadTab2Doc}
                loadingRealFiles={loadingRealFiles}
                acceptedDraft={acceptedDraft}
                docViewerZoom={docViewerZoom}
                setDocViewerZoom={setDocViewerZoom}
                isWordEditMode={isWordEditMode}
                setIsWordEditMode={setIsWordEditMode}
                isWordEditorDirty={isWordEditorDirty}
                setIsWordEditorDirty={setIsWordEditorDirty}
                savingWordDirect={savingWordDirect}
                handleCancelWordEdit={handleCancelWordEdit}
                handleSaveDirectWordContent={handleSaveDirectWordContent}
                wordEditorRef={wordEditorRef}
                wordEditorFont={wordEditorFont}
                setWordEditorFont={setWordEditorFont}
                wordEditorFontSize={wordEditorFontSize}
                setWordEditorFontSize={setWordEditorFontSize}
                wordEditorStyle={wordEditorStyle}
                setWordEditorStyle={setWordEditorStyle}
                wordEditorZoom={wordEditorZoom}
                handleExecWordCmd={handleExecWordCmd}
                handleInsertTable={handleInsertTable}
                conversionState={conversionState}
                conversionStatus={conversionStatus}
                conversionError={conversionError}
                handleSwitchConversionTab={handleSwitchConversionTab}
                handleStartConversion={handleStartConversion}
                handleRetryConversion={handleRetryConversion}
                handleAcceptConversion={handleAcceptConversion}
                handleCancelConversion={handleCancelConversion}
                handleOpenCompareModal={handleOpenCompareModal}
                handleOpenDirectWordEditor={handleOpenDirectWordEditor}
                handleDownloadWorkingDraft={handleDownloadWorkingDraft}
                wordInputRef={wordInputRef}
                handleUploadWordInTab2={handleUploadWordInTab2}
                handleDownloadFile={handleDownloadFile}
                downloadingFile={downloadingFile}
                uploadingWord={uploadingWord}
                tab2DocContent={tab2DocContent}
                activeHeadingId={activeHeadingId}
                scrollToHeading={scrollToHeading}
                toast={toast}
              />
            )}

            {viewerActiveTab === 'history' && (
              <ISOAuditHistoryTab
                auditLogs={auditLogs}
                loadingAuditLogs={loadingAuditLogs}
                fetchAuditLogs={fetchAuditLogs}
                detailRecord={detailRecord}
                isCreateMode={isCreateMode}
              />
            )}

            {viewerActiveTab === 'attachments' && (
              <ISOAttachmentsTab
                detailRecord={detailRecord}
                realFilesData={realFilesData}
                groupChildDocs={groupChildDocs}
                selectedChildDoc={selectedChildDoc}
                handleSelectChildDoc={handleSelectChildDoc}
                setViewerActiveTab={setViewerActiveTab}
                openDocumentViewer={openDocumentViewer}
                handleDownloadFile={handleDownloadFile}
                handleToggleFileUsage={handleToggleFileUsage}
                handleUnlinkFile={handleUnlinkFile}
                handleUploadRelatedFileInTab4={handleUploadRelatedFileInTab4}
                uploadingRelated={uploadingRelated}
                relatedFileInputRef={relatedFileInputRef}
                fileSearchText={fileSearchText}
                setFileSearchText={setFileSearchText}
                fileTypeFilter={fileTypeFilter}
                setFileTypeFilter={setFileTypeFilter}
                expandedChildDocId={expandedChildDocId}
                setExpandedChildDocId={setExpandedChildDocId}
                activeFileMenuKey={activeFileMenuKey}
                setActiveFileMenuKey={setActiveFileMenuKey}
                toast={toast}
              />
            )}

            {viewerActiveTab === 'related' && (
              <ISORelatedRecordsTab />
            )}
          </div>

          {/* 4. Footer Bar */}
          <div className="iso-viewer-footer">
            <button
              type="button"
              className="iso-viewer-footer-btn btn-cancel"
              onClick={handleCancelClick}
              disabled={actionLoading}
              title={isEditing ? 'Hủy bỏ các thay đổi đang chỉnh sửa' : 'Đóng cửa sổ'}
            >
              <X size={15} />
              <span>Hủy</span>
            </button>

            <button
              type="button"
              className="iso-viewer-footer-btn btn-draft"
              onClick={handleSaveDraft}
              disabled={actionLoading || (!acceptedDraft && detailRecord.source_status === 'Dự thảo' && !isFormDirty)}
              title={acceptedDraft ? 'Lưu chính thức phiên bản mới sau chuyển đổi' : (isEditing ? 'Lưu thay đổi hồ sơ' : 'Lưu hồ sơ ở trạng thái Dự thảo')}
            >
              <Save size={15} />
              <span>{actionLoading ? 'Đang lưu...' : (acceptedDraft ? 'Lưu phiên bản mới' : (isEditing ? 'Lưu' : 'Lưu nháp'))}</span>
            </button>

            <button
              type="button"
              className="iso-viewer-footer-btn btn-submit"
              onClick={handleSubmitApproval}
              disabled={actionLoading || (detailRecord.source_status === 'Chờ duyệt' && !isFormDirty)}
              title="Gửi hồ sơ vào quy trình phê duyệt"
            >
              <Send size={15} />
              <span>{actionLoading ? 'Đang gửi...' : 'Gửi duyệt'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* UNSAVED CHANGES WARNING MODAL */}
      {showUnsavedWarning && (
        <div 
          className="iso-modal-overlay" 
          style={{ zIndex: 2100 }} 
          onClick={handleStayAndContinue}
        >
          <div 
            className="iso-modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', borderRadius: '12px', border: '1px solid #FED7AA' }}
          >
            <div className="iso-modal-header" style={{ backgroundColor: '#FFF7ED', borderBottomColor: '#FFEDD5' }}>
              <h3 className="iso-modal-title" style={{ color: '#C2410C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={19} color="#EA580C" />
                <span>Cảnh báo thay đổi chưa lưu</span>
              </h3>
              <button 
                type="button"
                onClick={handleStayAndContinue}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}
                title="Đóng cảnh báo"
              >
                <X size={18} />
              </button>
            </div>
            <div className="iso-modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#374151', lineHeight: '1.5' }}>
                Bạn có thay đổi chưa được lưu. Nếu tiếp tục, các thay đổi này sẽ bị mất.
              </p>
            </div>
            <div className="iso-modal-footer" style={{ padding: '12px 20px', gap: '10px', justifyContent: 'flex-end', backgroundColor: '#FAF6F0' }}>
              <button 
                type="button" 
                className="iso-viewer-footer-btn btn-cancel"
                onClick={handleStayAndContinue}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button 
                type="button" 
                className="iso-viewer-footer-btn"
                style={{ 
                  backgroundColor: '#DC2626', 
                  borderColor: '#DC2626', 
                  color: '#FFFFFF' 
                }}
                onClick={handleDiscardChanges}
              >
                Bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ISOMasterRecordDetailModal;
