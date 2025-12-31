#!/usr/bin/env python3
"""
Process addresses from a text file and geocode them using Google Maps API.
Outputs addresses.csv with geocoded data.
"""

import argparse
import csv
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional

import googlemaps
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# DC Metro area bounds for validation
DC_LAT_MIN, DC_LAT_MAX = 38.5, 39.5
DC_LNG_MIN, DC_LNG_MAX = -77.5, -76.5


def get_google_maps_client() -> googlemaps.Client:
    """Initialize and return Google Maps client."""
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not api_key:
        print("ERROR: GOOGLE_MAPS_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)
    return googlemaps.Client(key=api_key)


def validate_dc_coordinates(lat: float, lng: float, address: str) -> bool:
    """Validate that coordinates are roughly in DC metro area."""
    if not (DC_LAT_MIN <= lat <= DC_LAT_MAX and DC_LNG_MIN <= lng <= DC_LNG_MAX):
        print(f"WARNING: Address '{address}' is outside DC metro area (lat={lat}, lng={lng})")
        return False
    return True


def find_place_by_name(gmaps: googlemaps.Client, raw_address: str) -> Optional[Dict]:
    """
    Try to find a place using Google Places API (better for venues/businesses).
    Returns dict with name, address, lat, lng or None if not found.
    """
    try:
        # Append "Washington DC" if not already in query
        search_query = raw_address
        if 'washington' not in raw_address.lower() and 'dc' not in raw_address.lower():
            search_query = f"{raw_address}, Washington DC"

        # Use Places API Text Search
        places_result = gmaps.places(query=search_query)

        if places_result['status'] == 'OK' and places_result.get('results'):
            # Get the first (best) result
            place = places_result['results'][0]

            # Get place details for more complete information
            place_id = place['place_id']
            details = gmaps.place(place_id=place_id, fields=['name', 'formatted_address', 'geometry', 'type'])

            if details['status'] == 'OK':
                result = details['result']

                lat = result['geometry']['location']['lat']
                lng = result['geometry']['location']['lng']

                # Use the actual place name from Places API
                name = result.get('name', '')
                formatted_address = result.get('formatted_address', '')

                # Validate it's in DC area
                if not validate_dc_coordinates(lat, lng, raw_address):
                    print(f"  → Found '{name}' but it's outside DC area, skipping")
                    return None

                print(f"  → Found via Places API: {name}")

                return {
                    'name': name,
                    'address': formatted_address,
                    'lat': lat,
                    'lng': lng,
                    'visible': True
                }

        return None

    except Exception as e:
        print(f"  → Places API search failed: {e}")
        return None


def geocode_address_fallback(gmaps: googlemaps.Client, raw_address: str) -> Optional[Dict]:
    """
    Fallback geocoding using standard Geocoding API.
    Returns dict with name, address, lat, lng or None if failed.
    """
    try:
        # Append "Washington DC" if not already in address
        search_address = raw_address
        if 'washington' not in raw_address.lower() and 'dc' not in raw_address.lower():
            search_address = f"{raw_address}, Washington DC"

        results = gmaps.geocode(search_address)

        if not results:
            return None

        result = results[0]

        lat = result['geometry']['location']['lat']
        lng = result['geometry']['location']['lng']
        formatted_address = result['formatted_address']

        # For fallback, extract a reasonable name from input or address
        # Try to use the first part of the input before comma
        name = raw_address.split(',')[0].strip()

        # Validate coordinates
        validate_dc_coordinates(lat, lng, raw_address)

        print(f"  → Found via Geocoding API: {name}")

        return {
            'name': name,
            'address': formatted_address,
            'lat': lat,
            'lng': lng,
            'visible': True
        }

    except Exception as e:
        print(f"  → Geocoding API failed: {e}")
        return None


def geocode_address(gmaps: googlemaps.Client, raw_address: str) -> Optional[Dict]:
    """
    Geocode a single address, trying Places API first, then falling back to Geocoding API.
    Returns dict with name, address, lat, lng, visible or None if failed.
    """
    print(f"Searching: {raw_address}")

    # Strategy 1: Try Places API first (best for businesses/venues)
    result = find_place_by_name(gmaps, raw_address)
    if result:
        return result

    # Strategy 2: Fallback to Geocoding API (for addresses)
    print(f"  → Trying Geocoding API as fallback...")
    result = geocode_address_fallback(gmaps, raw_address)
    if result:
        return result

    print(f"  ✗ Could not find: {raw_address}")
    return None


def read_existing_addresses(csv_path: Path) -> tuple[List[Dict], int]:
    """Read existing addresses from CSV. Returns (addresses, max_id)."""
    addresses = []
    max_id = 0

    if not csv_path.exists():
        return addresses, max_id

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                addresses.append({
                    'id': int(row['id']),
                    'name': row['name'],
                    'address': row['address'],
                    'lat': float(row['lat']),
                    'lng': float(row['lng']),
                    'visible': row['visible'].lower() == 'true'
                })
                max_id = max(max_id, int(row['id']))
    except Exception as e:
        print(f"ERROR: Failed to read existing CSV: {e}")

    return addresses, max_id


def write_addresses_csv(addresses: List[Dict], csv_path: Path):
    """Write addresses to CSV file."""
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['id', 'name', 'address', 'lat', 'lng', 'visible']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(addresses)


def process_addresses(input_file: str, append_mode: bool = False):
    """Main processing function."""
    script_dir = Path(__file__).parent
    input_path = script_dir / input_file
    csv_path = script_dir / 'addresses.csv'
    failed_path = script_dir / 'addresses_failed.txt'

    # Check input file exists
    if not input_path.exists():
        print(f"ERROR: Input file '{input_path}' not found")
        sys.exit(1)

    # Read raw addresses
    raw_addresses = []
    with open(input_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if line and not line.startswith('#'):
                raw_addresses.append(line)

    if not raw_addresses:
        print("No addresses found in input file")
        return

    print(f"Processing {len(raw_addresses)} addresses...")

    # Initialize Google Maps client
    gmaps = get_google_maps_client()

    # Load existing addresses if in append mode
    addresses, next_id = ([], 1) if not append_mode else read_existing_addresses(csv_path)
    next_id += 1  # Start from next available ID

    # Process each address
    successful = 0
    failed = []

    for i, raw_address in enumerate(raw_addresses, 1):
        print(f"\n[{i}/{len(raw_addresses)}] {raw_address}")
        result = geocode_address(gmaps, raw_address)

        if result:
            result['id'] = next_id
            addresses.append(result)
            next_id += 1
            successful += 1
            print(f"  ✓ Added: {result['name']}")
        else:
            failed.append(raw_address)
            print(f"  ✗ Failed to find location")

    # Write results
    if addresses:
        write_addresses_csv(addresses, csv_path)
        print(f"\nSuccessfully wrote {len(addresses)} addresses to {csv_path}")

    # Write failed addresses
    if failed:
        with open(failed_path, 'w', encoding='utf-8') as f:
            for addr in failed:
                f.write(f"{addr}\n")
        print(f"Wrote {len(failed)} failed addresses to {failed_path}")
    elif failed_path.exists():
        # Remove old failed file if no failures this time
        failed_path.unlink()

    # Print summary
    print(f"\n{'='*60}")
    print(f"SUMMARY: Processed {len(raw_addresses)} addresses")
    print(f"  ✓ Successful: {successful}")
    print(f"  ✗ Failed: {len(failed)}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description='Process and geocode addresses from a text file'
    )
    parser.add_argument(
        '--input',
        default='addresses_raw.txt',
        help='Input file with raw addresses (default: addresses_raw.txt)'
    )
    parser.add_argument(
        '--append',
        action='store_true',
        help='Append to existing addresses.csv instead of overwriting'
    )

    args = parser.parse_args()
    process_addresses(args.input, args.append)


if __name__ == '__main__':
    main()
