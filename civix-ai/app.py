"""
Civix AI Complaint Analysis Service
Python Flask microservice for complaint categorization, priority suggestion, and duplicate detection
"""

from flask import Flask, request, jsonify
try:
    from flask_cors import CORS
except Exception:
    # Minimal CORS fallback for environments without flask_cors installed
    def CORS(app, resources={r"/*": {"origins": "*"}}):
        @app.after_request
        def _cors(response):
            response.headers.setdefault("Access-Control-Allow-Origin", "*")
            response.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            response.headers.setdefault("Access-Control-Allow-Headers", "Content-Type,Authorization")
            return response
        return None

import re
import math
from collections import defaultdict
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ──────────────────────────────────────────────────────────────
# Knowledge base: category keywords
# ──────────────────────────────────────────────────────────────
CATEGORY_KEYWORDS = {
    "Plumbing": [
        "water", "leak", "pipe", "drain", "tap", "faucet", "flush", "toilet",
        "bathroom", "sink", "clog", "overflow", "sewage", "blockage", "plumber"
    ],
    "Electrical": [
        "electric", "electricity", "power", "light", "switch", "wiring", "short circuit",
        "spark", "fuse", "mcb", "trip", "voltage", "socket", "plug", "fan", "bulb"
    ],
    "Lift/Elevator": [
        "lift", "elevator", "stuck", "door", "cabin", "floor", "button", "jammed"
    ],
    "Cleaning": [
        "clean", "dirty", "garbage", "trash", "waste", "smell", "odour", "hygiene",
        "sweep", "housekeeping", "litter", "dustbin", "bin", "sanitize"
    ],
    "Security": [
        "security", "guard", "cctv", "camera", "gate", "access", "unauthorized",
        "break", "theft", "safe", "lock", "watchman", "stranger"
    ],
    "Parking": [
        "parking", "car", "vehicle", "bike", "two-wheeler", "four-wheeler",
        "slot", "space", "block", "double park"
    ],
    "Noise": [
        "noise", "loud", "sound", "music", "disturb", "night", "party",
        "neighbour", "neighbor", "volume", "speaker"
    ],
    "Internet": [
        "internet", "wifi", "broadband", "network", "connection", "speed",
        "router", "bandwidth", "connectivity", "slow"
    ],
    "Water Supply": [
        "water supply", "no water", "shortage", "tank", "bore", "pump",
        "pressure", "muddy water", "quality", "contaminated"
    ],
    "Other": []
}

PRIORITY_RULES = {
    "CRITICAL": [
        "fire", "flood", "gas leak", "electric shock", "short circuit", "spark",
        "collapse", "emergency", "accident", "injury", "danger", "hazard",
        "no water", "sewage overflow", "structural"
    ],
    "HIGH": [
        "lift", "elevator", "stuck", "cctv", "security", "unauthorized",
        "leak", "severe", "major", "urgent", "immediately", "broken", "burst"
    ],
    "MEDIUM": [
        "noise", "dirty", "garbage", "smell", "parking", "internet", "slow",
        "intermittent", "sometimes", "occasional"
    ],
    "LOW": [
        "minor", "small", "cosmetic", "paint", "crack", "suggestion",
        "feedback", "request", "general", "information"
    ]
}

# In-memory store for duplicate detection (production: use DB)
complaint_store: list[dict] = []


# ──────────────────────────────────────────────────────────────
# NLP utilities (no external ML dependencies)
# ──────────────────────────────────────────────────────────────

def tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [w for w in text.split() if len(w) > 2]


def keyword_score(tokens: list[str], keywords: list[str]) -> float:
    token_set = set(tokens)
    combined = " ".join(tokens)
    score = 0.0
    for kw in keywords:
        kw_lower = kw.lower()
        if " " in kw_lower:
            if kw_lower in combined:
                score += 2.0
        elif kw_lower in token_set:
            score += 1.0
    return score


