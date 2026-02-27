"""
Open-Box Deals Aggregator v5
Warehouse Receipt Edition - Production Ready
Security: Rate limiting, XSS protection, input validation
Reliability: Request deduplication, retry strategy, proper timeouts
"""

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from typing import Optional
from pathlib import Path
import asyncio
import json
import time
import aiohttp
import os
import re
import hashlib
from urllib.parse import quote_plus, urlparse
from collections import defaultdict

STATIC_DIR = Path(__file__).parent.parent / "static"
MINO_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"
MINO_API_KEY = os.getenv("MINO_API_KEY", "")

# =============================================================================
# RATE LIMITING & REQUEST DEDUPLICATION (with memory protection)
# =============================================================================

class RateLimiter:
    """In-memory rate limiter with TTL cleanup and max size protection"""
    def __init__(self, requests_per_minute: int = 5, max_ips: int = 10000):
        self.requests_per_minute = requests_per_minute
        self.max_ips = max_ips
        self.requests = {}  # ip -> [timestamps]
        self.last_cleanup = time.time()
    
    def _cleanup(self):
        """Remove stale entries older than 2 minutes"""
        now = time.time()
        if now - self.last_cleanup < 30:  # Cleanup every 30 seconds max
            return
        
        cutoff = now - 120  # 2 minute TTL
        stale_ips = [ip for ip, timestamps in self.requests.items() 
                     if not timestamps or max(timestamps) < cutoff]
        for ip in stale_ips:
            del self.requests[ip]
        self.last_cleanup = now
    
    def is_allowed(self, client_ip: str) -> bool:
        self._cleanup()
        
        # Memory protection: reject if too many unique IPs
        if len(self.requests) >= self.max_ips and client_ip not in self.requests:
            return False
        
        now = time.time()
        minute_ago = now - 60
        
        # Initialize or clean old requests for this IP
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        
        self.requests[client_ip] = [
            ts for ts in self.requests[client_ip] if ts > minute_ago
        ]
        
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return False
        
        self.requests[client_ip].append(now)
        return True
    
    def time_until_allowed(self, client_ip: str) -> int:
        if client_ip not in self.requests or not self.requests[client_ip]:
            return 0
        oldest = min(self.requests[client_ip])
        return max(0, int(60 - (time.time() - oldest)))


class ActiveSearchTracker:
    """Prevents concurrent searches with TTL cleanup"""
    def __init__(self, max_active: int = 1000, search_timeout: int = 300):
        self.active_searches = {}  # ip -> (search_id, start_time)
        self.max_active = max_active
        self.search_timeout = search_timeout
        self.last_cleanup = time.time()
    
    def _cleanup(self):
        """Remove searches older than timeout"""
        now = time.time()
        if now - self.last_cleanup < 30:
            return
        
        stale = [ip for ip, (_, start) in self.active_searches.items()
                 if now - start > self.search_timeout]
        for ip in stale:
            del self.active_searches[ip]
        self.last_cleanup = now
    
    def start_search(self, client_ip: str, query: str) -> str:
        self._cleanup()
        search_id = hashlib.md5(f"{client_ip}:{query}:{time.time()}".encode()).hexdigest()[:8]
        self.active_searches[client_ip] = (search_id, time.time())
        return search_id
    
    def is_searching(self, client_ip: str) -> bool:
        self._cleanup()
        if client_ip not in self.active_searches:
            return False
        # Check if search has timed out
        _, start_time = self.active_searches[client_ip]
        if time.time() - start_time > self.search_timeout:
            del self.active_searches[client_ip]
            return False
        return True
    
    def end_search(self, client_ip: str):
        self.active_searches.pop(client_ip, None)


rate_limiter = RateLimiter(requests_per_minute=9)
search_tracker = ActiveSearchTracker()

# Global session with retry capability
http_session: Optional[aiohttp.ClientSession] = None
session_created_at: float = 0
SESSION_MAX_AGE = 3600  # Refresh session every hour


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_session, session_created_at
    http_session = await create_fresh_session()
    session_created_at = time.time()
    yield
    await http_session.close()


