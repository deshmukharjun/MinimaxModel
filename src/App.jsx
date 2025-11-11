import { useState } from 'react'
import VideoGenerator from './components/VideoGenerator'
import History from './components/History'

function App() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Minimax AI
                </h1>
                <p className="text-sm text-gray-500">Image to Video Generator</p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('generate')}
                className={`px-6 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'generate'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Generate
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                History
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'generate' ? <VideoGenerator /> : <History />}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 text-center text-gray-500 text-sm">
        <p>Powered by Minimax AI • Transform your images into stunning videos</p>
      </footer>
    </div>
  )
}

export default App

