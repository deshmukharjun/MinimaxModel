import { useState, useRef } from 'react'
import { saveToHistory } from '../utils/history'

const MODELS = {
  'text-to-video': [
    { value: 'MiniMax-Hailuo-2.3', label: 'Hailuo 2.3' },
    { value: 'MiniMax-Hailuo-2.3-Fast', label: 'Hailuo 2.3 Fast' },
    { value: 'MiniMax-Hailuo-02', label: 'Hailuo 02' },
  ],
  'image-to-video': [
    { value: 'MiniMax-Hailuo-2.3', label: 'Hailuo 2.3' },
    { value: 'MiniMax-Hailuo-2.3-Fast', label: 'Hailuo 2.3 Fast' },
    { value: 'MiniMax-Hailuo-02', label: 'Hailuo 02' },
    { value: 'I2V-01-Director', label: 'I2V-01 Director' },
    { value: 'I2V-01-live', label: 'I2V-01 Live' },
    { value: 'I2V-01', label: 'I2V-01' },
  ],
  'first-last-frame': [
    { value: 'MiniMax-Hailuo-02', label: 'Hailuo 02' },
  ],
  'subject-reference': [
    { value: 'S2V-01', label: 'S2V-01' },
  ],
}

const RESOLUTIONS = {
  'MiniMax-Hailuo-2.3': ['768P', '1080P'],
  'MiniMax-Hailuo-2.3-Fast': ['768P', '1080P'],
  'MiniMax-Hailuo-02': ['512P', '768P', '1080P'],
  'I2V-01-Director': ['720P'],
  'I2V-01-live': ['720P'],
  'I2V-01': ['720P'],
  'S2V-01': ['1080P'],
}

const MODES = [
  { value: 'text-to-video', label: 'Text to Video' },
  { value: 'image-to-video', label: 'Image to Video' },
  { value: 'first-last-frame', label: 'First & Last Frame' },
  { value: 'subject-reference', label: 'Subject Reference' },
]