async def create_fresh_session() -> aiohttp.ClientSession:
    """Create a new session with proper timeouts and connection limits"""
    connector = aiohttp.TCPConnector(
        limit=20,  # Max concurrent connections
        limit_per_host=5,
        ttl_dns_cache=300,
        enable_cleanup_closed=True
    )
    return aiohttp.ClientSession(
        connector=connector,
        timeout=aiohttp.ClientTimeout(total=90, connect=10)
    )


async def get_healthy_session() -> aiohttp.ClientSession:
    """Get session, refresh if stale"""
    global http_session, session_created_at
    
    if time.time() - session_created_at > SESSION_MAX_AGE:
        old_session = http_session
        http_session = await create_fresh_session()
        session_created_at = time.time()
        # Close old session gracefully
        asyncio.create_task(old_session.close())
    
    return http_session


app = FastAPI(
    title="Open-Box Deals Aggregator",
    description="Warehouse Receipt Edition v5 - Production Ready",
    version="5.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# =============================================================================
# INPUT VALIDATION & SANITIZATION
# =============================================================================

def validate_query(q: str) -> str:
    """Validate and sanitize search query"""
    # Max length check
    if len(q) > 100:
        raise HTTPException(status_code=400, detail="Query too long (max 100 chars)")
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\';\\]', '', q)
    
    # Must have some alphanumeric content
    if not re.search(r'[a-zA-Z0-9]', sanitized):
        raise HTTPException(status_code=400, detail="Query must contain alphanumeric characters")
    
    return sanitized.strip()


def validate_url(url: str) -> Optional[str]:
    """Validate URL is safe (prevents javascript: XSS)"""
    if not url:
        return None
    
    try:
        parsed = urlparse(url)
        # Only allow http/https schemes
        if parsed.scheme not in ('http', 'https'):
            return None
        # Must have a valid netloc (domain)
        if not parsed.netloc:
            return None
        return url
    except:
        return None


def sanitize_product(product: dict) -> dict:
    """Sanitize product data before sending to frontend"""
    return {
        "name": str(product.get("name", "Unknown"))[:200],  # Limit length
        "original_price": str(product.get("original_price", ""))[:20],
        "sale_price": str(product.get("sale_price", ""))[:20],
        "condition": str(product.get("condition", ""))[:50],
        "product_url": validate_url(product.get("product_url", ""))
    }


# =============================================================================
# SITE CONFIGURATIONS
# =============================================================================

SITES = {
    "amazon": {
        "name": "Amazon Warehouse",
        "search_url": "https://www.amazon.com/s?k={query}&i=specialty-aps&srs=12653393011",
        "goal": "Extract the first 5 Renewed/Used/Refurbished '{query}' products only. Skip NEW items and accessories. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields.",
        "browser_profile": "stealth",
        "proxy_config": {"enabled": True, "country_code": "US"}
    },
    "bestbuy": {
        "name": "Best Buy Outlet",
        "search_url": "https://www.bestbuy.com/site/searchpage.jsp?st={query}&qp=condition_facet%3DCondition~Open-Box",
        "goal": "Extract the first 5 Open-Box '{query}' products. Only include main devices, NOT accessories like controllers, cables, cases, or chargers. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields.",
        "browser_profile": "stealth"
    },
    "newegg": {
        "name": "Newegg Open Box",
        "search_url": "https://www.newegg.com/p/pl?d={query}&N=4814",
        "goal": "Extract the first 5 Open Box products that match '{query}'. Only include products related to '{query}'. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields. Skip sponsored items.",
    },
    "backmarket": {
        "name": "BackMarket",
        "search_url": "https://www.backmarket.com/en-us/search?q={query}",
        "goal": "Extract the first 5 refurbished products that match '{query}'. Only include products related to '{query}'. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields.",
    },
    "swappa": {
        "name": "Swappa",
        "search_url": "https://swappa.com/search?q={query}",
        "goal": "Extract the first 5 '{query}' listings with complete data. Each must have name, price. Skip any listing without a price. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields.",
        "browser_profile": "stealth"
    },
    "walmart": {
        "name": "Walmart Renewed",
        "search_url": "https://www.walmart.com/search?q={query}+renewed",
        "goal": "Extract the first 5 Renewed/Refurbished products that match '{query}'. Only include actual devices, skip accessories. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields.",
        "browser_profile": "stealth"
    },
    "target": {
        "name": "Target Clearance",
        "search_url": "https://www.target.com/s?searchTerm={query}&facetedValue=5zja2",
        "goal": "Extract the first 5 Clearance products that match '{query}'. Only include products related to '{query}'. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields.",
    },
    "microcenter": {
        "name": "Micro Center",
        "search_url": "https://www.microcenter.com/search/search_results.aspx?Ntt={query}&Ntk=all&N=4294966998",
        "goal": "Extract the first 5 Open Box products that match '{query}'. Only include products related to '{query}'. Return ONLY a JSON array: [{{name, original_price, sale_price, condition, product_url}}]. Use null for missing fields.",
    }
}


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/")
def root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "running"}