def classify_category(title: str, description: str) -> tuple[str, float]:
    combined = title + " " + description
    tokens = tokenize(combined)

    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        if category == "Other":
            continue
        scores[category] = keyword_score(tokens, keywords)

    if not scores or max(scores.values()) == 0:
        return "Other", 0.5

    best = max(scores, key=scores.get)
    total = sum(scores.values())
    confidence = round(min(scores[best] / (total + 1e-9), 0.99), 2) if total > 0 else 0.5
    confidence = max(confidence, 0.55)
    return best, confidence


def classify_priority(title: str, description: str, category: str) -> str:
    combined = (title + " " + description).lower()
    tokens = tokenize(combined)
    token_set = set(tokens)

    for priority in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        for kw in PRIORITY_RULES[priority]:
            if " " in kw:
                if kw in combined:
                    return priority
            elif kw in token_set:
                return priority

    # Category-based fallback
    category_priority = {
        "Electrical": "HIGH",
        "Lift/Elevator": "HIGH",
        "Security": "HIGH",
        "Plumbing": "MEDIUM",
        "Water Supply": "MEDIUM",
        "Cleaning": "MEDIUM",
        "Parking": "LOW",
        "Noise": "LOW",
        "Internet": "LOW",
        "Other": "MEDIUM"
    }
    return category_priority.get(category, "MEDIUM")


def tfidf_similarity(text1: str, text2: str) -> float:
    """Simple cosine similarity using term frequency."""
    tokens1 = set(tokenize(text1))
    tokens2 = set(tokenize(text2))
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1 & tokens2
    return len(intersection) / (math.sqrt(len(tokens1)) * math.sqrt(len(tokens2)))


def detect_duplicate(title: str, description: str) -> dict | None:
    combined_new = title + " " + description
    threshold = 0.45
    best_match = None
    best_score = 0.0

    for stored in complaint_store[-200:]:  # Check last 200 complaints
        combined_stored = stored["title"] + " " + stored["description"]
        score = tfidf_similarity(combined_new, combined_stored)
        if score > threshold and score > best_score:
            best_score = score
            best_match = {"complaint_id": stored["id"], "similarity": round(score, 3)}

    return best_match


# ──────────────────────────────────────────────────────────────
# API Routes
# ──────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "UP", "service": "Civix AI Complaint Service"}), 200


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Analyze a complaint: categorize, suggest priority, detect duplicates.
    Request body: { complaint_id, title, description }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    title       = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    complaint_id = data.get("complaint_id")

    if not title and not description:
        return jsonify({"error": "title or description is required"}), 400

    category, confidence = classify_category(title, description)
    priority = classify_priority(title, description, category)
    duplicate = detect_duplicate(title, description)

    # Store for future duplicate checks
    if complaint_id:
        complaint_store.append({
            "id": complaint_id,
            "title": title,
            "description": description,
            "category": category
        })

    result = {
        "complaint_id": complaint_id,
        "category":     category,
        "priority":     priority,
        "confidence":   confidence,
        "duplicate":    duplicate
    }
    logger.info("Analyzed complaint %s: cat=%s pri=%s conf=%.2f dup=%s",
                complaint_id, category, priority, confidence,
                duplicate["complaint_id"] if duplicate else None)
    return jsonify(result), 200


@app.route("/batch-analyze", methods=["POST"])
def batch_analyze():
    """Analyze multiple complaints at once."""
    data = request.get_json(silent=True)
    if not data or "complaints" not in data:
        return jsonify({"error": "complaints array is required"}), 400

    results = []
    for item in data["complaints"]:
        title       = str(item.get("title", "")).strip()
        description = str(item.get("description", "")).strip()
        complaint_id = item.get("complaint_id")
        category, confidence = classify_category(title, description)
        priority = classify_priority(title, description, category)
        duplicate = detect_duplicate(title, description)
        results.append({
            "complaint_id": complaint_id,
            "category":     category,
            "priority":     priority,
            "confidence":   confidence,
            "duplicate":    duplicate
        })
    return jsonify({"results": results}), 200


@app.route("/categories", methods=["GET"])
def list_categories():
    return jsonify({"categories": list(CATEGORY_KEYWORDS.keys())}), 200


@app.route("/priorities", methods=["GET"])
def list_priorities():
    return jsonify({"priorities": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
