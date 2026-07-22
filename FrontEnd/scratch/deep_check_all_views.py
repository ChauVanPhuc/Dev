import os
import re

WEB_DIR = r"m:\ERP\FrontEnd\Web"

# List of view files and their helper/hook files
MODULES = [
    {
        "name": "ScreenDetail",
        "files": [
            r"modules/System/Views/Screen/ScreenDetailView.jsx",
            r"modules/System/Views/hooks/useScreenDetail.jsx",
            r"modules/System/Views/hooks/screenDetailUtils.jsx",
            r"modules/System/Views/components/ScreenDetail/ComponentTreePane.jsx",
            r"modules/System/Views/components/ScreenDetail/InspectorPane.jsx",
            r"modules/System/Views/components/ScreenDetail/SimulatorPane.jsx",
            r"modules/System/Views/components/ScreenDetail/ScreenMetadataForm.jsx",
            r"modules/System/Views/components/ScreenDetail/BugListTable.jsx",
            r"modules/System/Views/components/AddComponentModal.jsx",
            r"modules/System/Views/components/BugModal.jsx",
            r"modules/System/Views/components/ScreenExportDetailModal.jsx"
        ]
    },
    {
        "name": "ScreenBugManagement",
        "files": [
            r"modules/System/Views/Screen/ScreenBugManagementView.jsx",
            r"modules/System/Views/Screen/hooks/useScreenBugManagement.jsx",
            r"modules/System/Views/Screen/components/AddBugModal.jsx",
            r"modules/System/Views/Screen/components/BugDetailsPanel.jsx"
        ]
    },
    {
        "name": "ISOProcessEditor",
        "files": [
            r"modules/ISO/Views/Process/ISOProcessEditorView.jsx",
            r"modules/ISO/Views/Process/hooks/useISOProcessEditor.jsx",
            r"modules/ISO/Views/Process/components/FlowchartCanvas.jsx",
            r"modules/ISO/Views/Process/components/FlowchartConnectors.jsx",
            r"modules/ISO/Views/Process/components/FlowchartTable.jsx",
            r"modules/ISO/Views/Process/components/ProcessContentTab.jsx",
            r"modules/ISO/Views/Process/components/ProcessInstructionsTab.jsx",
            r"modules/ISO/Views/Process/components/ProcessTemplatesTab.jsx",
            r"modules/ISO/Views/Process/components/RichTextEditor.jsx"
        ]
    },
    {
        "name": "ClaimList",
        "files": [
            r"modules/Claim/views/Claim/ClaimListView.jsx",
            r"modules/Claim/views/hooks/useClaimList.jsx",
            r"modules/Claim/views/components/ClaimList/ClaimAnalyticsModal.jsx",
            r"modules/Claim/views/components/ClaimList/ClaimCreateModal.jsx",
            r"modules/Claim/views/components/ClaimList/ClaimFilterBar.jsx",
            r"modules/Claim/views/components/ClaimList/ClaimOverviewCards.jsx",
            r"modules/Claim/views/components/ClaimList/ClaimProcessModal.jsx",
            r"modules/Claim/views/components/ClaimList/ClaimTableSection.jsx",
            r"modules/Claim/views/components/ClaimList/ExceptionClaimModal.jsx",
            r"modules/Claim/views/components/ClaimList/ReviewClaimModal.jsx"
        ]
    },
    {
        "name": "DeliveryTracking",
        "files": [
            r"modules/Delivery/Views/Tracking/DeliveryTrackingView.jsx",
            r"modules/Delivery/Views/Tracking/hooks/useDeliveryTracking.jsx"
        ]
    },
    {
        "name": "InspectionReports",
        "files": [
            r"modules/Inspection/Views/Report/InspectionReportsView.jsx",
            r"modules/Inspection/Views/Report/hooks/useInspectionReports.jsx"
        ]
    },
    {
        "name": "UserManagement & UserEdit & UserCreate",
        "files": [
            r"modules/Auth/Views/User/UserManagementView.jsx",
            r"modules/Auth/Views/User/UserCreateView.jsx",
            r"modules/Auth/Views/User/UserEditView.jsx",
            r"modules/Auth/Views/User/PositionManagementView.jsx",
            r"modules/Auth/Views/User/PositionModal.jsx",
            r"modules/Auth/Views/User/components/UserScreenConfig.jsx"
        ]
    }
]

def check_file_references(filepath):
    abs_path = os.path.join(WEB_DIR, filepath)
    if not os.path.exists(abs_path):
        print(f"  [MISSING FILE] {filepath}")
        return

    with open(abs_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check for destructuring missing variables or undefined references
    # 1. Check for standard hooks / imports
    # 2. Check for missing JSX tags in render
    tags = set(re.findall(r"<([A-Z][a-zA-Z0-9_]*)\b", content))
    # imports
    imports = set()
    for imp in re.findall(r"import\s+[\s\S]*?from\s+['\"].*?['\"]", content):
        names = re.findall(r"([A-Z][a-zA-Z0-9_]*)", imp)
        imports.update(names)
    
    local_defs = set(re.findall(r"(?:const|function|class|let|var)\s+([A-Z][a-zA-Z0-9_]*)", content))
    
    unresolved = tags - imports - local_defs - {"Fragment", "React", "Suspense"}
    if unresolved:
        print(f"  [UNRESOLVED JSX TAGS] in {os.path.basename(filepath)}: {unresolved}")

for mod in MODULES:
    print(f"\nChecking module: {mod['name']}")
    for f in mod['files']:
        check_file_references(f)

