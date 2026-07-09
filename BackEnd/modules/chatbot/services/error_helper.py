# -*- coding: utf-8 -*-
import re

def clean_error_message(e) -> str:
    """
    Cleans up long API error messages (like nested JSON structures in Gemini, Groq, Anthropic exceptions)
    to an ultra-concise, single-line message in Vietnamese.
    """
    error_msg = str(e)
    # Remove newlines and collapse multiple spaces
    error_msg = re.sub(r'\s+', ' ', error_msg)
    
    # If it is a Gemini exception containing JSON, extract the message
    if "RESOURCE_EXHAUSTED" in error_msg:
        match = re.search(r'Quota exceeded for metric: ([^,]+)', error_msg)
        if match:
            metric = match.group(1)
            if "requests" in metric:
                return "Gemini: Hết lượt gọi (429)"
            elif "token" in metric:
                return "Gemini: Hết token/phút (429)"
            return f"Gemini: Quá giới hạn ({metric.split('/')[-1]})"
        return "Gemini: Hết lượt gọi (429)"
        
    # If it is a Anthropic balance error
    if "credit balance is too low" in error_msg.lower():
        return "Anthropic: Hết tiền (400)"
        
    # If it is a Groq rate limit error
    if "rate_limit_exceeded" in error_msg.lower() or "Rate limit reached" in error_msg:
        return "Groq: Quá giới hạn gọi (429)"
        
    # If it is general JSON error structure, try to find a message field
    message_match = re.search(r"'message':\s*'([^']+)'", error_msg)
    if not message_match:
        message_match = re.search(r'"message":\s*"([^"]+)"', error_msg)
        
    if message_match:
        msg_val = message_match.group(1)
        # Translate common messages
        if "credit balance is too low" in msg_val.lower():
            return "Anthropic: Hết tiền (400)"
        if "rate limit" in msg_val.lower():
            return "AI: Quá giới hạn gọi (429)"
        return msg_val
        
    # Limit length to 80 chars
    if len(error_msg) > 80:
        return error_msg[:80] + "..."
        
    return error_msg
