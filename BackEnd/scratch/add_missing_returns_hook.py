import re

HOOK_PATH = r"M:\ERP\FrontEnd\Web\modules\System\Views\hooks\useScreenDetail.jsx"

with open(HOOK_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the LAST "return {" block
last_ret = content.rfind("return {")
return_content = content[last_ret:]

# Find the closing "};"
closing_idx = return_content.find("};")
main_return = return_content[:closing_idx]

# Let's add the missing returns
missing_returns = [
    'isMockupExpanded', 'setIsMockupExpanded',
    'showZoomModal', 'setShowZoomModal',
    'setCurrentMockupIdx',
    'setActiveComponentMenu',
    'setSelectedGuideIdx',
    'setIsGuideCompDropdownOpen',
    'setViewMode',
    'setIsSpecCardCollapsed',
    'setSpecExportData',
    'getLoggedInUser'
]

# Append them before the closing brace
new_main_return = main_return.rstrip()
for mr in missing_returns:
    if mr not in new_main_return:
        new_main_return += f",\n    {mr}"

new_return_content = new_main_return + "\n  " + return_content[closing_idx:]
new_content = content[:last_ret] + new_return_content

with open(HOOK_PATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Added missing returns successfully!")
