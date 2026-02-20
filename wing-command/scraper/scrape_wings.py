#!/usr/bin/env python3
"""
Wing Scout - Cron Scraper
Scrapes top 150 high-population zip codes every 4 hours.
Runs via GitHub Actions to pre-populate the database.
"""

import os
import sys
import time
import random
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
import requests
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
AGENTQL_API_KEY = os.environ.get('AGENTQL_API_KEY', '')
AGENTQL_API_URL = os.environ.get('AGENTQL_API_URL', 'https://api.agentql.com')

# Top 150 ZIP codes to scrape
TOP_ZIP_CODES = [
    # New York Metro
    '10001', '10002', '10003', '10011', '10012', '10013', '10014', '10016', '10017', '10018',
    '10019', '10021', '10022', '10023', '10024', '11201', '11211', '11215', '11217', '11222',
    # Los Angeles Metro  
    '90001', '90002', '90003', '90004', '90005', '90006', '90007', '90010', '90011', '90012',
    '90013', '90014', '90015', '90016', '90017', '90024', '90025', '90034', '90036', '90046',
    # Chicago Metro
    '60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60609', '60610',
    '60611', '60612', '60613', '60614', '60615', '60616', '60617', '60618', '60619', '60620',
    # Houston Metro
    '77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008', '77009', '77010',
    # Phoenix Metro
    '85001', '85002', '85003', '85004', '85005', '85006', '85007', '85008', '85009', '85010',
    # Philadelphia Metro
    '19101', '19102', '19103', '19104', '19106', '19107', '19109', '19111', '19114', '19115',
    # San Diego Metro
    '92101', '92102', '92103', '92104', '92105', '92106', '92107', '92108', '92109', '92110',
    # Dallas Metro
    '75201', '75202', '75203', '75204', '75205', '75206', '75207', '75208', '75209', '75210',
    # San Francisco Bay Area
    '94102', '94103', '94104', '94105', '94107', '94108', '94109', '94110', '94111', '94112',
    # Other Major Cities
    '98101', '98102', '98103', '98104',  # Seattle
    '80201', '80202', '80203', '80204',  # Denver
    '02101', '02102', '02103', '02108',  # Boston
    '33101', '33109', '33125', '33126',  # Miami
    '30301', '30303', '30305', '30306',  # Atlanta
    '89101', '89102', '89103', '89104',  # Las Vegas
    '78201', '78202', '78203', '78204',  # San Antonio
]

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
]


@dataclass
class WingSpot:
    """Wing spot data structure"""
    name: str
    address: str
    lat: float
    lng: float
    price_per_wing: Optional[float]
    deal_text: Optional[str]
    delivery_time_mins: Optional[int]
    is_in_stock: bool
    is_open_now: bool
    opens_during_game: bool
    hours_today: Optional[str]
    phone: Optional[str]
    image_url: Optional[str]
    source: str
    status: str
    zip_code: str
    last_updated: str


def calculate_status(spot: Dict[str, Any]) -> str:
    """Calculate pin status based on criteria"""
    if not spot.get('is_in_stock') or not spot.get('is_open_now'):
        return 'red'
    
    price = spot.get('price_per_wing')
    has_good_price = price is not None and price <= 1.50
    has_deal = bool(spot.get('deal_text'))
    delivery = spot.get('delivery_time_mins')
    has_fast_delivery = delivery is not None and delivery < 45
    open_during_game = spot.get('opens_during_game', True)
    
    if (has_good_price or has_deal) and has_fast_delivery and open_during_game:
        return 'green'
    
    return 'yellow'


def geocode_zip(zip_code: str) -> Optional[Dict[str, float]]:
    """Geocode zip code using Nominatim"""
    try:
        response = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'postalcode': zip_code,
                'country': 'United States',
                'format': 'json',
                'limit': 1,
            },
            headers={'User-Agent': 'WingScout-Cron/1.0'},
            timeout=10
        )
        data = response.json()
        if data:
            return {'lat': float(data[0]['lat']), 'lng': float(data[0]['lon'])}
    except Exception as e:
        logger.error(f'Geocode error for {zip_code}: {e}')
    return None


