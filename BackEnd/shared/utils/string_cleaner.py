import re

def clean_and_standardize_sku(sku: str) -> str:
    """
    Standardizes SKU: trimmed and fully capitalized.
    """
    if not sku:
        return ""
    return str(sku).strip().upper()

def clean_and_standardize_name(name: str) -> str:
    """
    Standardizes name: trimmed, reduces multiple spaces.
    Capitalizes first word. Keeps alphanumeric symbols (like G7, 1a) exactly as they are.
    If the name (excluding codes) is fully uppercase, standardizes other words to lower.
    """
    if not name:
        return ""
    
    # Trim and merge spaces
    name = str(name).strip()
    name = re.sub(r'\s+', ' ', name)
    if not name:
        return ""
        
    def is_alphanumeric_code(w: str) -> bool:
        # Check if the word contains both letters and numbers
        # Remove any non-alphanumeric chars (like hyphens in DP-001) first
        clean_w = re.sub(r'[^\w]', '', w)
        return any(c.isalpha() for c in clean_w) and any(c.isdigit() for c in clean_w)
        
    words = name.split(' ')
    
    # We want to know if the string was originally all-caps (excluding alphanumeric codes)
    non_code_words = [w for w in words if not is_alphanumeric_code(w)]
    is_originally_upper = all(w.isupper() for w in non_code_words if any(c.isalpha() for c in w))
    
    new_words = []
    for i, w in enumerate(words):
        if is_alphanumeric_code(w):
            # Keep alphanumeric code exactly as it is (preserve original casing)
            new_words.append(w)
        else:
            if is_originally_upper:
                if i == 0:
                    new_words.append(w.capitalize())
                else:
                    new_words.append(w.lower())
            else:
                if i == 0:
                    new_words.append(w[0].upper() + w[1:] if w else "")
                else:
                    new_words.append(w)
                    
    return ' '.join(new_words)
