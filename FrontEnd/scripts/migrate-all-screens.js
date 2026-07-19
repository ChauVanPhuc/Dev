/**
 * Script tự động migrate TẤT CẢ screens sang Dynamic Metadata
 * 
 * Usage:
 *   node scripts/migrate-all-screens.js --dry-run    # Preview changes
 *   node scripts/migrate-all-screens.js              # Apply changes
 *   node scripts/migrate-all-screens.js --file Auth/Views/UserManagementView.jsx  # Migrate specific file
 */

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const specificFile = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1];

// Load mapping từ JSON
const mappingPath = path.join(__dirname, '..', 'SCREEN_ROUTE_MAPPING.json');
const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

// Tạo reverse mapping: file path -> route
const fileToRoute = {};
Object.entries(mappingData.mappings).forEach(([code, data]) => {
  if (data.status !== 'migrated') {
    fileToRoute[data.file] = data.route;
  }
});

console.log('🚀 ERP G7 - Auto Migration to Dynamic Screen Metadata\n');
if (isDryRun) {
  console.log('⚠️  DRY RUN MODE - No files will be modified\n');
}

/**
 * Migrate một file cụ thể
 */
function migrateFile(filePath, routePath) {
  const fullPath = path.join(__dirname, '..', 'Web', 'modules', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: 'File not found' };
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Bước 1: Thêm import nếu chưa có
  if (!content.includes('useScreenMetadataCached')) {
    // Tìm dòng import cuối cùng
    const importMatches = content.match(/import.*from.*['"];/g);
    if (importMatches && importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1];
      const importLine = `import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';`;
      content = content.replace(lastImport, `${lastImport}\n${importLine}`);
    }
  }
  
  // Bước 2: Thêm hook call sau useOutletContext
  if (!content.includes('useScreenMetadataCached(')) {
    const outletPattern = /const \{[^}]*setCustomTitle[^}]*\} = useOutletContext\(\);/;
    const outletMatch = content.match(outletPattern);
    
    if (outletMatch) {
      const hookCall = `\n  \n  // Lấy metadata từ database thay vì hardcode\n  const { screenCode, title, subtitle } = useScreenMetadataCached('${routePath}');`;
      content = content.replace(outletMatch[0], `${outletMatch[0]}${hookCall}`);
    }
  }
  
  // Bước 3: Thay thế hardcoded useEffect
  // Pattern 1: Standard format
  const pattern1 = /useEffect\(\(\) => \{[\s\S]*?setCustomScreenCode\(['"](.*?)['"]\);[\s\S]*?\}, \[[^\]]*\]\);/;
  
  // Pattern 2: With if checks
  const pattern2 = /useEffect\(\(\) => \{[\s\S]*?if \(setCustomScreenCode\)[\s\S]*?setCustomScreenCode\(['"](.*?)['"]\);[\s\S]*?\}, \[[^\]]*\]\);/;
  
  const newUseEffect = `useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);`;
  
  if (pattern1.test(content)) {
    content = content.replace(pattern1, newUseEffect);
  } else if (pattern2.test(content)) {
    content = content.replace(pattern2, newUseEffect);
  }
  
  // Kiểm tra có thay đổi không
  if (content === originalContent) {
    return { success: false, error: 'No changes detected' };
  }
  
  // Lưu file nếu không phải dry-run
  if (!isDryRun) {
    fs.writeFileSync(fullPath, content, 'utf8');
  }
  
  return { success: true };
}

/**
 * Main execution
 */
function main() {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  const filesToMigrate = specificFile 
    ? [[specificFile, fileToRoute[specificFile]]]
    : Object.entries(fileToRoute);
  
  console.log(`📁 Found ${filesToMigrate.length} files to migrate\n`);
  
  filesToMigrate.forEach(([file, route]) => {
    if (!route) {
      results.skipped.push({ file, reason: 'No route mapping' });
      console.log(`⏭️  ${file} - No route mapping`);
      return;
    }
    
    try {
      const result = migrateFile(file, route);
      
      if (result.success) {
        results.success.push({ file, route });
        console.log(`✅ ${file}`);
        console.log(`   Route: ${route}`);
      } else {
        results.failed.push({ file, error: result.error });
        console.log(`❌ ${file} - ${result.error}`);
      }
    } catch (error) {
      results.failed.push({ file, error: error.message });
      console.error(`❌ ${file} - ${error.message}`);
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed:  ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log('='.repeat(60));
  
  if (results.success.length > 0) {
    console.log('\n✅ Successfully migrated:');
    results.success.forEach(({ file, route }) => {
      console.log(`   - ${file}`);
      console.log(`     → ${route}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed to migrate:');
    results.failed.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }
  
  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✨ Migration completed!');
    console.log('📝 Next steps:');
    console.log('   1. Test each migrated screen');
    console.log('   2. Update SCREEN_ROUTE_MAPPING.json status to "migrated"');
    console.log('   3. Clear browser cache and test again');
  }
  
  // Update statistics in mapping file if not dry-run
  if (!isDryRun && results.success.length > 0) {
    mappingData.statistics.migrated += results.success.length;
    mappingData.statistics.pending -= results.success.length;
    
    // Mark migrated files
    results.success.forEach(({ file }) => {
      Object.entries(mappingData.mappings).forEach(([code, data]) => {
        if (data.file === file) {
          data.status = 'migrated';
        }
      });
    });
    
    fs.writeFileSync(mappingPath, JSON.stringify(mappingData, null, 2), 'utf8');
    console.log('\n📊 Updated SCREEN_ROUTE_MAPPING.json statistics');
  }
}

// Run
try {
  main();
} catch (error) {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}
