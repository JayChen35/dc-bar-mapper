# DC Address Mapper

An interactive web application for visualizing addresses on a map with DC Metro overlay. Plot locations, toggle visibility, and explore the Washington DC metro system.

![DC Address Mapper](https://img.shields.io/badge/status-active-success)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![Node](https://img.shields.io/badge/Node-18+-green)

## Features

- **Interactive Map**: Leaflet-powered map with OpenStreetMap tiles
- **Address Management**: Add, view, and delete addresses with ease
- **Google Places Integration**: Search and add locations using Google Places Autocomplete
- **DC Metro Overlay**: Toggle DC Metro lines and stations on the map
- **Geocoding**: Automatic address geocoding using Google Maps API
- **Batch Processing**: Process multiple addresses from a text file
- **Visibility Control**: Show/hide addresses individually on the map
- **Responsive Design**: Clean, modern UI built with Tailwind CSS

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework for building APIs
- **Python 3.11+**: Latest Python features and performance
- **Google Maps API**: Geocoding and address validation
- **Uvicorn**: ASGI server for production-ready performance

### Frontend
- **React 18**: Latest React with hooks and concurrent features
- **Vite**: Lightning-fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Leaflet**: Interactive mapping library
- **React-Leaflet**: React components for Leaflet
- **Google Maps JavaScript API**: Places autocomplete functionality

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm ([Download](https://nodejs.org/))
- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Google Cloud Account** with a valid API key

### Google Maps API Setup

You'll need a Google Cloud API key with the following APIs enabled:

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Geocoding API** (for address processing)
   - **Places API** (for location search)
   - **Maps JavaScript API** (for frontend map features)
4. Create credentials → API Key
5. (Optional but recommended) Restrict the API key:
   - For backend: Restrict to Geocoding API only
   - For frontend: Restrict to Places API and Maps JavaScript API, and limit to your domain

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dc-bar-mapper
```

### 2. Backend Setup

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env and add your Google Maps API key
# GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 3. Process Initial Addresses

The project comes with seed data of popular DC landmarks. Process them:

```bash
# Make sure you're in the backend directory with venv activated
python process_addresses.py
```

You should see output confirming the addresses were geocoded successfully.

### 4. Start Backend Server

```bash
# In the backend directory
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### 5. Frontend Setup

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your Google Maps API key
# VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 6. Start Frontend Dev Server

```bash
# In the frontend directory
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### Adding Addresses via UI

1. Click the **Add** button in the sidebar
2. Search for a location using the Google Places search
3. Select the desired location from autocomplete results
4. Review the preview and click **Add Address**
5. The new address will appear in the sidebar and on the map

### Adding Addresses via Text File

1. Edit `backend/addresses_raw.txt`
2. Add addresses (one per line):
   ```
   The White House, Washington DC
   Lincoln Memorial
   600 Independence Ave SW, Washington, DC 20560
   ```
3. Run the processing script:
   ```bash
   cd backend
   python process_addresses.py
   ```
4. Refresh the frontend to see updated addresses

### Advanced Processing Options

```bash
# Append new addresses without removing existing ones
python process_addresses.py --append

# Process from a different file
python process_addresses.py --input my_addresses.txt

# Combine options
python process_addresses.py --append --input new_locations.txt
```

### Managing Addresses

- **Toggle Visibility**: Click the checkbox next to an address to show/hide it on the map
- **Delete Address**: Hover over an address and click the trash icon
- **View on Map**: Click a marker to see address details in a popup

### DC Metro Overlay

Click the **Show DC Metro** button in the top-right corner of the map to:
- Display all Metro lines (colored by route)
- Show Metro station locations
- Click stations for more information

Metro lines are color-coded:
- 🔴 Red Line
- 🔵 Blue Line
- 🟠 Orange Line
- 🟢 Green Line
- 🟡 Yellow Line
- ⚪ Silver Line

## Project Structure

```
dc-bar-mapper/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── process_addresses.py    # Address geocoding script
│   ├── addresses_raw.txt       # Raw address input
│   ├── addresses.csv           # Processed geocoded data
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment variables (create from .env.example)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.jsx         # Leaflet map with Metro overlay
│   │   │   ├── AddressSidebar.jsx  # Address list and controls
│   │   │   └── AddressSearch.jsx   # Google Places search modal
│   │   ├── App.jsx             # Main application component
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Global styles with Tailwind
│   ├── index.html              # HTML entry point
│   ├── package.json            # Node dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── .env                    # Environment variables (create from .env.example)
│
└── README.md                   # This file
```

## API Documentation

The backend provides a REST API for managing addresses:

### Endpoints

#### `GET /api/addresses`
Retrieve all addresses.

**Response:**
```json
[
  {
    "id": 1,
    "name": "The White House",
    "address": "1600 Pennsylvania Avenue NW, Washington, DC 20500, USA",
    "lat": 38.8977,
    "lng": -77.0365,
    "visible": true
  }
]
```

#### `POST /api/addresses`
Add a new address.

**Request Body:**
```json
{
  "name": "Lincoln Memorial",
  "address": "2 Lincoln Memorial Cir NW, Washington, DC 20037, USA",
  "lat": 38.8893,
  "lng": -77.0502
}
```

**Response:** Returns the created address with assigned ID.

#### `PATCH /api/addresses/{id}`
Update an address (typically for toggling visibility).

**Request Body:**
```json
{
  "visible": false
}
```

**Response:** Returns the updated address.

#### `DELETE /api/addresses/{id}`
Delete an address by ID.

**Response:**
```json
{
  "message": "Address deleted successfully"
}
```

#### `POST /api/addresses/process`
Trigger reprocessing of `addresses_raw.txt`.

**Response:**
```json
{
  "message": "Addresses processed successfully",
  "output": "Processing output..."
}
```

### Interactive API Docs

When the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run with auto-reload
uvicorn main:app --reload

# Run on different port
uvicorn main:app --reload --port 8080

# Run tests (if you add them)
pytest
```

### Frontend Development

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

**Backend (.env):**
```env
GOOGLE_MAPS_API_KEY=your_geocoding_api_key
```

**Frontend (.env):**
```env
VITE_GOOGLE_MAPS_API_KEY=your_places_api_key
```

## Troubleshooting

### Common Issues

**"GOOGLE_MAPS_API_KEY environment variable not set"**
- Ensure `.env` file exists in the backend directory
- Check that the variable name is exactly `GOOGLE_MAPS_API_KEY`
- Restart the backend server after creating `.env`

**"Failed to load Google Maps"**
- Verify your API key is valid
- Ensure Places API and Maps JavaScript API are enabled
- Check browser console for specific error messages
- Make sure you're using `VITE_GOOGLE_MAPS_API_KEY` in frontend `.env`

**"No addresses found" after processing**
- Check that `addresses_raw.txt` exists and contains addresses
- Verify your Google Maps API key has Geocoding API enabled
- Look for error messages in the console output
- Check `addresses_failed.txt` for failed geocoding attempts

**Markers not showing on map**
- Ensure addresses have `visible: true` in the CSV
- Check that coordinates are valid (within DC area)
- Open browser console for JavaScript errors
- Verify Leaflet CSS is loading correctly

**Metro overlay not appearing**
- Check browser console for network errors
- Verify internet connection (GeoJSON files are fetched from GitHub)
- Try refreshing the page

## Production Deployment

### Backend

```bash
# Install production dependencies
pip install -r requirements.txt

# Run with Gunicorn (recommended)
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend

```bash
# Build for production
npm run build

# The dist/ folder contains static files
# Deploy to any static hosting service (Vercel, Netlify, S3, etc.)
```

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- DC Metro GeoJSON data from [benbalter/dc-maps](https://github.com/benbalter/dc-maps)
- Map tiles from [OpenStreetMap](https://www.openstreetmap.org/)
- Icons from [Heroicons](https://heroicons.com/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions:
1. Check the Troubleshooting section above
2. Review API documentation at `/docs`
3. Open an issue on GitHub
