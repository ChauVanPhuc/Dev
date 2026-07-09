# -*- coding: utf-8 -*-
"""
Shared utility helper functions for Backend Claim module
"""
import re

def normalize_penalty_value(val):
    if not val:
        return ""
    clean = str(val).strip()
    
    # Custom case-insensitive mappings:
    lower = clean.lower()
    if lower == 'x2 unit':
        return 'X2 Unit'
    if lower in ('full bc', 'ful bc'):
        return 'Full BC'
    if lower in ('repair, full bc', 'repair, ful bc'):
        return 'Repair, Full BC'
    if lower == 'repair, $50':
        return 'Repair, $50'
        
    # General fallback: title case but keep BC uppercase
    words = clean.split()
    title_cased_words = []
    for w in words:
        w_upper = w.upper()
        if w_upper in ('BC', 'BC,'):
            title_cased_words.append(w_upper)
            continue
            
        has_comma = w.endswith(',')
        base = w[:-1] if has_comma else w
        
        capitalized_base = base
        if len(base) > 0:
            if base.startswith('$'):
                capitalized_base = base
            else:
                capitalized_base = base[0].upper() + base[1:].lower()
        title_cased_words.append(capitalized_base + (',' if has_comma else ''))
        
    result = ' '.join(title_cased_words)
    # Apply standard typo adjustments
    result = re.sub(r'\bFul\b', 'Full', result)
    result = re.sub(r'\bx2\b', 'X2', result)
    result = re.sub(r'\bbc\b', 'BC', result, flags=re.IGNORECASE)
    return result
