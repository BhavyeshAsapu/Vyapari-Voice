"""
ProductSearchService — searches MongoDB for products using a 4-pass strategy:

Pass 1: Exact name match (case-insensitive)
Pass 2: Alias table lookup → then exact name match
Pass 3: Brand match combined with AI product name
Pass 4: Fuzzy matching on stored aliases array (threshold ≥ 0.82)

Returns MATCHED, AMBIGUOUS, or NOT_FOUND.

Rule: Never automatically select a weak fuzzy match. If multiple products
score similarly (within 5 points), return AMBIGUOUS and let the user choose.
"""
import logging
import unicodedata
import difflib
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.voice import ProductMatch
from aliases.product_aliases import lookup_alias, normalise


logger = logging.getLogger(__name__)

FUZZY_THRESHOLD = 0.72   # 0..1 scale (difflib ratio)
AMBIGUOUS_WINDOW = 0.08  # If top two scores are within this → AMBIGUOUS


def _fuzzy_ratio(a: str, b: str) -> float:
    """
    Token-set fuzzy ratio using stdlib difflib.
    Works even when word order differs (e.g. "Parle G" vs "G Parle").
    """
    # Try direct ratio
    direct = difflib.SequenceMatcher(None, a, b).ratio()
    # Also try sorted tokens (token-set approximation)
    a_tokens = " ".join(sorted(a.split()))
    b_tokens = " ".join(sorted(b.split()))
    token_set = difflib.SequenceMatcher(None, a_tokens, b_tokens).ratio()
    return max(direct, token_set)


def _normalise_unicode(text: str) -> str:
    """NFC normalize + casefold for Unicode-safe comparison."""
    return unicodedata.normalize("NFC", text).casefold().strip()


def _product_to_candidate(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "brand": doc.get("brand"),
        "category": doc.get("category"),
        "unit": doc.get("unit"),
        "currentStock": doc.get("currentStock", 0),
    }


class ProductSearchService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self._db = db

    async def search(
        self,
        product_name: str,
        brand: Optional[str] = None,
        category: Optional[str] = None,
        aliases: Optional[list[str]] = None,
    ) -> ProductMatch:
        """
        Search for a product using 4-pass strategy.
        Returns a ProductMatch with status MATCHED, AMBIGUOUS, or NOT_FOUND.
        """
        name_norm = _normalise_unicode(product_name)
        all_products = await self._get_all_products()

        # Pass 1: Exact name match (case-insensitive)
        exact = [
            p for p in all_products
            if _normalise_unicode(p["name"]) == name_norm
        ]
        if len(exact) == 1:
            logger.info(f"Pass 1 exact match: {exact[0]['name']}")
            return _matched(exact[0])
        if len(exact) > 1:
            return _ambiguous(exact)

        # Pass 2: Alias table lookup
        canonical = lookup_alias(product_name)
        if not canonical:
            # Try each alias from AI's possibleAliases
            for alias in (aliases or []):
                canonical = lookup_alias(alias)
                if canonical:
                    break

        if canonical:
            canon_norm = _normalise_unicode(canonical)
            alias_matches = [
                p for p in all_products
                if _normalise_unicode(p["name"]) == canon_norm
            ]
            if len(alias_matches) == 1:
                logger.info(f"Pass 2 alias match: {alias_matches[0]['name']}")
                return _matched(alias_matches[0])

        # Pass 3: Search stored aliases array in MongoDB
        db_alias_matches = await self._search_by_alias(name_norm, aliases or [])
        if len(db_alias_matches) == 1:
            logger.info(f"Pass 3 db-alias match: {db_alias_matches[0]['name']}")
            return _matched(db_alias_matches[0])
        if len(db_alias_matches) > 1:
            return _ambiguous(db_alias_matches)

        # Pass 4: Fuzzy matching across name + stored aliases
        scored = []
        for p in all_products:
            # Score against product name
            score = _fuzzy_ratio(name_norm, _normalise_unicode(p["name"]))
            # Also score against stored aliases
            for alias in p.get("aliases", []):
                alias_score = _fuzzy_ratio(name_norm, _normalise_unicode(alias))
                score = max(score, alias_score)
            scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)

        if not scored or scored[0][0] < FUZZY_THRESHOLD:
            logger.info(f"Pass 4 fuzzy: no match above threshold ({scored[0][0] if scored else 0})")
            return ProductMatch(status="NOT_FOUND")

        top_score, top_product = scored[0]
        second_score = scored[1][0] if len(scored) > 1 else 0

        if top_score - second_score <= AMBIGUOUS_WINDOW and second_score >= FUZZY_THRESHOLD:
            # Too close to call — return ambiguous candidates
            candidates = [p for s, p in scored if s >= FUZZY_THRESHOLD][:5]
            logger.info(f"Pass 4 fuzzy ambiguous: {[c['name'] for c in candidates]}")
            return _ambiguous(candidates)

        logger.info(f"Pass 4 fuzzy match: {top_product['name']} (score={top_score})")
        return _matched(top_product)

    async def _get_all_products(self) -> list[dict]:
        cursor = self._db.products.find({})
        return await cursor.to_list(length=None)

    async def _search_by_alias(self, name_norm: str, extra_aliases: list[str]) -> list[dict]:
        """Search the aliases array field in MongoDB."""
        all_terms = [name_norm] + [_normalise_unicode(a) for a in extra_aliases]
        # Build regex patterns for each term
        import re
        patterns = [{"aliases": {"$regex": re.escape(term), "$options": "i"}} for term in all_terms]
        cursor = self._db.products.find({"$or": patterns})
        return await cursor.to_list(length=None)


def _matched(product: dict) -> ProductMatch:
    return ProductMatch(
        status="MATCHED",
        productId=str(product["_id"]),
        name=product["name"],
        brand=product.get("brand"),
        unit=product.get("unit"),
        currentStock=product.get("currentStock", 0),
    )


def _ambiguous(products: list[dict]) -> ProductMatch:
    return ProductMatch(
        status="AMBIGUOUS",
        candidates=[_product_to_candidate(p) for p in products],
    )