export default function VideoGenerator() {
  const [activeMode, setActiveMode] = useState('text-to-video')
  
  const [formData, setFormData] = useState({
    mode: 'text-to-video',
    model: 'MiniMax-Hailuo-2.3',
    prompt: '',
    first_frame_image: '',
    last_frame_image: '',
    subject_reference: [],
    prompt_optimizer: true,
    fast_pretreatment: false,
    duration: 6,
    resolution: '768P',
  })
  
  const [imagePreview, setImagePreview] = useState(null)
  const [lastImagePreview, setLastImagePreview] = useState(null)
  const [subjectImagePreview, setSubjectImagePreview] = useState(null)
  const [imageSource, setImageSource] = useState('upload')
  const [lastImageSource, setLastImageSource] = useState('upload')
  const [subjectImageSource, setSubjectImageSource] = useState('upload')
  const [taskId, setTaskId] = useState(null)
  const [status, setStatus] = useState(null)
  const [statusDisplay, setStatusDisplay] = useState('')
  const [videoUrl, setVideoUrl] = useState(null)
  const [localVideoUrl, setLocalVideoUrl] = useState(null)
  const [videoDimensions, setVideoDimensions] = useState(null)
  const [error, setError] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef(null)
  const lastFileInputRef = useRef(null)
  const subjectFileInputRef = useRef(null)
  const statusCheckIntervalRef = useRef(null)

  // Update form data when mode changes
  const handleModeChange = (newMode) => {
    setActiveMode(newMode)
    const availableModels = MODELS[newMode] || []
    const defaultModel = availableModels[0]?.value || 'MiniMax-Hailuo-2.3'
    setFormData({
      ...formData,
      mode: newMode,
      model: defaultModel,
      resolution: RESOLUTIONS[defaultModel]?.[0] || '768P',
    })
    setError(null)
    setImagePreview(null)
    setLastImagePreview(null)
    setSubjectImagePreview(null)
  }

  const handleImageUpload = (e, type = 'first') => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      setError('Image size must be less than 20MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      if (type === 'first') {
        setFormData({ ...formData, first_frame_image: base64 })
        setImagePreview(base64)
      } else if (type === 'last') {
        setFormData({ ...formData, last_frame_image: base64 })
        setLastImagePreview(base64)
      } else if (type === 'subject') {
        setFormData({ 
          ...formData, 
          subject_reference: [{
            type: 'character',
            image: [base64]
          }]
        })
        setSubjectImagePreview(base64)
      }
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleImageUrlInput = async (e, type = 'first') => {
    const url = e.target.value.trim()
    if (!url) {
      if (type === 'first') {
        setFormData({ ...formData, first_frame_image: '' })
        setImagePreview(null)
      } else if (type === 'last') {
        setFormData({ ...formData, last_frame_image: '' })
        setLastImagePreview(null)
      } else if (type === 'subject') {
        setFormData({ ...formData, subject_reference: [] })
        setSubjectImagePreview(null)
      }
      return
    }

    try {
      new URL(url)
      if (type === 'first') {
        setFormData({ ...formData, first_frame_image: url })
        setImagePreview(url)
      } else if (type === 'last') {
        setFormData({ ...formData, last_frame_image: url })
        setLastImagePreview(url)
      } else if (type === 'subject') {
        setFormData({ 
          ...formData, 
          subject_reference: [{
            type: 'character',
            image: [url]
          }]
        })
        setSubjectImagePreview(url)
      }
      setError(null)
    } catch {
      setError('Please enter a valid URL')
    }
  }

  const validateForm = () => {
    if (!formData.model) {
      setError('Please select a model')
      return false
    }

    if (activeMode === 'text-to-video') {
      if (!formData.prompt) {
        setError('Please provide a prompt for text-to-video')
        return false
      }
    } else if (activeMode === 'image-to-video') {
      if (!formData.first_frame_image) {
        setError('Please provide a starting image')
        return false
      }
    } else if (activeMode === 'first-last-frame') {
      if (!formData.first_frame_image || !formData.last_frame_image) {
        setError('Please provide both first and last frame images')
        return false
      }
    } else if (activeMode === 'subject-reference') {
      if (!formData.subject_reference || formData.subject_reference.length === 0) {
        setError('Please provide a subject reference image')
        return false
      }
    }

    return true
  }

  const generateVideo = async () => {
    if (!validateForm()) return

    setIsGenerating(true)
    setError(null)
    setTaskId(null)
    setStatus(null)
    setStatusDisplay('')
    setVideoUrl(null)
    setLocalVideoUrl(null)

    try {
      const response = await fetch('/api/video-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mode: activeMode,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`Server error ${response.status}: ${errorText || 'Unknown error'}`)
        }
        throw new Error(errorData.error || `Server error ${response.status}`)
      }

      const data = await response.json()

      setTaskId(data.task_id)
      setStatus('processing')
      setStatusDisplay('Preparing')
      
      startStatusCheck(data.task_id)
    } catch (err) {
      setError(err.message)
      setIsGenerating(false)
    }
  }

  const downloadAndSaveVideo = async (downloadUrl, taskId, fileId) => {
    try {
      const response = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          download_url: downloadUrl,
          task_id: taskId,
          file_id: fileId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Video download failed:', response.status, errorText)
        return null
      }

      const data = await response.json()
      if (data.local_url) {
        setLocalVideoUrl(data.local_url)
        return data.local_url
      }
    } catch (err) {
      console.error('Error downloading video locally:', err)
      if (err.message && err.message.includes('JSON')) {
        console.error('JSON parsing error - response might be invalid')
      }
    }
    return null
  }

  const startStatusCheck = (taskId) => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current)
    }

    statusCheckIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/video-generation/${taskId}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            throw new Error(`Status ${response.status}: ${errorText}`)
          }
          throw new Error(errorData.error || 'Failed to check status')
        }

        const data = await response.json()

        const currentStatus = (data.status || '').toLowerCase()
        setStatus(currentStatus)
        setStatusDisplay(data.status || currentStatus)

        if (currentStatus === 'success') {
          clearInterval(statusCheckIntervalRef.current)
          setIsGenerating(false)

          const url = data.file_url || data.download_url || data.url || data.video_url
          const fileId = data.file_id
          
          if (url) {
            setVideoUrl(url)
            setVideoDimensions({
              width: data.video_width,
              height: data.video_height,
            })
            
            // Download and save video locally
            const localUrl = await downloadAndSaveVideo(url, taskId, fileId)
            
            // Save to history
            saveToHistory({
              taskId: data.task_id,
              mode: activeMode,
              model: formData.model,
              prompt: formData.prompt,
              image: formData.first_frame_image || formData.subject_reference?.[0]?.image?.[0] || null,
              videoUrl: localUrl || url,
              localVideoUrl: localUrl,
              dimensions: { width: data.video_width, height: data.video_height },
              createdAt: new Date().toISOString(),
            })
          } else if (fileId) {
            fetchVideoUrl(fileId, data.video_width, data.video_height, taskId)
          } else {
            saveToHistory({
              taskId: data.task_id,
              mode: activeMode,
              model: formData.model,
              prompt: formData.prompt,
              image: formData.first_frame_image || formData.subject_reference?.[0]?.image?.[0] || null,
              videoUrl: null,
              dimensions: { width: data.video_width, height: data.video_height },
              createdAt: new Date().toISOString(),
            })
          }
        } else if (currentStatus === 'fail' || currentStatus === 'failed') {
          clearInterval(statusCheckIntervalRef.current)
          setIsGenerating(false)
          setError('Video generation failed. Please try again.')
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }, 3000)
  }

  const fetchVideoUrl = async (fileId, width, height, taskId) => {
    try {
      const response = await fetch(`/api/video-file/${fileId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video URL')
      }

      const url = (data.file && data.file.download_url) || data.download_url || data.url || data.file_url || data.video_url
      
      if (url) {
        setVideoUrl(url)
        setVideoDimensions({ width, height })
        
        // Download and save video locally
        const localUrl = await downloadAndSaveVideo(url, taskId, fileId)
        
        saveToHistory({
          taskId: taskId || fileId,
          mode: activeMode,
          model: formData.model,
          prompt: formData.prompt,
          image: formData.first_frame_image || formData.subject_reference?.[0]?.image?.[0] || null,
          videoUrl: localUrl || url,
          localVideoUrl: localUrl,
          dimensions: { width, height },
          createdAt: new Date().toISOString(),
        })
      } else {
        saveToHistory({
          taskId: taskId || fileId,
          mode: activeMode,
          model: formData.model,
          prompt: formData.prompt,
          image: formData.first_frame_image || formData.subject_reference?.[0]?.image?.[0] || null,
          videoUrl: null,
          dimensions: { width, height },
          createdAt: new Date().toISOString(),
        })
        console.warn('Video URL not available, but task saved to history')
      }
    } catch (err) {
      console.error('Error fetching video URL:', err)
      saveToHistory({
        taskId: taskId || fileId,
        mode: activeMode,
        model: formData.model,
        prompt: formData.prompt,
        image: formData.first_frame_image || formData.subject_reference?.[0]?.image?.[0] || null,
        videoUrl: null,
        dimensions: { width, height },
        createdAt: new Date().toISOString(),
      })
      setError('Video generated but URL not available. Check Minimax dashboard.')
    }
  }

  const getStatusColor = () => {
    if (status === 'success') return 'text-green-600 bg-green-50'
    if (status === 'fail' || status === 'failed') return 'text-red-600 bg-red-50'
    return 'text-blue-600 bg-blue-50'
  }

  const availableModels = MODELS[activeMode] || []
  const availableResolutions = RESOLUTIONS[formData.model] || ['720P']

  const renderImageInput = (type, preview, setPreview, imageSource, setImageSource, fileInputRef, label, required = false) => {
    return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {label} {required && '*'}
        </label>
        
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => {
              setImageSource('upload')
              if (type === 'first') {
                setFormData({ ...formData, first_frame_image: '' })
                setPreview(null)
              } else if (type === 'last') {
                setFormData({ ...formData, last_frame_image: '' })
                setPreview(null)
              } else if (type === 'subject') {
                setFormData({ ...formData, subject_reference: [] })
                setPreview(null)
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              imageSource === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upload Image
          </button>
          <button
            onClick={() => {
              setImageSource('url')
              if (type === 'first') {
                setFormData({ ...formData, first_frame_image: '' })
                setPreview(null)
              } else if (type === 'last') {
                setFormData({ ...formData, last_frame_image: '' })
                setPreview(null)
              } else if (type === 'subject') {
                setFormData({ ...formData, subject_reference: [] })
                setPreview(null)
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              imageSource === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Image URL
          </button>
        </div>

        {imageSource === 'upload' ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleImageUpload(e, type)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 transition-colors text-gray-600 hover:text-blue-600"
            >
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Click to upload or drag and drop</span>
                <span className="text-sm">JPG, PNG, WebP (max 20MB)</span>
              </div>
            </button>
          </div>
        ) : (
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            onChange={(e) => handleImageUrlInput(e, type)}
            className="input-field"
          />
        )}

        {preview && (
          <div className="mt-4 rounded-xl overflow-hidden border-2 border-gray-200">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-64 object-cover"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Card */}
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Video Generation</h2>

        {/* Mode Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-1">
            {MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleModeChange(mode.value)}
                className={`px-6 py-3 font-medium transition-all ${
                  activeMode === mode.value
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text-to-Video Mode */}
        {activeMode === 'text-to-video' && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Video Description *
              </label>
              <textarea
                placeholder="Describe the video you want to generate... (e.g., A tiktok dancer is dancing on a drone, doing flips and tricks.)"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={4}
                className="input-field"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.prompt.length}/2000 characters
              </p>
            </div>
          </>
        )}

        {/* Image-to-Video Mode */}
        {activeMode === 'image-to-video' && (
          <>
            {renderImageInput('first', imagePreview, setImagePreview, imageSource, setImageSource, fileInputRef, 'Starting Image', true)}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Video Description (Optional)
              </label>
              <textarea
                placeholder="Describe how the scene evolves from the starting image... (e.g., Contemporary dance, the people in the picture are performing contemporary dance.)"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={4}
                className="input-field"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.prompt.length}/2000 characters
              </p>
            </div>
          </>
        )}

        {/* First-Last-Frame Mode */}
        {activeMode === 'first-last-frame' && (
          <>
            {renderImageInput('first', imagePreview, setImagePreview, imageSource, setImageSource, fileInputRef, 'First Frame Image', true)}
            {renderImageInput('last', lastImagePreview, setLastImagePreview, lastImageSource, setLastImageSource, lastFileInputRef, 'Last Frame Image', true)}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Video Description (Optional)
              </label>
              <textarea
                placeholder="Describe the transformation... (e.g., A little girl grow up.)"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={4}
                className="input-field"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.prompt.length}/2000 characters
              </p>
            </div>
          </>
        )}

        {/* Subject-Reference Mode */}
        {activeMode === 'subject-reference' && (
          <>
            {renderImageInput('subject', subjectImagePreview, setSubjectImagePreview, subjectImageSource, setSubjectImageSource, subjectFileInputRef, 'Subject Reference Image (Face Photo)', true)}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Video Description *
              </label>
              <textarea
                placeholder="Describe the video with the subject... (e.g., On an overcast day, in an ancient cobbled alleyway, the model is dressed in a brown corduroy jacket...)"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={6}
                className="input-field"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.prompt.length}/2000 characters
              </p>
            </div>
          </>
        )}

        {/* Common Fields */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Model *
          </label>
          <select
            value={formData.model}
            onChange={(e) => {
              const newModel = e.target.value
              setFormData({
                ...formData,
                model: newModel,
                resolution: RESOLUTIONS[newModel]?.[0] || '720P',
              })
            }}
            className="input-field"
          >
            {availableModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Resolution
          </label>
          <select
            value={formData.resolution}
            onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
            className="input-field"
          >
            {availableResolutions.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Duration (seconds)
          </label>
          <input
            type="number"
            min="6"
            max="10"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            className="input-field"
          />
        </div>

        {/* Options */}
        <div className="mb-6 space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.prompt_optimizer}
              onChange={(e) => setFormData({ ...formData, prompt_optimizer: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Prompt Optimizer</span>
          </label>
          {(formData.model === 'MiniMax-Hailuo-2.3' || 
            formData.model === 'MiniMax-Hailuo-2.3-Fast' || 
            formData.model === 'MiniMax-Hailuo-02') && (
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.fast_pretreatment}
                onChange={(e) => setFormData({ ...formData, fast_pretreatment: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Fast Pretreatment</span>
            </label>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={generateVideo}
          disabled={isGenerating}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            'Generate Video'
          )}
        </button>
      </div>

      {/* Status Card */}
      {taskId && (
        <div className="card animate-fade-in">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Generation Status</h3>
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm text-gray-600">Task ID:</span>
            <code className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-mono">{taskId}</code>
          </div>
          {statusDisplay && (
            <div className={`inline-flex items-center px-4 py-2 rounded-lg ${getStatusColor()}`}>
              <span className="font-semibold">{statusDisplay}</span>
            </div>
          )}
        </div>
      )}

      {/* Video Result */}
      {(videoUrl || localVideoUrl) && (
        <div className="card animate-fade-in">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Generated Video
            {videoDimensions && ` (${videoDimensions.width}x${videoDimensions.height})`}
          </h3>
          <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
            <video
              src={localVideoUrl || videoUrl}
              controls
              autoPlay
              className="w-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="mt-4 flex space-x-3">
            {localVideoUrl && (
              <a
                href={localVideoUrl}
                download
                className="btn-secondary inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Local Copy</span>
              </a>
            )}
            {videoUrl && (
              <a
                href={videoUrl}
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
        </div>
      )}
    </div>
  )
}
