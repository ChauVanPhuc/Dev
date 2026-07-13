# Comprehensive script to apply Edit 2 (CRUD) and Edit 3 (Screen) to ISOProcessEditorView.jsx
$file = "c:\SmartFlow_v2_Test\FrontEnd\Web\modules\ISO\Views\ISOProcessEditorView.jsx"
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
$result = [System.Collections.Generic.List[string]]::new()

$lineNum = 0

foreach ($line in $lines) {
    $lineNum++
    
    # =============================================
    # EDIT 2: Replace CRUD handlers (lines 1361-1491)
    # =============================================
    if ($lineNum -eq 1361) {
        # Insert new CRUD code
        $result.Add("  // Work Instructions CRUD & Image Helpers")
        $result.Add("  const handleAddWorkInstruction = () => {")
        $result.Add("    const processCode = formData.code || 'G7.SX.QT01';")
        $result.Add("    const prefix = ``${'$'}{processCode}-HD``;")
        $result.Add("    let maxAa = 0;")
        # Skip to line 1491 (end of old CRUD block)
        continue
    }
    if ($lineNum -gt 1361 -and $lineNum -le 1491) {
        continue
    }
    
    # =============================================
    # EDIT 3: Replace step_instructions screen (lines 3747-4008)
    # Note: Due to CRUD replacement changing line count, we track by original line numbers
    # =============================================
    
    $result.Add($line)
}

Write-Host "ERROR: This script approach is too complex for inline string handling."
Write-Host "Using file-based replacement instead."
