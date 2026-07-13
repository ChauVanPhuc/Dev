# Splicing script for ISOProcessEditorView.jsx starting from CLEAN git checkouted version
$base = "c:\SmartFlow_v2_Test\FrontEnd"
$file = "$base\Web\modules\ISO\Views\ISOProcessEditorView.jsx"

$enc = New-Object System.Text.UTF8Encoding $true
$lines = [System.IO.File]::ReadAllLines($file, $enc)
Write-Host "Original clean file: $($lines.Length) lines"

# Read replacement chunks
$statesChunk = [System.IO.File]::ReadAllLines("$base\scratch\chunk_states.txt", $enc)
$crudChunk   = [System.IO.File]::ReadAllLines("$base\scratch\chunk_crud_v2.txt", $enc)
$tab2Chunk   = [System.IO.File]::ReadAllLines("$base\scratch\chunk_tab2_v2.txt", $enc)

$result = [System.Collections.Generic.List[string]]::new()

# 1. Lines 1 to 674 (original, unchanged)
for ($i = 0; $i -lt 674; $i++) { $result.Add($lines[$i]) }

# Insert states chunk
foreach ($line in $statesChunk) { $result.Add($line) }

# 2. Lines 675 to 1349 (original, unchanged)
for ($i = 674; $i -lt 1349; $i++) { $result.Add($lines[$i]) }

# Replace lines 1350-1481 (CRUD handlers) with $crudChunk
foreach ($line in $crudChunk) { $result.Add($line) }

# 3. Lines 1482 to 2443 (original, unchanged)
for ($i = 1481; $i -lt 2443; $i++) { $result.Add($lines[$i]) }

# Replace lines 2444-2449 (tab button click handler)
$result.Add("                  onClick={() => {")
$result.Add("                    setActiveTab(tab.id);")
$result.Add("                    setCurrentScreen('overview');")
$result.Add("                    if (tab.id === 'instructions') {")
$result.Add("                      const instructions = formData.work_instructions || [];")
$result.Add("                      if (instructions.length > 0 && !selectedInstructionId) {")
$result.Add("                        setSelectedInstructionId(instructions[0].id);")
$result.Add("                      }")
$result.Add("                    }")
$result.Add("                  }}")

# 4. Lines 2450 to 3448 (original, unchanged)
for ($i = 2449; $i -lt 3448; $i++) { $result.Add($lines[$i]) }

# Replace lines 3449-3568 (Tab 2 body) with $tab2Chunk
foreach ($line in $tab2Chunk) { $result.Add($line) }

# 5. Lines 3569 to 3735 (original, unchanged)
for ($i = 3568; $i -lt 3735; $i++) { $result.Add($lines[$i]) }

# Replace lines 3736-3997 (SCREEN 2) by DELETING them entirely (do nothing here)

# 6. Lines 3998 to the end (original, unchanged)
for ($i = 3997; $i -lt $lines.Length; $i++) { $result.Add($lines[$i]) }

Write-Host "New spliced file: $($result.Count) lines"

# Write out with UTF8 with BOM
[System.IO.File]::WriteAllLines($file, $result.ToArray(), $enc)
Write-Host "Splicing completed successfully!"
