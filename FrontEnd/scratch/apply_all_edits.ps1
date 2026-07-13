# Master script to apply all 3 edits to ISOProcessEditorView.jsx
# Using exact line numbers from the CLEAN file (git checkout version):
#   Edit 1: INSERT new states AFTER line 674
#   Edit 2: REPLACE lines 1350-1480 (CRUD handlers) 
#   Edit 3: REPLACE lines 3736-3997 (step_instructions screen)

$base = "c:\SmartFlow_v2_Test\FrontEnd"
$file = "$base\Web\modules\ISO\Views\ISOProcessEditorView.jsx"

# Read original file preserving encoding
$enc = New-Object System.Text.UTF8Encoding $true
$lines = [System.IO.File]::ReadAllLines($file, $enc)
Write-Host "Original file: $($lines.Length) lines"

# Read replacement chunks
$statesChunk = [System.IO.File]::ReadAllLines("$base\scratch\chunk_states.txt", $enc)
$crudChunk   = [System.IO.File]::ReadAllLines("$base\scratch\chunk_crud.txt", $enc)
$screenChunk = [System.IO.File]::ReadAllLines("$base\scratch\chunk_screen.txt", $enc)

Write-Host "States chunk: $($statesChunk.Length) lines"
Write-Host "CRUD chunk: $($crudChunk.Length) lines"
Write-Host "Screen chunk: $($screenChunk.Length) lines"

# Build output using line ranges (1-indexed in comments, 0-indexed in code)
$result = [System.Collections.Generic.List[string]]::new()

# Part 1: Lines 1-674 (original, unchanged)
for ($i = 0; $i -lt 674; $i++) { $result.Add($lines[$i]) }

# Insert: New states
foreach ($sl in $statesChunk) { $result.Add($sl) }

# Part 2: Lines 675-1349 (original, unchanged)
for ($i = 674; $i -lt 1349; $i++) { $result.Add($lines[$i]) }

# Insert: New CRUD handlers (replacing lines 1350-1480)
foreach ($cl in $crudChunk) { $result.Add($cl) }

# Part 3: Lines 1481-3735 (original, unchanged)
for ($i = 1480; $i -lt 3735; $i++) { $result.Add($lines[$i]) }

# Insert: New screen (replacing lines 3736-3997)
foreach ($scl in $screenChunk) { $result.Add($scl) }

# Part 4: Lines 3998 onwards (original, unchanged - starts with PREVIEW MODAL)
for ($i = 3997; $i -lt $lines.Length; $i++) { $result.Add($lines[$i]) }

Write-Host "Result file: $($result.Count) lines"

# Write output
[System.IO.File]::WriteAllLines($file, $result.ToArray(), $enc)
Write-Host "All 3 edits applied successfully!"
