# -*- coding: utf-8 -*-
"""Dashboard Module Root"""
import sys
import os

# Ensure Claim/BackEnd is in sys.path so app.core.database and app.modules can be imported cleanly
CLAIM_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Claim", "BackEnd"))
if not os.path.exists(CLAIM_BACKEND_DIR):
    CLAIM_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Claim", "BackEnd"))

if CLAIM_BACKEND_DIR not in sys.path:
    sys.path.insert(0, CLAIM_BACKEND_DIR)
