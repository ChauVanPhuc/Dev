import os

IMG_DIR = r"P:\APP\SmartFlow\SmartFlow_v2_Test\Report\templates\assets\images"
AVATAR_DIR = os.path.join(IMG_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

# 1. Trend Up SVG
trend_up_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="100" height="80">
  <defs>
    <linearGradient id="gradGreen" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path d="M 10 70 L 35 45 L 55 55 L 85 15" fill="none" stroke="url(#gradGreen)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
  <polygon points="85,10 95,28 72,25" fill="#10B981" filter="url(#glow)"/>
  <circle cx="35" cy="45" r="4" fill="#34D399" />
  <circle cx="55" cy="55" r="4" fill="#34D399" />
</svg>"""

with open(os.path.join(IMG_DIR, "trend_up.svg"), "w", encoding="utf-8") as f:
    f.write(trend_up_svg)

# 2. Factory / Building Banner SVG
building_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 100" width="180" height="100">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0F2FE"/>
      <stop offset="100%" stop-color="#BAE6FD"/>
    </linearGradient>
    <linearGradient id="bldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0284C7"/>
      <stop offset="100%" stop-color="#0369A1"/>
    </linearGradient>
  </defs>
  <!-- Background Cloud/Glow -->
  <ellipse cx="90" cy="70" rx="80" ry="25" fill="#E2E8F0" opacity="0.6"/>
  <!-- Trees -->
  <circle cx="25" cy="75" r="14" fill="#10B981"/>
  <circle cx="155" cy="75" r="14" fill="#059669"/>
  <!-- Main Building -->
  <polygon points="50,30 110,20 145,35 90,48" fill="#38BDF8"/>
  <polygon points="50,30 90,48 90,85 50,70" fill="url(#bldGrad)"/>
  <polygon points="90,48 145,35 145,72 90,85" fill="#075985"/>
  <!-- Windows -->
  <rect x="58" y="42" width="10" height="8" rx="1" fill="#FFFFFF" opacity="0.9" transform="skewY(20)"/>
  <rect x="74" y="48" width="10" height="8" rx="1" fill="#FFFFFF" opacity="0.9" transform="skewY(20)"/>
  <rect x="58" y="56" width="10" height="8" rx="1" fill="#FFFFFF" opacity="0.9" transform="skewY(20)"/>
  <rect x="74" y="62" width="10" height="8" rx="1" fill="#FFFFFF" opacity="0.9" transform="skewY(20)"/>
  <rect x="100" y="48" width="12" height="8" rx="1" fill="#BAE6FD" opacity="0.9" transform="skewY(-12)"/>
  <rect x="120" y="44" width="12" height="8" rx="1" fill="#BAE6FD" opacity="0.9" transform="skewY(-12)"/>
  <!-- Signboard -->
  <rect x="75" y="10" width="85" height="22" rx="4" fill="#FFFFFF" stroke="#0284C7" stroke-width="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"/>
  <text x="117" y="20" font-family="Segoe UI, sans-serif" font-size="7" font-weight="bold" fill="#0369A1" text-anchor="middle">SMARTFLOW ERP V3</text>
  <text x="117" y="28" font-family="Segoe UI, sans-serif" font-size="7" font-weight="bold" fill="#0D9488" text-anchor="middle">QLCL FACTORY</text>
</svg>"""

with open(os.path.join(IMG_DIR, "building_banner.svg"), "w", encoding="utf-8") as f:
    f.write(building_svg)

# 3. Avatars
def make_avatar(hair_color, skin_color, shirt_color, is_female=False):
    hair_path = '<path d="M 20 28 Q 20 10 32 10 Q 44 10 44 28 Z" fill="{}" />' if not is_female else '<path d="M 18 36 Q 16 10 32 10 Q 48 10 46 36 Q 44 45 42 48 Q 32 40 22 48 Z" fill="{}" />'
    hair_path = hair_path.format(hair_color)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
  <circle cx="32" cy="32" r="30" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="2"/>
  <!-- Body/Shirt -->
  <path d="M 14 56 C 14 44 22 40 32 40 C 42 40 50 44 50 56 Z" fill="{shirt_color}" />
  <!-- Collar -->
  <polygon points="28,40 32,45 36,40" fill="#FFFFFF" />
  <!-- Hair Back -->
  {hair_path}
  <!-- Face -->
  <circle cx="32" cy="27" r="13" fill="{skin_color}" />
  <!-- Eyes -->
  <circle cx="28" cy="26" r="1.8" fill="#1E293B" />
  <circle cx="36" cy="26" r="1.8" fill="#1E293B" />
  <!-- Smile -->
  <path d="M 28 32 Q 32 36 36 32" fill="none" stroke="#1E293B" stroke-width="1.5" stroke-linecap="round"/>
</svg>"""

avatars = {
    "avatar_1.svg": make_avatar("#1E293B", "#FDE047", "#3B82F6", is_female=False),
    "avatar_2.svg": make_avatar("#7C2D12", "#FED7AA", "#EC4899", is_female=True),
    "avatar_3.svg": make_avatar("#334155", "#FDE68A", "#10B981", is_female=False),
    "avatar_4.svg": make_avatar("#0F172A", "#FCD34D", "#F97316", is_female=False),
    "avatar_default.svg": make_avatar("#475569", "#FEF08A", "#64748B", is_female=False),
}

for name, svg_code in avatars.items():
    with open(os.path.join(AVATAR_DIR, name), "w", encoding="utf-8") as f:
        f.write(svg_code)

print("SVG assets created successfully!")
