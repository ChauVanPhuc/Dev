import React from 'react';
import { useParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { X, Search, Plus, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreen } from '@shared/context/ScreenContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

// Import sub-components
import ComponentTreePane from '../components/ScreenDetail/ComponentTreePane';
import SimulatorPane from '../components/ScreenDetail/SimulatorPane';
import InspectorPane from '../components/ScreenDetail/InspectorPane';
import BugListTable from '../components/ScreenDetail/BugListTable';
import AddComponentModal from '../components/AddComponentModal';
import BugModal from '../components/BugModal';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';

// Import new modular components
import ScreenMetadataForm from '../components/ScreenDetail/ScreenMetadataForm';
import FrontendLinkModal from '../components/ScreenDetail/FrontendLinkModal';

// Import custom hook
import { useScreenDetail } from '../hooks/useScreenDetail';

import './ScreenDetailView.css';

const ScreenDetail = () => {
  const detail = useScreenDetail();
  const outletContext = useOutletContext();
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/screens/:id');

  React.useEffect(() => {
    if (outletContext?.setCustomTitle && title) outletContext.setCustomTitle(title);
    if (outletContext?.setCustomSubtitle && subtitle) outletContext.setCustomSubtitle(subtitle);
    if (outletContext?.setCustomScreenCode && screenCode) outletContext.setCustomScreenCode(screenCode);
  }, [screenCode, title, subtitle, outletContext]);

  if (detail.error) {
    return (
      <div className="detail-container">
        <div className="error-card">
          <p className="error-text">{detail.error || 'Không tìm thấy màn hình yêu cầu'}</p>
          <button className="btn-back" onClick={() => detail.navigate('/admin/screens')}>
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const isModified = detail.screen?.current_code !== detail.screen?.default_code;

  return (
    <div className="detail-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* 01. STICKY HEADER METADATA FORM */}
      <ScreenMetadataForm
        formData={detail.formData}
        setFormData={detail.setFormData}
        isNew={detail.isNew}
        allScreens={detail.allScreens}
        isBackendPathManuallyEdited={detail.isBackendPathManuallyEdited}
        setIsBackendPathManuallyEdited={detail.setIsBackendPathManuallyEdited}
        generatedCode={detail.generatedCode}
        subsystems={detail.subsystems}
        ROUTE_SUGGESTIONS={detail.ROUTE_SUGGESTIONS}
        getDisplayRoutePath={detail.getDisplayRoutePath}
        slugify={detail.slugify}
        parseRoutePath={detail.parseRoutePath}
        normalizeRoutePath={detail.normalizeRoutePath}
        handleSave={detail.handleSave}
        handleCopyScreenDetail={detail.handleCopyScreenDetail}
        handleRefresh={detail.handleRefresh}
        navigate={detail.navigate}
        screen={detail.screen}
        showToast={detail.showToast}
        setShowLinkModal={detail.setShowLinkModal}
        isHeaderCollapsed={detail.isHeaderCollapsed}
        setIsHeaderCollapsed={detail.setIsHeaderCollapsed}
        isScreenInfoCollapsed={detail.isScreenInfoCollapsed}
        setIsScreenInfoCollapsed={detail.setIsScreenInfoCollapsed}
        isModified={isModified}
        itAccounts={detail.itAccounts || []}
        setBugModalMode={detail.setBugModalMode}
        setBugModalData={detail.setBugModalData}
        setShowBugModal={detail.setShowBugModal}
        setLinkSubsystem={detail.setLinkSubsystem}
        setLinkScreenId={detail.setLinkScreenId}
        setLinkComponentId={detail.setLinkComponentId}
        openLinkModal={detail.openLinkModal}
      />

      {/* 02. MAIN ROW WORKSPACE */}
      <div className="main-workspace-row" ref={detail.scrollBodyRef} style={{ display: 'flex', flex: 1, overflowY: 'auto', flexDirection: 'column', minHeight: 0 }}>
        <div className="detail-layout-grid" style={{ minHeight: '500px' }}>
          {/* CỘT 1: COMPONENT TREE PANE */}
          <ComponentTreePane
            activeTab={detail.activeTab}
            setActiveTab={detail.setActiveTab}
            screen={detail.screen}
            setScreen={detail.setScreen}
            activeComponent={detail.activeComponent}
            setActiveComponent={detail.setActiveComponent}
            setSpecDescriptions={detail.setSpecDescriptions}
            setSpecSampleFile={detail.setSpecSampleFile}
            setSpecSampleFileUrl={detail.setSpecSampleFileUrl}
            setIsSpecUploadingSample={detail.setIsSpecUploadingSample}
            activeComponentMenu={detail.activeComponentMenu}
            setActiveComponentMenu={detail.setActiveComponentMenu}
            handleEditComponentClick={detail.handleEditComponentClick}
            handleDeleteComponent={detail.handleDeleteComponent}
            handleSetComponentColor={detail.handleSetComponentColor}
            handleAddComponent={detail.handleAddComponent}
            selectedGuideIdx={detail.selectedGuideIdx}
            setSelectedGuideIdx={detail.setSelectedGuideIdx}
            showConfirm={detail.showConfirm}
            showToast={detail.showToast}
            COMPONENT_COLORS={detail.COMPONENT_COLORS}
            getComponentHint={detail.getComponentHint}
            itAccounts={detail.itAccounts || []}
            setBugModalMode={detail.setBugModalMode}
            setBugModalData={detail.setBugModalData}
            setShowBugModal={detail.setShowBugModal}
            formData={detail.formData}
          />

          {/* CỘT 2: RIGHT DETAIL PANEL (SIMULATOR + INSPECTOR STACKED) */}
          <div className="detail-right-column">
            {/* SIMULATOR PANE */}
            <SimulatorPane
              screen={detail.screen}
              isMockupExpanded={detail.isMockupExpanded}
              setIsMockupExpanded={detail.setIsMockupExpanded}
              handlePasteMockupFromClipboard={detail.handlePasteMockupFromClipboard}
              handlePasteMockup={detail.handlePasteMockup}
              getImageUrl={detail.getImageUrl}
              setShowZoomModal={detail.setShowZoomModal}
              currentMockupIdx={detail.currentMockupIdx}
              setCurrentMockupIdx={detail.setCurrentMockupIdx}
              handleDeleteMockup={detail.handleDeleteMockup}
            />

            {/* INSPECTOR PANE */}
            <InspectorPane
              activeTab={detail.activeTab}
              screen={detail.screen}
              setScreen={detail.setScreen}
              selectedGuideIdx={detail.selectedGuideIdx}
              setSelectedGuideIdx={detail.setSelectedGuideIdx}
              isGuideCompDropdownOpen={detail.isGuideCompDropdownOpen}
              setIsGuideCompDropdownOpen={detail.setIsGuideCompDropdownOpen}
              activeComponent={detail.activeComponent}
              viewMode={detail.viewMode}
              setViewMode={detail.setViewMode}
              specDescriptions={detail.specDescriptions}
              setSpecDescriptions={detail.setSpecDescriptions}
              isSpecCardCollapsed={detail.isSpecCardCollapsed}
              setIsSpecCardCollapsed={detail.setIsSpecCardCollapsed}
              specFileInputRef={detail.specFileInputRef}
              handleSpecSampleFileChange={detail.handleSpecSampleFileChange}
              isSpecUploadingSample={detail.isSpecUploadingSample}
              specSampleFileUrl={detail.specSampleFileUrl}
              setSpecSampleFileUrl={detail.setSpecSampleFileUrl}
              specExportData={detail.specExportData}
              setSpecExportData={detail.setSpecExportData}
              isSpecExporting={detail.isSpecExporting}
              handleSpecExportTest={detail.handleSpecExportTest}
              showToast={detail.showToast}
            />
          </div>
        </div>

        {/* 03. BUG & FEEDBACK ACCORDION TABLE */}
        <BugListTable
          screen={detail.screen}
          isBugListCollapsed={detail.isBugListCollapsed}
          setIsBugListCollapsed={detail.setIsBugListCollapsed}
          expandedBugId={detail.expandedBugId}
          setExpandedBugId={detail.setExpandedBugId}
          activeBugMenu={detail.activeBugMenu}
          setActiveBugMenu={detail.setActiveBugMenu}
          handleDeleteBug={detail.handleDeleteBug}
          handleOpenEditBugModal={detail.handleOpenEditBugModal}
          handleSubmitReply={detail.handleSubmitReply}
          handleBugImageUpload={detail.handleBugImageUpload}
          getImageUrl={detail.getImageUrl}
        />
      </div>

      {/* POPUP MODALS */}
      {detail.showAddComponentModal && (
        <AddComponentModal
          isOpen={detail.showAddComponentModal}
          onClose={() => detail.setShowAddComponentModal(false)}
          editingComponent={detail.editingComponent}
          onConfirm={(comp) => {
            detail.confirmAddComponent(comp);
            detail.setShowAddComponentModal(false);
          }}
        />
      )}

      {detail.showBugModal && (
        <BugModal
          isOpen={detail.showBugModal}
          onClose={() => detail.setShowBugModal(false)}
          mode={detail.bugModalMode}
          bug={detail.bugModalData}
          components={detail.screen?.components || []}
          reporterName={detail.outletContext?.currentUser?.display_name || ''}
          itAccounts={detail.outletContext?.itAccounts || []}
          onConfirm={detail.handleBugModalConfirm}
        />
      )}

      {detail.showLinkModal && (
        <FrontendLinkModal
          isOpen={detail.showLinkModal}
          onClose={() => detail.setShowLinkModal(false)}
          linkSubsystem={detail.linkSubsystem}
          setLinkSubsystem={detail.setLinkSubsystem}
          linkScreenId={detail.linkScreenId}
          setLinkScreenId={detail.setLinkScreenId}
          linkComponentId={detail.linkComponentId}
          setLinkComponentId={detail.setLinkComponentId}
          sidebarGroups={detail.sidebarGroups}
          filteredScreens={detail.filteredScreens}
          linkFilteredComponents={detail.linkFilteredComponents}
          displayInfoText={detail.displayInfoText}
          handleConfirmLink={detail.handleConfirmLink}
        />
      )}

      <BeautifulConfirmModal
        visible={detail.confirmModal.visible}
        title={detail.confirmModal.title}
        message={detail.confirmModal.message}
        type={detail.confirmModal.type}
        onConfirm={detail.confirmModal.onConfirm}
        onCancel={() => detail.setConfirmModal(prev => ({ ...prev, visible: false }))}
      />

      {detail.showBlockerModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            textAlign: 'center'
          }}>
            <button
              onClick={detail.handleCancelLeave}
              style={{
                position: 'absolute',
                top: '20px', right: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                padding: '20px',
                borderRadius: '20px',
                backgroundColor: '#f59e0b15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={48} color="#f59e0b" />
              </div>
            </div>

            <h3 style={{
              fontSize: '20px',
              fontWeight: '800',
              color: '#1e293b',
              marginBottom: '12px',
              margin: 0
            }}>
              Thay đổi chưa được lưu
            </h3>

            <p style={{
              fontSize: '15px',
              color: '#64748b',
              lineHeight: '1.6',
              marginBottom: '28px',
              textAlign: 'center'
            }}>
              Bạn đã thực hiện các thay đổi trên đặc tả màn hình này. Bạn muốn lưu các thay đổi này trước khi rời đi không?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={detail.handleSaveAndLeave}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#7B5233',
                  color: 'white',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 8px 15px -3px rgba(123, 82, 51, 0.4)'
                }}
              >
                Lưu và rời đi
              </button>
              
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  onClick={detail.handleDiscardAndLeave}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Hủy thay đổi & rời đi
                </button>
                
                <button
                  onClick={detail.handleCancelLeave}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Ở lại chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenDetail;