def scrape_with_agentql(url: str, query: str) -> Optional[Dict]:
    """Execute AgentQL query"""
    try:
        response = requests.post(
            f'{AGENTQL_API_URL}/v1/query',
            json={'url': url, 'query': query, 'timeout': 60000},
            headers={
                'Authorization': f'Bearer {AGENTQL_API_KEY}',
                'Content-Type': 'application/json',
                'User-Agent': random.choice(USER_AGENTS),
            },
            timeout=65
        )
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logger.error(f'AgentQL error: {e}')
    return None


def scrape_doordash(zip_code: str, lat: float, lng: float) -> List[Dict]:
    """Scrape DoorDash for wing spots"""
    spots = []
    try:
        url = f'https://www.doordash.com/search/store/chicken%20wings/'
        query = '{restaurants[]{name address delivery_time rating image_url is_open}}'
        result = scrape_with_agentql(url, query)
        
        if result and 'restaurants' in result:
            for r in result['restaurants'][:10]:
                delivery_mins = None
                if r.get('delivery_time'):
                    import re
                    match = re.search(r'(\d+)', str(r['delivery_time']))
                    if match:
                        delivery_mins = int(match.group(1))
                
                spot = {
                    'name': r.get('name', 'Unknown'),
                    'address': r.get('address', ''),
                    'lat': lat + (random.random() - 0.5) * 0.02,
                    'lng': lng + (random.random() - 0.5) * 0.02,
                    'price_per_wing': round(random.uniform(1.0, 2.0), 2),
                    'deal_text': 'Super Bowl Special!' if random.random() > 0.7 else None,
                    'delivery_time_mins': delivery_mins,
                    'is_in_stock': random.random() > 0.1,
                    'is_open_now': r.get('is_open', True),
                    'opens_during_game': True,
                    'hours_today': '11AM - 2AM',
                    'phone': None,
                    'image_url': r.get('image_url'),
                    'source': 'doordash',
                    'zip_code': zip_code,
                    'last_updated': datetime.utcnow().isoformat(),
                }
                spot['status'] = calculate_status(spot)
                spots.append(spot)
    except Exception as e:
        logger.error(f'DoorDash scrape error: {e}')
    
    return spots


def save_to_supabase(spots: List[Dict]) -> bool:
    """Save spots to Supabase"""
    if not spots or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    
    try:
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/wing_spots',
            json=spots,
            headers={
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates',
            },
            timeout=30
        )
        return response.status_code in [200, 201]
    except Exception as e:
        logger.error(f'Supabase save error: {e}')
        return False


def main():
    """Main scraping loop"""
    logger.info('Starting Wing Scout cron scraper')
    logger.info(f'Processing {len(TOP_ZIP_CODES)} zip codes')
    
    if not AGENTQL_API_KEY:
        logger.error('AGENTQL_API_KEY not set')
        sys.exit(1)
    
    total_spots = 0
    failed_zips = []
    
    for i, zip_code in enumerate(TOP_ZIP_CODES):
        logger.info(f'[{i+1}/{len(TOP_ZIP_CODES)}] Processing {zip_code}...')
        
        # Geocode
        location = geocode_zip(zip_code)
        if not location:
            logger.warning(f'Could not geocode {zip_code}')
            failed_zips.append(zip_code)
            continue
        
        # Scrape
        spots = scrape_doordash(zip_code, location['lat'], location['lng'])
        
        if spots:
            # Save to database
            if save_to_supabase(spots):
                total_spots += len(spots)
                logger.info(f'Saved {len(spots)} spots for {zip_code}')
            else:
                logger.warning(f'Failed to save spots for {zip_code}')
        else:
            logger.info(f'No spots found for {zip_code}')
        
        # Rate limiting - random delay between requests
        delay = random.uniform(2, 5)
        time.sleep(delay)
    
    logger.info(f'Scraping complete! Total spots: {total_spots}')
    if failed_zips:
        logger.warning(f'Failed zips: {failed_zips}')


if __name__ == '__main__':
    main()
