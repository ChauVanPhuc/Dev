import React from 'react';
import { useParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { X, Search, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreen } from '@shared/context/ScreenContext';

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
      />

      {/* 02. MAIN ROW WORKSPACE */}
      <div className="main-workspace-row" ref={detail.scrollBodyRef} style={{ display: 'flex', flex: 1, overflowY: 'auto', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', flex: 1, minHeight: '500px' }}>
          {/* CỘT 1: COMPONENT TREE PANE */}
          <ComponentTreePane
            screen={detail.screen}
            activeComponent={detail.activeComponent}
            onSelectComponent={detail.setActiveComponent}
          />

          {/* CỘT 2: SIMULATOR PANE */}
          <SimulatorPane
            screen={detail.screen}
            activeComponent={detail.activeComponent}
            zoomScale={detail.zoomScale}
            zoomPosition={detail.zoomPosition}
            setZoomScale={detail.setZoomScale}
            setZoomPosition={detail.setZoomPosition}
            isPanning={detail.isPanning}
            setIsPanning={detail.setIsPanning}
            panStart={detail.panStart}
            setPanStart={detail.setPanStart}
            handleZoomIn={detail.handleZoomIn}
            handleZoomOut={detail.handleZoomOut}
            handleZoomReset={detail.handleZoomReset}
            handleMouseDown={detail.handleMouseDown}
            handleMouseMove={detail.handleMouseMove}
            handleMouseUp={detail.handleMouseUp}
            handleWheel={detail.handleWheel}
            handlePasteMockup={detail.handlePasteMockup}
            handleDeleteMockup={detail.handleDeleteMockup}
            handlePasteMockupFromClipboard={detail.handlePasteMockupFromClipboard}
            getImageUrl={detail.getImageUrl}
          />

          {/* CỘT 3: INSPECTOR PANE */}
          <InspectorPane
            screen={detail.screen}
            activeComponent={detail.activeComponent}
            specDescriptions={detail.specDescriptions}
            setSpecDescriptions={detail.setSpecDescriptions}
            specFileInputRef={detail.specFileInputRef}
            handleSpecSampleFileChange={detail.handleSpecSampleFileChange}
            specSampleFile={detail.specSampleFile}
            specSampleFileUrl={detail.specSampleFileUrl}
            isSpecUploadingSample={detail.isSpecUploadingSample}
            handleRemoveSpecSampleFile={detail.handleRemoveSpecSampleFile}
            handleSpecExportTest={detail.handleSpecExportTest}
            isSpecExporting={detail.isSpecExporting}
            specExportData={detail.specExportData}
            handleSave={detail.handleSave}
            handleDeleteComponent={detail.handleDeleteComponent}
            handleEditComponentClick={detail.handleEditComponentClick}
            handleSetComponentColor={detail.handleSetComponentColor}
            COMPONENT_COLORS={detail.COMPONENT_COLORS}
            getComponentHint={detail.getComponentHint}
          />
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
            detail.handleAddComponent(comp);
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
          subsystems={detail.subsystems}
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
    </div>
  );
};

export default ScreenDetail;
