import { useState, useCallback } from 'react'
import { useLoadScript, Autocomplete } from '@react-google-maps/api'

const libraries = ['places']

function AddressSearch({ onClose, onAdd }) {
  const [autocomplete, setAutocomplete] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [adding, setAdding] = useState(false)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  })

  const onLoad = useCallback((autocompleteInstance) => {
    setAutocomplete(autocompleteInstance)
  }, [])

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace()

      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        // Extract name and formatted address
        const name = place.name || place.formatted_address?.split(',')[0] || 'Unknown Location'
        const address = place.formatted_address || ''

        setSelectedPlace({
          name,
          address,
          lat,
          lng
        })
      }
    }
  }

  const handleAdd = async () => {
    if (!selectedPlace) return

    setAdding(true)
    try {
      await onAdd(selectedPlace)
    } catch (error) {
      console.error('Failed to add address:', error)
    } finally {
      setAdding(false)
    }
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">
            Failed to load Google Maps. Please check your API key.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-lg p-6">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Add Address</h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Autocomplete Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for a location
            </label>
            <Autocomplete
              onLoad={onLoad}
              onPlaceChanged={onPlaceChanged}
              options={{
                componentRestrictions: { country: 'us' },
                fields: ['name', 'formatted_address', 'geometry']
              }}
            >
              <input
                type="text"
                placeholder="e.g., The White House, Washington DC"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </Autocomplete>
          </div>

          {/* Selected Place Preview */}
          {selectedPlace && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">
                {selectedPlace.name}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {selectedPlace.address}
              </div>
              <div className="text-xs text-gray-500">
                Coordinates: {selectedPlace.lat.toFixed(6)}, {selectedPlace.lng.toFixed(6)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            disabled={adding}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedPlace || adding}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : 'Add Address'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddressSearch
