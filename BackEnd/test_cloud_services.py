# -*- coding: utf-8 -*-
import os
import sys
from dotenv import load_dotenv

# Ensure modules can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from modules.chatbot.services.github_chatbot_service import github_chatbot_service
from modules.chatbot.services.groq_chatbot_service import groq_chatbot_service
from modules.chatbot.services.openrouter_chatbot_service import openrouter_chatbot_service
from modules.chatbot.services.local_gemini_chatbot_service import local_gemini_chatbot_service

print("Checking GITHUB_TOKEN:", bool(os.getenv("GITHUB_TOKEN")))
print("Checking GROQ_API_KEY:", bool(os.getenv("GROQ_API_KEY")))
print("Checking OPENROUTER_API_KEY:", bool(os.getenv("OPENROUTER_API_KEY")))
print("Checking LOCAL_GEMINI_URL:", bool(os.getenv("LOCAL_GEMINI_URL")))

print("\n--- Testing Local Gemini Chatbot Service ---")
if local_gemini_chatbot_service.is_available():
    try:
        res = local_gemini_chatbot_service.chat_with_ai("Chào bạn, hôm nay có bao nhiêu khiếu nại?", db_session=None)
        print("Local Gemini Result:", res.get("intent"), "| Source:", res.get("source"))
        print("Message snippet:", res.get("message")[:200] if res.get("message") else "None")
    except Exception as e:
        print("Local Gemini Error:", e)
else:
    print("Local Gemini Service is not available")

print("\n--- Testing GitHub Chatbot Service ---")
if github_chatbot_service.is_available():
    try:
        res = github_chatbot_service.chat_with_ai("Chào bạn, hôm nay có bao nhiêu khiếu nại?", db_session=None)
        print("GitHub Result:", res.get("intent"), "| Source:", res.get("source"))
        print("Message snippet:", res.get("message")[:200] if res.get("message") else "None")
    except Exception as e:
        print("GitHub Error:", e)
else:
    print("GitHub Service is not available")

print("\n--- Testing Groq Chatbot Service ---")
if groq_chatbot_service.is_available():
    try:
        res = groq_chatbot_service.chat_with_ai("Chào bạn, hôm nay có bao nhiêu khiếu nại?", db_session=None)
        print("Groq Result:", res.get("intent"), "| Source:", res.get("source"))
        print("Message snippet:", res.get("message")[:200] if res.get("message") else "None")
    except Exception as e:
        print("Groq Error:", e)
else:
    print("Groq Service is not available")

print("\n--- Testing OpenRouter Chatbot Service ---")
if openrouter_chatbot_service.is_available():
    try:
        res = openrouter_chatbot_service.chat_with_ai("Chào bạn, hôm nay có bao nhiêu khiếu nại?", db_session=None)
        print("OpenRouter Result:", res.get("intent"), "| Source:", res.get("source"))
        print("Message snippet:", res.get("message")[:200] if res.get("message") else "None")
    except Exception as e:
        print("OpenRouter Error:", e)
else:
    print("OpenRouter Service is not available")

