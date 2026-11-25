# -*- coding: utf-8 -*-
"""Base specification for SmartFlow ChatBot v2 Domains."""
from dataclasses import dataclass, field
from typing import List, Set


@dataclass
class DomainSpec:
    key: str
    title: str
    description: str
    keywords: List[str]
    route_prefixes: List[str]
    tables: Set[str]
    required_permissions: List[str]
    schema_text: str
    business_rules: str = ""
    examples: str = ""
    public_read: bool = False

