# Script to replace scoped CSS blocks with gold-layout class
# For each file, replace the container div + scoped style block with just gold-layout

$files = @(
    'modules\Product\Views\List\ProductsListView.jsx',
    'modules\Product\Views\Materials\MaterialBOMsView.jsx',
    'modules\Purchasing\Views\Requisition\PurchaseRequisitionListView.jsx',
    'modules\Purchasing\Views\Monitoring\OrderShippingMonitoringView.jsx'
)

$basePath = 'd:\SmartFlow_v2_Test\FrontEnd\Web'

foreach ($f in $files) {
    $fullPath = Join-Path $basePath $f
    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP: $f (not found)"
        continue
    }
    
    $content = [System.IO.File]::ReadAllText($fullPath)
    
    # Pattern: replace container div with scoped style, keeping sticky-top-zone
    # Match: <div className="manufacture-plan-container mgmt-container xxx-unified-container" style={{ ... }}>
    #   {/* Scoped CSS ... */}
    #   <style dangerouslySetInnerHTML={{ __html: `...`}} />
    # Replace with: <div className="gold-layout">
    
    $pattern = '<div className="manufacture-plan-container mgmt-container [^"]*unified-container"[^>]*>'
    $content = [regex]::Replace($content, $pattern, '<div className="gold-layout">')
    
    # Remove scoped style blocks
    $stylePattern = '(?s)\s*\{/\* Scoped CSS to enforce Gold Standard[^}]*\*/\}\s*<style dangerouslySetInnerHTML=\{\{ __html: `.*?`\s*\}\} />'
    $content = [regex]::Replace($content, $stylePattern, '')
    
    [System.IO.File]::WriteAllText($fullPath, $content)
    Write-Host "DONE: $f"
}

Write-Host "`nAll files processed."
