"""
FastAPI backend for DC Address Mapper.
Provides REST API for managing addresses and triggering geocoding.
"""

import csv
import subprocess
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(title="DC Address Mapper API", version="1.0.0")

# Configure CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# File paths
BASE_DIR = Path(__file__).parent
CSV_PATH = BASE_DIR / "addresses.csv"
RAW_PATH = BASE_DIR / "addresses_raw.txt"
PROCESS_SCRIPT = BASE_DIR / "process_addresses.py"


# Pydantic models
class Address(BaseModel):
    id: int
    name: str
    address: str
    lat: float
    lng: float
    visible: bool


class AddressCreate(BaseModel):
    name: str
    address: str
    lat: float
    lng: float


class AddressUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    visible: Optional[bool] = None


# Helper functions
def read_addresses() -> List[Address]:
    """Read all addresses from CSV file."""
    if not CSV_PATH.exists():
        return []

    addresses = []
    try:
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                addresses.append(Address(
                    id=int(row['id']),
                    name=row['name'],
                    address=row['address'],
                    lat=float(row['lat']),
                    lng=float(row['lng']),
                    visible=row['visible'].lower() == 'true'
                ))
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return []

    return addresses


def write_addresses(addresses: List[Address]):
    """Write addresses to CSV file."""
    with open(CSV_PATH, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['id', 'name', 'address', 'lat', 'lng', 'visible']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for addr in addresses:
            writer.writerow({
                'id': addr.id,
                'name': addr.name,
                'address': addr.address,
                'lat': addr.lat,
                'lng': addr.lng,
                'visible': addr.visible
            })


def get_next_id(addresses: List[Address]) -> int:
    """Get the next available ID."""
    if not addresses:
        return 1
    return max(addr.id for addr in addresses) + 1


# Startup event
@app.on_event("startup")
async def startup_event():
    """On startup, process raw addresses if CSV doesn't exist."""
    if not CSV_PATH.exists() and RAW_PATH.exists():
        print("CSV not found but raw addresses exist. Processing...")
        try:
            subprocess.run(
                ["python", str(PROCESS_SCRIPT)],
                cwd=BASE_DIR,
                check=True
            )
            print("Initial address processing completed")
        except subprocess.CalledProcessError as e:
            print(f"Error processing addresses: {e}")


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "DC Address Mapper API"}


@app.get("/api/addresses", response_model=List[Address])
async def get_addresses():
    """Get all addresses."""
    return read_addresses()


@app.post("/api/addresses", response_model=Address)
async def create_address(address: AddressCreate):
    """Add a new address."""
    addresses = read_addresses()
    new_id = get_next_id(addresses)

    new_address = Address(
        id=new_id,
        name=address.name,
        address=address.address,
        lat=address.lat,
        lng=address.lng,
        visible=True
    )

    addresses.append(new_address)
    write_addresses(addresses)

    return new_address


@app.delete("/api/addresses/{address_id}")
async def delete_address(address_id: int):
    """Delete an address by ID."""
    addresses = read_addresses()
    updated_addresses = [addr for addr in addresses if addr.id != address_id]

    if len(updated_addresses) == len(addresses):
        raise HTTPException(status_code=404, detail="Address not found")

    write_addresses(updated_addresses)
    return {"message": "Address deleted successfully"}


@app.patch("/api/addresses/{address_id}", response_model=Address)
async def update_address(address_id: int, update: AddressUpdate):
    """Update an address (typically visibility toggle)."""
    addresses = read_addresses()

    for addr in addresses:
        if addr.id == address_id:
            # Update only provided fields
            if update.name is not None:
                addr.name = update.name
            if update.address is not None:
                addr.address = update.address
            if update.lat is not None:
                addr.lat = update.lat
            if update.lng is not None:
                addr.lng = update.lng
            if update.visible is not None:
                addr.visible = update.visible

            write_addresses(addresses)
            return addr

    raise HTTPException(status_code=404, detail="Address not found")


@app.post("/api/addresses/process")
async def process_addresses():
    """Trigger reprocessing of addresses_raw.txt."""
    if not RAW_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="addresses_raw.txt not found"
        )

    try:
        result = subprocess.run(
            ["python", str(PROCESS_SCRIPT)],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            check=True
        )

        return {
            "message": "Addresses processed successfully",
            "output": result.stdout
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {e.stderr}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
