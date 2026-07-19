#!/usr/bin/env python3
"""
Script Python tự động migrate TẤT CẢ screens sang Dynamic Metadata
Mạnh mẽ hơn JavaScript version, xử lý được nhiều edge cases

Usage:
    python scripts/auto-migrate-all.py --dry-run    # Preview
    python scripts/auto-migrate-all.py              # Apply
    python scripts/auto-migrate-all.py --module Auth  # Migrate specific module
"""

import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def load_mapping() -> Dict:
    """Load screen mapping từ JSON file"""
    mapping_path = Path(__file__).parent.parent / 'SCREEN_ROUTE_MAPPING.json'
    with open(mapping_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def find_jsx_files(base_dir: Path) -> List[Path]:
    """Tìm tất cả .jsx files trong modules"""
    jsx_files = []
    modules_dir = base_dir / 'Web' / 'modules'
    
    for file_path in modules_dir.rglob('*.jsx'):
        jsx_files.append(file_path)
    
    return jsx_files

def has_set_custom_screen_code(content: str) -> bool:
    """Kiểm tra file có sử dụng setCustomScreenCode không"""
    return 'setCustomScreenCode' in content

def extract_screen_code(content: str) -> Optional[str]:
    """Extract screen code từ file"""
    patterns = [
        r"setCustomScreenCode\(['\"]([A-Z0-9.]+)['\"]\)",
        r"if \(setCustomScreenCode\) setCustomScreenCode\(['\"]([A-Z0-9.]+)['\"]\)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            return match.group(1)
    
    return None

def get_route_for_file(file_path: Path, mapping: Dict) -> Optional[str]:
    """Lấy route path cho file từ mapping"""
    relative_path = str(file_path).split('modules\\')[-1].replace('\\', '/')
    
    for screen_code, data in mapping['mappings'].items():
        if data.get('file') == relative_path:
            return data.get('route')
    
    return None

def migrate_file(file_path: Path, route_path: str, dry_run: bool = False) -> Tuple[bool, str]:
    """
    Migrate một file sang dynamic metadata
    Returns: (success, message)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Step 1: Add import if not exists
        if 'useScreenMetadataCached' not in content:
            # Tìm import cuối cùng
            import_pattern = r"(import.*from.*['\"];)\n"
            imports = list(re.finditer(import_pattern, content))
            
            if imports:
                last_import = imports[-1]
                import_line = "import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';"
                content = content[:last_import.end()] + import_line + '\n' + content[last_import.end():]
        
        # Step 2: Add hook call after useOutletContext
        if 'useScreenMetadataCached(' not in content:
            # Pattern 1: const { setCustomTitle, ... } = useOutletContext();
            outlet_pattern1 = r"(const \{[^}]*setCustomTitle[^}]*\} = useOutletContext\(\);)"
            
            # Pattern 2: const outletContext = useOutletContext(); const setCustomTitle = ...
            outlet_pattern2 = r"(const setCustomScreenCode = outletContext\?\.setCustomScreenCode;)"
            
            hook_call = f"\n  \n  // Lấy metadata từ database thay vì hardcode\n  const {{ screenCode, title, subtitle }} = useScreenMetadataCached('{route_path}');"
            
            if re.search(outlet_pattern1, content):
                content = re.sub(outlet_pattern1, r'\1' + hook_call, content)
            elif re.search(outlet_pattern2, content):
                content = re.sub(outlet_pattern2, r'\1' + hook_call, content)
        
        # Step 3: Replace hardcoded useEffect
        # Pattern 1: Standard format
        useeffect_pattern1 = r"useEffect\(\(\) => \{[\s\S]*?setCustomScreenCode\(['\"][A-Z0-9.]+['\"]\);[\s\S]*?\}, \[[^\]]*\]\);"
        
        # Pattern 2: With if checks
        useeffect_pattern2 = r"useEffect\(\(\) => \{[\s\S]*?if \(setCustomScreenCode\)[\s\S]*?setCustomScreenCode\(['\"][A-Z0-9.]+['\"]\);[\s\S]*?\}, \[[^\]]*\]\);"
        
        new_useeffect = """useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);"""
        
        if re.search(useeffect_pattern1, content):
            content = re.sub(useeffect_pattern1, new_useeffect, content)
        elif re.search(useeffect_pattern2, content):
            content = re.sub(useeffect_pattern2, new_useeffect, content)
        
        # Check if any changes were made
        if content == original_content:
            return False, "No changes detected"
        
        # Save file if not dry-run
        if not dry_run:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        return True, "Success"
        
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    """Main execution"""
    dry_run = '--dry-run' in sys.argv
    specific_module = None
    
    for arg in sys.argv:
        if arg.startswith('--module='):
            specific_module = arg.split('=')[1]
    
    print(f"{Colors.BOLD}🚀 ERP G7 - Auto Migration to Dynamic Screen Metadata{Colors.RESET}\n")
    
    if dry_run:
        print(f"{Colors.YELLOW}⚠️  DRY RUN MODE - No files will be modified{Colors.RESET}\n")
    
    # Load mapping
    base_dir = Path(__file__).parent.parent
    mapping = load_mapping()
    
    # Find all JSX files
    jsx_files = find_jsx_files(base_dir)
    print(f"📁 Found {len(jsx_files)} JSX files\n")
    
    # Results tracking
    results = {
        'success': [],
        'failed': [],
        'skipped': []
    }
    
    # Process each file
    for file_path in jsx_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Skip if doesn't use setCustomScreenCode
            if not has_set_custom_screen_code(content):
                continue
            
            # Skip if already migrated
            if 'useScreenMetadataCached' in content:
                results['skipped'].append({
                    'file': file_path.name,
                    'reason': 'Already migrated'
                })
                continue
            
            # Get route for this file
            route = get_route_for_file(file_path, mapping)
            
            if not route:
                results['skipped'].append({
                    'file': file_path.name,
                    'reason': 'No route mapping'
                })
                continue
            
            # Filter by module if specified
            if specific_module:
                if specific_module not in str(file_path):
                    continue
            
            # Migrate the file
            success, message = migrate_file(file_path, route, dry_run)
            
            if success:
                results['success'].append({
                    'file': file_path.name,
                    'path': str(file_path),
                    'route': route
                })
                print(f"{Colors.GREEN}✅ {file_path.name}{Colors.RESET}")
                print(f"   Route: {route}")
            else:
                results['failed'].append({
                    'file': file_path.name,
                    'error': message
                })
                print(f"{Colors.RED}❌ {file_path.name} - {message}{Colors.RESET}")
                
        except Exception as e:
            results['failed'].append({
                'file': file_path.name,
                'error': str(e)
            })
            print(f"{Colors.RED}❌ {file_path.name} - {str(e)}{Colors.RESET}")
    
    # Summary
    print('\n' + '=' * 60)
    print(f"{Colors.BOLD}📊 MIGRATION SUMMARY{Colors.RESET}")
    print('=' * 60)
    print(f"{Colors.GREEN}✅ Success: {len(results['success'])}{Colors.RESET}")
    print(f"{Colors.RED}❌ Failed:  {len(results['failed'])}{Colors.RESET}")
    print(f"{Colors.YELLOW}⏭️  Skipped: {len(results['skipped'])}{Colors.RESET}")
    print('=' * 60)
    
    if results['success']:
        print(f"\n{Colors.GREEN}✅ Successfully migrated:{Colors.RESET}")
        for item in results['success']:
            print(f"   - {item['file']}")
            print(f"     → {item['route']}")
    
    if results['failed']:
        print(f"\n{Colors.RED}❌ Failed to migrate:{Colors.RESET}")
        for item in results['failed']:
            print(f"   - {item['file']}: {item['error']}")
    
    if dry_run:
        print(f"\n{Colors.BLUE}💡 Run without --dry-run to apply changes{Colors.RESET}")
    else:
        print(f"\n{Colors.GREEN}✨ Migration completed!{Colors.RESET}")
        print(f"{Colors.BLUE}📝 Next steps:{Colors.RESET}")
        print("   1. Test each migrated screen")
        print("   2. Update MIGRATION_STATUS.md")
        print("   3. Commit changes")
        
        # Update mapping file
        if results['success']:
            mapping['statistics']['migrated'] += len(results['success'])
            mapping['statistics']['pending'] -= len(results['success'])
            
            # Mark as migrated
            for item in results['success']:
                for code, data in mapping['mappings'].items():
                    if data.get('route') == item['route']:
                        data['status'] = 'migrated'
            
            mapping_path = base_dir / 'SCREEN_ROUTE_MAPPING.json'
            with open(mapping_path, 'w', encoding='utf-8') as f:
                json.dump(mapping, f, indent=2, ensure_ascii=False)
            
            print(f"\n{Colors.GREEN}📊 Updated SCREEN_ROUTE_MAPPING.json{Colors.RESET}")

if __name__ == '__main__':
    main()
