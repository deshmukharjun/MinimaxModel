import { useState, useEffect } from 'react'
import { getHistory, clearHistory } from '../utils/history'

export default function History() {
  const [history, setHistory] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    const saved = getHistory()
    setHistory(saved)
  }

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      clearHistory()
      setHistory([])
      setSelectedVideo(null)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No History Yet</h3>
          <p className="text-gray-500">Your generated videos will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Generation History</h2>
          <p className="text-gray-500 mt-1">{history.length} video{history.length !== 1 ? 's' : ''} generated</p>
        </div>
        <button
          onClick={handleClearHistory}
          className="btn-secondary text-red-600 border-red-600 hover:bg-red-50"
        >
          Clear History
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map((item, index) => (
          <div
            key={item.taskId || index}
            className="card cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setSelectedVideo(item)}
          >
            {/* Thumbnail */}
            <div className="relative mb-4 rounded-xl overflow-hidden bg-gray-100 aspect-video">
              {item.image ? (
                <img
                  src={item.image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute top-2 right-2 flex flex-col items-end space-y-1">
                {item.mode && (
                  <div className="bg-blue-600/80 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                    {item.mode.replace(/-/g, ' ')}
                  </div>
                )}
                <div className="bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                  {item.model}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800 truncate">
                {item.prompt || 'No description'}
              </h3>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatDate(item.createdAt)}</span>
                {item.dimensions && (
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {item.dimensions.width}x{item.dimensions.height}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Video Details</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video */}
            {(selectedVideo.videoUrl || selectedVideo.localVideoUrl) && (
              <div className="mb-6 rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                <video
                  src={selectedVideo.localVideoUrl || selectedVideo.videoUrl}
                  controls
                  className="w-full"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Details */}
            <div className="space-y-4">
              {selectedVideo.mode && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Mode</label>
                  <p className="text-gray-800 capitalize">{selectedVideo.mode.replace(/-/g, ' ')}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-gray-600">Model</label>
                <p className="text-gray-800">{selectedVideo.model}</p>
              </div>
              {selectedVideo.prompt && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Description</label>
                  <p className="text-gray-800">{selectedVideo.prompt}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-gray-600">Created</label>
                <p className="text-gray-800">{formatDate(selectedVideo.createdAt)}</p>
              </div>
              {selectedVideo.dimensions && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Dimensions</label>
                  <p className="text-gray-800">
                    {selectedVideo.dimensions.width} x {selectedVideo.dimensions.height}
                  </p>
                </div>
              )}
              {(selectedVideo.videoUrl || selectedVideo.localVideoUrl) && (
                <div className="flex space-x-3">
                  {selectedVideo.localVideoUrl && (
                    <a
                      href={selectedVideo.localVideoUrl}
                      download
                      className="btn-primary inline-flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download Local Copy</span>
                    </a>
                  )}
                  {selectedVideo.videoUrl && (
                    <a
                      href={selectedVideo.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary inline-flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download Original</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

