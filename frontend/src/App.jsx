import { useState, useEffect, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import Map from './components/Map'
import AddressSidebar from './components/AddressSidebar'
import AddressSearch from './components/AddressSearch'

const API_BASE = '/api'

function App() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const zoomToRef = useRef(null)

  // Fetch addresses on mount
  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      const response = await fetch(`${API_BASE}/addresses`)
      if (!response.ok) throw new Error('Failed to fetch addresses')
      const data = await response.json()
      setAddresses(data)
    } catch (error) {
      console.error('Error fetching addresses:', error)
      toast.error('Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = async (id, currentVisibility) => {
    // Optimistic update
    setAddresses(prev =>
      prev.map(addr =>
        addr.id === id ? { ...addr, visible: !currentVisibility } : addr
      )
    )

    try {
      const response = await fetch(`${API_BASE}/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !currentVisibility })
      })

      if (!response.ok) throw new Error('Failed to update address')
    } catch (error) {
      console.error('Error toggling visibility:', error)
      toast.error('Failed to update address')
      // Revert optimistic update
      setAddresses(prev =>
        prev.map(addr =>
          addr.id === id ? { ...addr, visible: currentVisibility } : addr
        )
      )
    }
  }

  const handleDelete = async (id) => {
    // Optimistic delete
    const originalAddresses = [...addresses]
    setAddresses(prev => prev.filter(addr => addr.id !== id))

    try {
      const response = await fetch(`${API_BASE}/addresses/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete address')
      toast.success('Address deleted')
    } catch (error) {
      console.error('Error deleting address:', error)
      toast.error('Failed to delete address')
      // Revert optimistic delete
      setAddresses(originalAddresses)
    }
  }

  const handleAddAddress = async (addressData) => {
    try {
      const response = await fetch(`${API_BASE}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      })

      if (!response.ok) throw new Error('Failed to add address')

      const newAddress = await response.json()
      setAddresses(prev => [...prev, newAddress])
      setShowAddModal(false)
      toast.success('Address added')
    } catch (error) {
      console.error('Error adding address:', error)
      toast.error('Failed to add address')
      throw error
    }
  }

  const handleUpdateName = async (id, newName) => {
    // Optimistic update
    const originalAddresses = [...addresses]
    setAddresses(prev =>
      prev.map(addr =>
        addr.id === id ? { ...addr, name: newName } : addr
      )
    )

    try {
      const response = await fetch(`${API_BASE}/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })

      if (!response.ok) throw new Error('Failed to update address name')
      toast.success('Name updated')
    } catch (error) {
      console.error('Error updating name:', error)
      toast.error('Failed to update name')
      // Revert optimistic update
      setAddresses(originalAddresses)
    }
  }

  const handleZoomTo = (lat, lng) => {
    if (zoomToRef.current) {
      zoomToRef.current(lat, lng)
    }
  }

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading addresses...</div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen flex">
      <Toaster position="top-right" />

      <AddressSidebar
        addresses={addresses}
        onToggleVisibility={handleToggleVisibility}
        onDelete={handleDelete}
        onUpdateName={handleUpdateName}
        onZoomTo={handleZoomTo}
        onAdd={() => setShowAddModal(true)}
      />

      <Map
        addresses={addresses.filter(addr => addr.visible)}
        onZoomToRef={zoomToRef}
      />

      {showAddModal && (
        <AddressSearch
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddAddress}
        />
      )}
    </div>
  )
}

export default App
