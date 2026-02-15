#!/usr/bin/env python3
"""Test TinyFish API - validates vendor URLs work.

Usage: python execution/test_tinyfish.py
Requires: pip install requests python-dotenv
"""

import os
import json
import sys
from dotenv import load_dotenv
import requests

load_dotenv()

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY")
TINYFISH_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"

TEST_VENDOR = {
    "name": "Raspberry Pi Official Store",
    "url": "https://www.raspberrypi.com/products/raspberry-pi-5/"
}

GOAL = """Extract: price (numeric), currency, stock availability (boolean), 
stock level description, and notes. Return as JSON."""

def test_tinyfish():
    if not TINYFISH_API_KEY:
        print("❌ ERROR: TINYFISH_API_KEY not in environment")
        print("   Create .env with: TINYFISH_API_KEY=your_key")
        sys.exit(1)

    print("🔬 Testing TinyFish API...")
    print(f"   Vendor: {TEST_VENDOR['name']}")
    print(f"   URL: {TEST_VENDOR['url']}")
    print()

    payload = {"url": TEST_VENDOR["url"], "goal": GOAL}
    headers = {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        print("📡 Sending request...")
        response = requests.post(
            TINYFISH_URL,
            headers=headers,
            json=payload,
            stream=True,
            timeout=120
        )

        if response.status_code != 200:
            print(f"❌ ERROR: Status {response.status_code}")
            print(f"   Response: {response.text}")
            sys.exit(1)

        print("✅ Connected to SSE stream")
        print("   Processing events...")
        print()

        result = None
        for line in response.iter_lines():
            if not line:
                continue

            line_str = line.decode('utf-8')
            if not line_str.startswith('data: '):
                continue

            try:
                event = json.loads(line_str[6:])

                if event.get('type') == 'LOG':
                    print(f"   [LOG] {event.get('message', '')}")

                elif event.get('type') == 'COMPLETE':
                    result = event.get('resultJson')
                    print()
                    print("✅ Scan complete!")
                    break

            except json.JSONDecodeError:
                print(f"   [WARN] Parse failed: {line_str[:100]}")

        if result:
            print()
            print("📊 Results:")
            print(json.dumps(result, indent=2))
            print()

            if isinstance(result, dict):
                required = ['name', 'url', 'price', 'currency', 'inStock', 'stockLevel']
                missing = [f for f in required if f not in result]
                if missing:
                    print(f"⚠️  Missing fields: {missing}")
                else:
                    print("✅ Structure valid")

            return result
        else:
            print("❌ ERROR: No result from TinyFish")
            sys.exit(1)

    except requests.exceptions.Timeout:
        print("❌ ERROR: Timeout (>120s)")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted")
        sys.exit(1)

if __name__ == "__main__":
    result = test_tinyfish()
    print()
    print("=" * 60)
    print("✅ TinyFish test successful!")
    print("   Ready to build full app.")
    print("=" * 60)
