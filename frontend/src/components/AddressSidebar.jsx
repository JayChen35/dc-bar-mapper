import { useState } from 'react'

function AddressSidebar({ addresses, onToggleVisibility, onDelete, onUpdateName, onAdd }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const startEditing = (id, currentName) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const saveEdit = (id) => {
    if (editingName.trim() && editingName !== addresses.find(a => a.id === id)?.name) {
      onUpdateName(id, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      saveEdit(id)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div className="w-[300px] h-full bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Addresses</h2>
        <button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      {/* Address List */}
      <div className="flex-1 overflow-y-auto">
        {addresses.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No addresses yet. Click "Add" to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="p-4 hover:bg-gray-50 transition-colors"
                onMouseEnter={() => setHoveredId(address.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={address.visible}
                    onChange={() => onToggleVisibility(address.id, address.visible)}
                    className="mt-1 w-4 h-4 accent-blue-600 rounded cursor-pointer flex-shrink-0"
                  />

                  {/* Address Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === address.id ? (
                      // Edit mode
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveEdit(address.id)}
                        onKeyDown={(e) => handleKeyDown(e, address.id)}
                        className="font-semibold text-gray-900 text-sm mb-1 w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      // Display mode
                      <div className="flex items-center gap-1 group">
                        <div className="font-semibold text-gray-900 text-sm mb-1 flex-1">
                          {address.name}
                        </div>
                        <button
                          onClick={() => startEditing(address.id, address.name)}
                          className={`p-1 rounded hover:bg-gray-100 transition-opacity ${
                            hoveredId === address.id ? 'opacity-100' : 'opacity-0'
                          }`}
                          title="Edit name"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 text-gray-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 leading-relaxed">
                      {address.address}
                    </div>
                  </div>

                  {/* Delete Button */}
                  {editingId !== address.id && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${address.name}"?`)) {
                          onDelete(address.id)
                        }
                      }}
                      className={`flex-shrink-0 p-1.5 rounded transition-all ${
                        hoveredId === address.id
                          ? 'bg-red-50 hover:bg-red-100 text-red-600 opacity-100'
                          : 'opacity-0'
                      }`}
                      aria-label="Delete address"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 text-center">
          {addresses.length} {addresses.length === 1 ? 'address' : 'addresses'} total
        </div>
      </div>
    </div>
  )
}

export default AddressSidebar
