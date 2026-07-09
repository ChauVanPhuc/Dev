# -*- coding: utf-8 -*-
import re
from difflib import get_close_matches

def correct_typos(filters: dict, all_claims: list) -> dict:
    """
    Corrects SKU and defect code typos/partial inputs by matching against the active dataset.
    Uses fuzzy matching for better accuracy.
    """
    if not all_claims:
        return filters
        
    # Correct SKU
    if "sku" in filters:
        user_sku = filters["sku"].upper()
        # Get all unique SKUs in dataset
        unique_skus = sorted(list(set(c["sku"].upper() for c in all_claims if c.get("sku"))))
        if user_sku not in unique_skus:
            # Try exact prefix match first
            matches = [s for s in unique_skus if s.startswith(user_sku)]
            # If no prefix match, try substring match
            if not matches:
                matches = [s for s in unique_skus if user_sku in s]
            # If still no match, try fuzzy matching
            if not matches and len(user_sku) >= 3:
                fuzzy_matches = get_close_matches(user_sku, unique_skus, n=1, cutoff=0.6)
                if fuzzy_matches:
                    matches = fuzzy_matches
            if matches:
                # Pick the first match
                filters["sku"] = matches[0]
                
    # Correct Defect Code / Company Error Code
    if "defect_code" in filters:
        user_dc = filters["defect_code"].upper()
        # Strip non-alphanumeric to normalize
        clean_user_dc = re.sub(r'[^A-Z0-9]', '', user_dc)
        
        # Collect unique defect codes and company error codes
        unique_codes = set()
        for c in all_claims:
            if c.get("defect_code"):
                unique_codes.add(c["defect_code"].upper())
            if c.get("company_error_code"):
                unique_codes.add(c["company_error_code"].upper())
                
        unique_codes = sorted(list(unique_codes))
        if user_dc not in unique_codes:
            matched_code = None
            # Try exact match after cleaning
            for code in unique_codes:
                clean_code = re.sub(r'[^A-Z0-9]', '', code)
                if clean_user_dc == clean_code:
                    matched_code = code
                    break
            if not matched_code:
                # Try prefix match of clean versions
                for code in unique_codes:
                    clean_code = re.sub(r'[^A-Z0-9]', '', code)
                    if clean_code.startswith(clean_user_dc):
                        matched_code = code
                        break
            if not matched_code:
                # Try substring match of clean versions
                for code in unique_codes:
                    clean_code = re.sub(r'[^A-Z0-9]', '', code)
                    if clean_user_dc in clean_code:
                        matched_code = code
                        break
            if not matched_code and len(clean_user_dc) >= 3:
                # Try fuzzy matching on cleaned codes
                clean_codes = [re.sub(r'[^A-Z0-9]', '', c) for c in unique_codes]
                fuzzy_matches = get_close_matches(clean_user_dc, clean_codes, n=1, cutoff=0.6)
                if fuzzy_matches:
                    # Find the original code that matches the fuzzy match
                    for i, clean_code in enumerate(clean_codes):
                        if clean_code == fuzzy_matches[0]:
                            matched_code = unique_codes[i]
                            break
            if matched_code:
                filters["defect_code"] = matched_code
    
    # Correct Action with fuzzy matching
    if "action" in filters:
        user_action = filters["action"].lower()
        unique_actions = sorted(list(set(c["action"].lower() for c in all_claims if c.get("action"))))
        if user_action not in unique_actions:
            # Try fuzzy matching
            fuzzy_matches = get_close_matches(user_action, unique_actions, n=1, cutoff=0.5)
            if fuzzy_matches:
                filters["action"] = fuzzy_matches[0]
                
    return filters