@app.get("/api/sites")
def list_sites():
    return {
        "sites": [
            {"key": key, "name": config["name"]}
            for key, config in SITES.items()
        ]
    }


@app.get("/api/search/status")
def search_status(request: Request):
    """Check if user can start a new search"""
    client_ip = request.client.host
    
    if search_tracker.is_searching(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Search already in progress", "can_search": False}
        )
    
    if not rate_limiter.is_allowed(client_ip):
        wait_time = rate_limiter.time_until_allowed(client_ip)
        # Don't actually consume the rate limit for status checks
        rate_limiter.requests[client_ip].pop()
        return JSONResponse(
            status_code=429,
            content={
                "error": f"Rate limited. Try again in {wait_time}s",
                "can_search": False,
                "wait_seconds": wait_time
            }
        )
    
    # Don't consume rate limit for status check
    rate_limiter.requests[client_ip].pop()
    return {"can_search": True}


@app.get("/api/search/live")
async def search_live(
    request: Request,
    q: str = Query(..., min_length=2),
    max_price: Optional[float] = Query(None, ge=0, le=100000)
):
    """Stream live browser sessions + results"""
    client_ip = request.client.host
    
    # Check for concurrent search
    if search_tracker.is_searching(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Search already in progress. Please wait for it to complete."}
        )
    
    # Rate limiting
    if not rate_limiter.is_allowed(client_ip):
        wait_time = rate_limiter.time_until_allowed(client_ip)
        return JSONResponse(
            status_code=429,
            content={"error": f"Too many requests. Please wait {wait_time} seconds."}
        )
    
    # Validate query
    try:
        validated_query = validate_query(q)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    
    # Track this search
    search_id = search_tracker.start_search(client_ip, validated_query)
    
    async def event_generator():
        try:
            start_time = time.time()
            session = await get_healthy_session()
            
            yield f"data: {json.dumps({'type': 'search_start', 'query': validated_query, 'sites': list(SITES.keys()), 'search_id': search_id})}\n\n"
            
            event_queue = asyncio.Queue()
            
            # Send initial status
            for site_key, site_config in SITES.items():
                await event_queue.put({
                    "type": "session_status",
                    "site": site_key,
                    "site_name": site_config["name"],
                    "status": "connecting"
                })
            
            async def scrape_site(site_key: str, site_config: dict):
                encoded_query = quote_plus(validated_query).replace('+', '%20')
                search_url = site_config["search_url"].format(query=encoded_query)
                
                # Inject the search query into the goal for relevance filtering
                goal = site_config["goal"].format(query=validated_query)
                
                payload = {
                    "url": search_url,
                    "goal": goal
                }
                
                if "browser_profile" in site_config:
                    payload["browser_profile"] = site_config["browser_profile"]
                
                if "proxy_config" in site_config:
                    payload["proxy_config"] = site_config["proxy_config"]
                
                headers = {
                    "X-API-Key": MINO_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream"
                }
                
                try:
                    async with session.post(
                        MINO_API_URL,
                        json=payload,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=250)  # 250s per site max
                    ) as response:
                        
                        if response.status != 200:
                            await event_queue.put({
                                "type": "session_error",
                                "site": site_key,
                                "site_name": site_config["name"],
                                "error": f"HTTP {response.status}"
                            })
                            return
                        
                        streaming_url_sent = False
                        result_data = None
                        buffer = ""
                        
                        async for chunk in response.content.iter_any():
                            buffer += chunk.decode('utf-8', errors='ignore')
                            
                            while '\n' in buffer:
                                line, buffer = buffer.split('\n', 1)
                                line = line.strip()
                                
                                if line.startswith("data: "):
                                    try:
                                        event = json.loads(line[6:])
                                        
                                        if event.get("streamingUrl") and not streaming_url_sent:
                                            await event_queue.put({
                                                "type": "session_start",
                                                "site": site_key,
                                                "site_name": site_config["name"],
                                                "streamingUrl": event["streamingUrl"],
                                                "searchUrl": search_url
                                            })
                                            streaming_url_sent = True
                                        
                                        # Extract result from various fields
                                        if event.get("resultJson"):
                                            result_data = event["resultJson"]
                                        elif event.get("result"):
                                            result_data = event["result"]
                                        elif event.get("data") and isinstance(event.get("data"), (list, dict)):
                                            result_data = event["data"]
                                        elif event.get("products"):
                                            result_data = event["products"]
                                        
                                        if event.get("error"):
                                            await event_queue.put({
                                                "type": "session_error",
                                                "site": site_key,
                                                "site_name": site_config["name"],
                                                "error": str(event["error"])[:50]
                                            })
                                            return
                                            
                                    except json.JSONDecodeError:
                                        continue
                        
                        # Process remaining buffer
                        if buffer.strip().startswith("data: "):
                            try:
                                event = json.loads(buffer.strip()[6:])
                                if event.get("resultJson"):
                                    result_data = event["resultJson"]
                                elif event.get("result"):
                                    result_data = event["result"]
                            except:
                                pass
                        
                        if result_data:
                            products = extract_products(result_data)
                            # Sanitize all products
                            products = [sanitize_product(p) for p in products]
                            # Filter by price (strict mode)
                            if max_price:
                                products = filter_by_price(products, max_price, strict=True)
                            
                            await event_queue.put({
                                "type": "session_result",
                                "site": site_key,
                                "site_name": site_config["name"],
                                "products": products,
                                "count": len(products)
                            })
                        else:
                            await event_queue.put({
                                "type": "session_error",
                                "site": site_key,
                                "site_name": site_config["name"],
                                "error": "No results"
                            })
                            
                except asyncio.TimeoutError:
                    await event_queue.put({
                        "type": "session_error",
                        "site": site_key,
                        "site_name": site_config["name"],
                        "error": "Timeout (250s)"
                    })
                except Exception as e:
                    await event_queue.put({
                        "type": "session_error",
                        "site": site_key,
                        "site_name": site_config["name"],
                        "error": str(e)[:50]
                    })
            
            tasks = [
                asyncio.create_task(scrape_site(key, config))
                for key, config in SITES.items()
            ]
            
            sites_done = 0
            total_sites = len(SITES)
            cancelled = False
            
            while sites_done < total_sites and not cancelled:
                # 🔴 CRITICAL: Check if client disconnected (prevents ghost tasks)
                if await request.is_disconnected():
                    print(f"[{search_id}] Client disconnected - cancelling all tasks")
                    for task in tasks:
                        if not task.done():
                            task.cancel()
                    cancelled = True
                    break
                
                # Check for each site task completion
                done_tasks = [t for t in tasks if t.done()]
                for task in done_tasks:
                    tasks.remove(task)
                    sites_done += 1
                
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=1.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    elapsed = round(time.time() - start_time, 1)
                    yield f"data: {json.dumps({'type': 'heartbeat', 'elapsed': elapsed})}\n\n"
                    
                    # Global timeout: 5 minutes max
                    if elapsed > 300:
                        yield f"data: {json.dumps({'type': 'timeout', 'message': 'Search timeout after 5 minutes'})}\n\n"
                        break
            
            # Cancel any remaining tasks
            for task in tasks:
                if not task.done():
                    task.cancel()
            
            await asyncio.gather(*tasks, return_exceptions=True)
            
            total_time = round(time.time() - start_time, 2)
            yield f"data: {json.dumps({'type': 'complete', 'total_time': total_time})}\n\n"
            
        finally:
            # Always release the search lock
            search_tracker.end_search(client_ip)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def extract_products(result_data) -> list:
    """Extract products from various response formats with robust error handling"""
    
    # Handle string responses (AI may return JSON as string)
    if isinstance(result_data, str):
        clean_str = result_data.strip()
        
        # Remove markdown code blocks
        clean_str = re.sub(r'^```json\s*', '', clean_str)
        clean_str = re.sub(r'^```\s*', '', clean_str)
        clean_str = re.sub(r'\s*```$', '', clean_str)
        clean_str = clean_str.strip()
        
        # Try direct parse first
        try:
            parsed = json.loads(clean_str)
            return extract_products(parsed)
        except json.JSONDecodeError:
            pass
        
        # Fix common LLM JSON errors
        fixed_str = clean_str
        # Remove trailing commas before ] or }
        fixed_str = re.sub(r',\s*([}\]])', r'\1', fixed_str)
        # Fix single quotes to double quotes
        fixed_str = re.sub(r"'([^']*)':", r'"\1":', fixed_str)
        # Remove any control characters
        fixed_str = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', fixed_str)
        
        try:
            parsed = json.loads(fixed_str)
            return extract_products(parsed)
        except json.JSONDecodeError:
            pass
        
        # Last resort: find JSON array in the mess
        match = re.search(r'\[[\s\S]*?\](?=\s*$|\s*[^,\[\{])', result_data)
        if match:
            try:
                # Also try fixing this extracted portion
                extracted = match.group()
                extracted = re.sub(r',\s*([}\]])', r'\1', extracted)
                parsed = json.loads(extracted)
                return extract_products(parsed)
            except:
                pass
        
        return []
    
    if isinstance(result_data, list):
        # Filter out any non-dict items
        return [item for item in result_data if isinstance(item, dict)]
    
    if isinstance(result_data, dict):
        for key in ["products", "result", "data", "items", "results"]:
            if key in result_data:
                val = result_data[key]
                if isinstance(val, list):
                    return [item for item in val if isinstance(item, dict)]
                elif isinstance(val, str):
                    return extract_products(val)
        
        for value in result_data.values():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                if any(k in value[0] for k in ["name", "title", "product_name"]):
                    return value
    
    return []


def filter_by_price(products: list, max_price: float, strict: bool = False) -> list:
    """
    Filter products by maximum price.
    strict=True: Exclude items with unparseable prices
    strict=False: Include items with unparseable prices
    """
    filtered = []
    for p in products:
        price_str = p.get("sale_price") or p.get("price") or ""
        try:
            # Extract numeric price
            price_match = re.search(r'[\d,]+\.?\d*', str(price_str).replace(',', ''))
            if price_match:
                price = float(price_match.group())
                if price <= max_price:
                    filtered.append(p)
            elif not strict:
                # Can't parse price, include if not strict
                p["price_unknown"] = True
                filtered.append(p)
        except:
            if not strict:
                p["price_unknown"] = True
                filtered.append(p)
    return filtered
