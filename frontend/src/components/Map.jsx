import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// DC Metro line colors
const METRO_COLORS = {
  red: '#E51636',
  blue: '#0078A8',
  orange: '#ED8B00',
  green: '#00A84F',
  yellow: '#FFD200',
  silver: '#A0A3A6'
}

// GeoJSON URLs - DC GIS Open Data (ArcGIS FeatureServer)
const METRO_STATIONS_URL = 'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Transportation_Rail_Bus_WebMercator/MapServer/51/query?where=1=1&outFields=*&f=geojson'
const METRO_LINES_URL = 'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Transportation_Rail_Bus_WebMercator/MapServer/106/query?where=1=1&outFields=*&f=geojson'

// Helper component to control map from outside
function MapController({ zoomTarget }) {
  const map = useMap()

  useEffect(() => {
    if (zoomTarget) {
      map.setView([zoomTarget.lat, zoomTarget.lng], 16, {
        animate: true,
        duration: 0.5
      })
    }
  }, [zoomTarget, map])

  return null
}

function Map({ addresses, onZoomToRef }) {
  const [showMetro, setShowMetro] = useState(false)
  const [showStations, setShowStations] = useState(false)
  const [metroStations, setMetroStations] = useState(null)
  const [metroLines, setMetroLines] = useState(null)
  const [loading, setLoading] = useState(false)
  const [zoomTarget, setZoomTarget] = useState(null)
  const [persistentLabels, setPersistentLabels] = useState(false)
  const [pinnedAddresses, setPinnedAddresses] = useState(new Set())
  const markerRefs = useRef({})
  const programmaticCloseRef = useRef(false)

  // Default center: Washington DC
  const center = [38.9072, -77.0369]
  const zoom = 12

  // Expose zoom function to parent
  useEffect(() => {
    if (onZoomToRef) {
      onZoomToRef.current = (lat, lng) => {
        setZoomTarget({ lat, lng })
      }
    }
  }, [onZoomToRef])

  // Handle marker click for persistent labels
  const handleMarkerClick = (addressId) => {
    if (persistentLabels) {
      setPinnedAddresses(prev => {
        const newSet = new Set(prev)
        if (newSet.has(addressId)) {
          // Unpin this address
          newSet.delete(addressId)
        } else {
          // Pin this address
          newSet.add(addressId)
        }
        return newSet
      })
    }
  }

  // Clear all pinned addresses
  const clearPinnedLabels = () => {
    setPinnedAddresses(new Set())
  }

  // Keep pinned popups open and close unpinned ones
  useEffect(() => {
    console.log('Popup management effect running', {
      persistentLabels,
      pinnedCount: pinnedAddresses.size,
      pinnedIds: Array.from(pinnedAddresses)
    })

    if (!persistentLabels) {
      // If persistent labels is off, close all popups
      Object.entries(markerRefs.current).forEach(([id, marker]) => {
        if (marker && marker.isPopupOpen()) {
          marker.closePopup()
        }
      })
      return
    }

    // When persistent labels is on, sync popup state with pinned addresses
    // This runs after state updates to keep popups in sync
    setTimeout(() => {
      Object.entries(markerRefs.current).forEach(([id, marker]) => {
        if (!marker) return

        const shouldBeOpen = pinnedAddresses.has(Number(id))
        const isOpen = marker.isPopupOpen()

        if (shouldBeOpen && !isOpen) {
          console.log(`Opening popup for pinned marker ${id}`)
          marker.openPopup()
        } else if (!shouldBeOpen && isOpen) {
          console.log(`Closing popup for unpinned marker ${id}`)
          programmaticCloseRef.current = true
          marker.closePopup()
          // Reset after a short delay
          setTimeout(() => {
            programmaticCloseRef.current = false
          }, 50)
        }
      })
    }, 10)
  }, [pinnedAddresses, persistentLabels])

  // Fetch Metro data when toggle is enabled
  useEffect(() => {
    if (showMetro && !metroStations && !metroLines) {
      setLoading(true)
      console.log('Fetching DC Metro data...')

      Promise.all([
        fetch(METRO_STATIONS_URL).then(res => res.json()),
        fetch(METRO_LINES_URL).then(res => res.json())
      ])
        .then(([stations, lines]) => {
          console.log('Metro stations loaded:', stations.features?.length)
          console.log('Metro lines loaded:', lines.features?.length)
          setMetroStations(stations)
          setMetroLines(lines)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error loading metro data:', err)
          setLoading(false)
        })
    }
  }, [showMetro, metroStations, metroLines])

  // Style function for metro lines - more prominent
  const metroLineStyle = (feature) => {
    // DC GIS uses NAME field
    const name = (feature.properties?.NAME || feature.properties?.name || '').toLowerCase()
    let color = '#888'

    // Match line color based on name
    if (name.includes('red')) color = METRO_COLORS.red
    else if (name.includes('blue')) color = METRO_COLORS.blue
    else if (name.includes('orange')) color = METRO_COLORS.orange
    else if (name.includes('green')) color = METRO_COLORS.green
    else if (name.includes('yellow')) color = METRO_COLORS.yellow
    else if (name.includes('silver')) color = METRO_COLORS.silver

    return {
      color: color,
      weight: 5,        // Thicker lines
      opacity: 0.9,     // More opaque
      dashArray: '10, 5' // Dashed pattern to stand out
    }
  }

  // Point to layer function for metro stations - more visible
  const metroStationPointToLayer = (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 6,
      fillColor: '#ffffff',
      color: '#2563eb',      // Blue border
      weight: 2,
      opacity: 1,
      fillOpacity: 1
    })
  }

  // Station popup and tooltip
  const onEachStation = (feature, layer) => {
    // DC GIS uses NAME field
    const name = feature.properties?.NAME || feature.properties?.name
    if (name) {
      layer.bindPopup(`<strong>${name}</strong><br/>Metro Station`)

      // Always show tooltip if showStations is enabled
      if (showStations) {
        layer.bindTooltip(name, {
          permanent: true,
          direction: 'right',
          className: 'metro-station-label',
          offset: [8, 0]
        })
      }
    }
  }

  return (
    <div className="flex-1 relative">
      {/* Control Buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Persistent Labels Toggle */}
        <button
          onClick={() => {
            setPersistentLabels(!persistentLabels)
            if (persistentLabels) {
              clearPinnedLabels()
            }
          }}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${
            persistentLabels
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          {persistentLabels ? 'Persistent Labels ON' : 'Persistent Labels OFF'}
        </button>

        {/* Clear Labels Button (only show when there are pinned labels) */}
        {pinnedAddresses.size > 0 && (
          <button
            onClick={clearPinnedLabels}
            className="px-4 py-2 rounded-lg shadow-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
          >
            Clear Labels ({pinnedAddresses.size})
          </button>
        )}

        {/* Metro Lines Toggle */}
        <button
          onClick={() => setShowMetro(!showMetro)}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${
            showMetro
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
          disabled={loading}
        >
          {loading ? 'Loading...' : showMetro ? 'Hide Metro Lines' : 'Show Metro Lines'}
        </button>

        {/* Station Labels Toggle (only show when metro is visible) */}
        {showMetro && metroStations && (
          <button
            onClick={() => setShowStations(!showStations)}
            className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${
              showStations
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {showStations ? 'Hide Station Labels' : 'Show Station Labels'}
          </button>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
      >
        <MapController zoomTarget={zoomTarget} />

        {/* Less colorful base map - CartoDB Positron */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Address Markers */}
        {addresses.map((address) => {
          const isPinned = pinnedAddresses.has(address.id)

          return (
            <Marker
              key={`${address.id}-${persistentLabels ? 'persistent' : 'normal'}`}
              position={[address.lat, address.lng]}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[address.id] = ref
                }
              }}
              eventHandlers={{
                click: () => {
                  console.log(`Marker ${address.id} clicked, persistent: ${persistentLabels}`)
                  handleMarkerClick(address.id)
                },
                popupclose: () => {
                  console.log(`Popup ${address.id} closing, pinned: ${isPinned}, programmatic: ${programmaticCloseRef.current}`)
                  // When user manually closes a popup (clicks X), unpin it
                  // But ignore programmatic closes from our useEffect
                  if (persistentLabels && isPinned && !programmaticCloseRef.current) {
                    console.log(`User closed popup ${address.id}, unpinning`)
                    setPinnedAddresses(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(address.id)
                      return newSet
                    })
                  }
                }
              }}
            >
              <Popup
                closeButton={true}
                autoClose={!persistentLabels}
                closeOnClick={!persistentLabels}
                closeOnEscapeKey={true}
              >
                <div className="text-sm">
                  <div className="font-bold mb-1">{address.name}</div>
                  <div className="text-gray-600 text-xs">{address.address}</div>
                  {persistentLabels && (
                    <div className="text-xs text-purple-600 mt-1">
                      {isPinned ? '📌 Pinned' : 'Click to pin'}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Metro Lines */}
        {showMetro && metroLines && (
          <GeoJSON
            key="metro-lines"
            data={metroLines}
            style={metroLineStyle}
          />
        )}

        {/* Metro Stations - key changes when showStations changes to force re-render */}
        {showMetro && metroStations && (
          <GeoJSON
            key={`metro-stations-${showStations}`}
            data={metroStations}
            pointToLayer={metroStationPointToLayer}
            onEachFeature={onEachStation}
          />
        )}
      </MapContainer>
    </div>
  )
}

export default Map
