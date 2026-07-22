import re

VIEW_PATH = r"M:\ERP\FrontEnd\Web\modules\System\Views\Screen\ScreenDetailView.jsx"
COMPONENTS = {
    'ComponentTreePane': r"M:\ERP\FrontEnd\Web\modules\System\Views\components\ScreenDetail\ComponentTreePane.jsx",
    'SimulatorPane': r"M:\ERP\FrontEnd\Web\modules\System\Views\components\ScreenDetail\SimulatorPane.jsx",
    'InspectorPane': r"M:\ERP\FrontEnd\Web\modules\System\Views\components\ScreenDetail\InspectorPane.jsx",
    'BugListTable': r"M:\ERP\FrontEnd\Web\modules\System\Views\components\ScreenDetail\BugListTable.jsx"
}

with open(VIEW_PATH, 'r', encoding='utf-8') as f:
    view_content = f.read()

for name, path in COMPONENTS.items():
    with open(path, 'r', encoding='utf-8') as f:
        comp_content = f.read()
    
    # Get destructured props
    match = re.search(r'const ' + name + r' = \(\{(.*?)\}\) =>', comp_content, re.DOTALL)
    if not match:
        # try function format
        match = re.search(r'function ' + name + r'\(\{(.*?)\}\)', comp_content, re.DOTALL)
        
    if match:
        comp_props = [p.strip() for p in match.group(1).split(',') if p.strip()]
        # Strip comments
        comp_props = [p for p in comp_props if not p.startswith('//')]
    else:
        comp_props = []
        
    # Get what is passed in view
    # Match block like <ComponentTreePane ... />
    # We find the start tag and search up to the next />
    tag_start = view_content.find('<' + name)
    if tag_start != -1:
        tag_end = view_content.find('/>', tag_start)
        tag_block = view_content[tag_start:tag_end]
        passed_attrs = re.findall(r'\b([a-zA-Z0-9_]+)\s*=', tag_block)
    else:
        passed_attrs = []
        
    print(f"=== {name} ===")
    print("Expected props (in component):", comp_props)
    print("Passed props (in view):", passed_attrs)
    # Find missing
    # Let's map passed_attrs (which is attr=...) to expected props
    missing = [p for p in comp_props if p not in passed_attrs and p != 'onSelectComponent' and p != 'setActiveComponent']
    # If onSelectComponent is passed instead of setActiveComponent
    if 'setActiveComponent' in comp_props and 'onSelectComponent' in passed_attrs:
        print("Note: setActiveComponent is matched by onSelectComponent")
    else:
        if 'setActiveComponent' in comp_props and 'setActiveComponent' not in passed_attrs:
            missing.append('setActiveComponent')
            
    print("MISSING:", missing)
    print()
