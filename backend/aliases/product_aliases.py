"""
Product aliases — deterministic lookup table for Telugu, Hindi, and English
inventory terms. Used as a fast pre-pass before fuzzy matching.

Structure:
  alias (lowercase, stripped) → canonical product name hint

These are hints for the search service, not overrides. The database is still
the authoritative source of what products actually exist.
"""

# Reverse alias map: alias_normalised → canonical_name
# The search service will then look up the canonical name in MongoDB.
ALIAS_TABLE: dict[str, str] = {
    # ── Rice / Biyyam ──────────────────────────────────────────────────────────
    "biyyam": "Rice",
    "బియ్యం": "Rice",
    "chawal": "Rice",
    "चावल": "Rice",
    "rice": "Rice",

    # ── Sugar / Cheeni ─────────────────────────────────────────────────────────
    "cheeni": "Sugar",
    "చక్కెర": "Sugar",
    "chini": "Sugar",
    "चीनी": "Sugar",
    "shakkar": "Sugar",
    "sugar": "Sugar",

    # ── Salt / Uppu ────────────────────────────────────────────────────────────
    "uppu": "Tata Salt",
    "ఉప్పు": "Tata Salt",
    "namak": "Tata Salt",
    "नमक": "Tata Salt",
    "salt": "Tata Salt",
    "tata salt": "Tata Salt",

    # ── Oil / Tel ──────────────────────────────────────────────────────────────
    "nune": "Sunflower Oil",
    "నూనె": "Sunflower Oil",
    "tel": "Sunflower Oil",
    "तेल": "Sunflower Oil",
    "sunflower oil": "Sunflower Oil",
    "fortune oil": "Sunflower Oil",
    "aavala nune": "Mustard Oil",
    "ఆవాల నూనె": "Mustard Oil",
    "sarson tel": "Mustard Oil",
    "सरसों तेल": "Mustard Oil",
    "mustard oil": "Mustard Oil",

    # ── Parle-G ────────────────────────────────────────────────────────────────
    "parle g": "Parle-G",
    "parle-g": "Parle-G",
    "parle ji": "Parle-G",
    "parle g biscuits": "Parle-G",
    "పార్లే జీ": "Parle-G",

    # ── Toor Dal ───────────────────────────────────────────────────────────────
    "kandi pappu": "Toor Dal",
    "కంది పప్పు": "Toor Dal",
    "arhar dal": "Toor Dal",
    "अरहर दाल": "Toor Dal",
    "toor dal": "Toor Dal",

    # ── Atta ───────────────────────────────────────────────────────────────────
    "atta": "Aashirvaad Atta",
    "goduma pindi": "Aashirvaad Atta",
    "గోధుమ పిండి": "Aashirvaad Atta",
    "आटा": "Aashirvaad Atta",
    "wheat flour": "Aashirvaad Atta",

    # ── Lux Soap ───────────────────────────────────────────────────────────────
    "lux": "Lux Soap",
    "lux bar": "Lux Soap",
    "lux soap": "Lux Soap",

    # ── Vim ────────────────────────────────────────────────────────────────────
    "vim": "Vim Bar",
    "vim bar": "Vim Bar",
    "vim dish wash": "Vim Bar",
}

# Verb aliases — for deterministic intent hints (supplementing AI)
STOCK_IN_VERBS = {
    "vachayi", "వచ్చాయి", "vachindi", "వచ్చింది",
    "received", "came", "arrived", "add", "added",
    "aaya", "aaye", "आया", "आये",
    "stock in", "stock received",
    "add cheyyi", "add cheyyandi",
}

STOCK_OUT_VERBS = {
    "ammamu", "అమ్మము", "ammindi", "అమ్మింది",
    "sold", "sale", "remove", "removed",
    "poyindi", "పోయింది",
    "becha", "बेचा",
    "stock out", "nikla", "निकला",
}

QUERY_VERBS = {
    "entha undi", "ఎంత ఉంది", "entha",
    "how much", "how many", "kitna", "कितना", "kितनी",
    "stock entha", "check", "status",
}


def normalise(text: str) -> str:
    """Lowercase, strip, collapse whitespace for alias lookup."""
    return " ".join(text.lower().strip().split())


def lookup_alias(text: str) -> str | None:
    """Return canonical product name if the text matches a known alias."""
    return ALIAS_TABLE.get(normalise(text))
