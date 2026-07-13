
# Script to apply 3 changes to ISOProcessEditorView.jsx atomically
$file = "c:\SmartFlow_v2_Test\FrontEnd\Web\modules\ISO\Views\ISOProcessEditorView.jsx"
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
$result = [System.Collections.Generic.List[string]]::new()

# State: track which section we're in
$skipUntilLine = -1
$lineNum = 0

foreach ($line in $lines) {
    $lineNum++
    
    # Skip lines if we're in a deleted block
    if ($skipUntilLine -gt 0 -and $lineNum -le $skipUntilLine) {
        continue
    }
    $skipUntilLine = -1

    # EDIT 1: After line 674 (selectedInstructionId), insert new states
    if ($lineNum -eq 674) {
        $result.Add($line)
        $result.Add("  const [showStepPopup, setShowStepPopup] = useState(false);")
        $result.Add("  const [isEditingStep, setIsEditingStep] = useState(false);")
        $result.Add("  const [editingStepIdx, setEditingStepIdx] = useState(-1);")
        $result.Add("  const [stepForm, setStepForm] = useState({")
        $result.Add("    id: '',")
        $result.Add("    step_number: 1,")
        $result.Add("    name: '',")
        $result.Add("    note: '',")
        $result.Add("    standard: '',")
        $result.Add("    image_url: ''")
        $result.Add("  });")
        continue
    }

    $result.Add($line)
}

[System.IO.File]::WriteAllLines($file, $result.ToArray(), (New-Object System.Text.UTF8Encoding $true))
Write-Host "Edit 1 (states) applied. Total lines: $($result.Count)"
