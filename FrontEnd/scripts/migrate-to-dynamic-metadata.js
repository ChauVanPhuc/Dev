/**
 * Script tự động migrate các screens sang sử dụng dynamic metadata
 * 
 * Usage:
 *   node scripts/migrate-to-dynamic-metadata.js
 * 
 * Hoặc chỉ dry-run (không sửa file):
 *   node scripts/migrate-to-dynamic-metadata.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');

// Mapping hardcoded screen codes sang route paths
const SCREEN_MAPPINGS = {
  'AD01': '/admin/dashboard',
  'AD02': '/admin/screens',
  'AD03': '/admin/screens/:id',
  'AD04': '/admin/users',
  'AD05': '/admin/departments',
  'AD06': '/admin/screens/bugs',
  'AD07': '/admin/screens/progress',
  'AD13': '/admin/quality-records',
  'AD13.1': '/admin/quality-records/:id',
  'MA02': '/admin/plans',
  'MA03': '/admin/plans/:id',
  'NS01': '/admin/deliveries',
  'KT01': '/admin/inspections',
  // Thêm các mappings khác...
};

/**
 * Tìm tất cả files .jsx trong thư mục modules
 */
function findJsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findJsxFiles(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Kiểm tra file có sử dụng setCustomScreenCode không
 */
function hasSetCustomScreenCode(content) {
  return content.includes('setCustomScreenCode');
}

/**
 * Extract screen code từ file
 */
function extractScreenCode(content) {
  const match = content.match(/setCustomScreenCode\(['"]([A-Z0-9.]+)['"]\)/);
  return match ? match[1] : null;
}

/**
 * Migrate file sang dynamic metadata
 */
function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!hasSetCustomScreenCode(content)) {
    return { migrated: false, reason: 'No setCustomScreenCode found' };
  }
  
  const screenCode = extractScreenCode(content);
  if (!screenCode) {
    return { migrated: false, reason: 'Could not extract screen code' };
  }
  
  const routePath = SCREEN_MAPPINGS[screenCode];
  if (!routePath) {
    return { migrated: false, reason: `No route mapping for ${screenCode}` };
  }
  
  // Bước 1: Thêm import
  if (!content.includes('useScreenMetadataCached')) {
    const importMatch = content.match(/import.*from ['"]lucide-react['"];/);
    if (importMatch) {
      const importLine = importMatch[0];
      const newImport = `${importLine}\nimport { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';`;
      content = content.replace(importLine, newImport);
    }
  }
  
  // Bước 2: Thêm hook call
  const componentMatch = content.match(/const \w+View = \(\) => \{/);
  if (componentMatch) {
    const hookCall = `\n  // Lấy metadata từ database thay vì hardcode\n  const { screenCode, title, subtitle } = useScreenMetadataCached('${routePath}');\n`;
    
    // Tìm vị trí sau useOutletContext
    const outletMatch = content.match(/const \{ setCustomTitle.*\} = useOutletContext\(\);/);
    if (outletMatch) {
      content = content.replace(outletMatch[0], `${outletMatch[0]}${hookCall}`);
    }
  }
  
  // Bước 3: Thay thế hardcoded metadata
  const oldPattern = /useEffect\(\(\) => \{[\s\S]*?setCustomTitle\(['"](.*?)['"]\);[\s\S]*?setCustomSubtitle\(['"](.*?)['"]\);[\s\S]*?setCustomScreenCode\(['"].*?['"]\);[\s\S]*?\}, \[.*?\]\);/;
  
  const newCode = `useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);`;
  
  if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newCode);
  }
  
  // Lưu file nếu không phải dry-run
  if (!isDryRun) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { 
    migrated: true, 
    screenCode, 
    routePath,
    dryRun: isDryRun
  };
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting migration to dynamic screen metadata...\n');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }
  
  const modulesDir = path.join(__dirname, '..', 'Web', 'modules');
  const jsxFiles = findJsxFiles(modulesDir);
  
  console.log(`📁 Found ${jsxFiles.length} JSX files\n`);
  
  const results = {
    migrated: [],
    skipped: [],
    errors: []
  };
  
  jsxFiles.forEach(filePath => {
    try {
      const result = migrateFile(filePath);
      
      if (result.migrated) {
        results.migrated.push({ filePath, ...result });
        console.log(`✅ ${path.basename(filePath)} - ${result.screenCode} → ${result.routePath}`);
      } else {
        results.skipped.push({ filePath, ...result });
      }
    } catch (error) {
      results.errors.push({ filePath, error: error.message });
      console.error(`❌ ${path.basename(filePath)} - Error: ${error.message}`);
    }
  });
  
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${results.migrated.length}`);
  console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
  console.log(`   ❌ Errors: ${results.errors.length}`);
  
  if (results.migrated.length > 0) {
    console.log('\n📝 Migrated files:');
    results.migrated.forEach(({ filePath, screenCode, routePath }) => {
      console.log(`   - ${path.relative(modulesDir, filePath)} (${screenCode})`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    results.errors.forEach(({ filePath, error }) => {
      console.log(`   - ${path.relative(modulesDir, filePath)}: ${error}`);
    });
  }
  
  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✨ Migration completed!');
  }
}

// Run
main();
