const HISTORY_KEY = 'minimax_video_history'
const MAX_HISTORY = 50 // Keep last 50 videos

export const saveToHistory = (videoData) => {
  try {
    const history = getHistory()
    
    // Check if this task already exists in history
    const existingIndex = history.findIndex(item => item.taskId === videoData.taskId)
    
    if (existingIndex !== -1) {
      // Update existing entry (in case we're adding video URL later)
      history[existingIndex] = {
        ...history[existingIndex],
        ...videoData,
        // Preserve original createdAt if updating
        createdAt: history[existingIndex].createdAt || videoData.createdAt,
      }
    } else {
      // Add new video to the beginning
      history.unshift(videoData)
    }
    
    // Keep only the last MAX_HISTORY items
    const trimmedHistory = history.slice(0, MAX_HISTORY)
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory))
    console.log('Saved to history:', videoData.taskId)
  } catch (error) {
    console.error('Error saving to history:', error)
  }
}

export const getHistory = () => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading history:', error)
    return []
  }
}

export const clearHistory = () => {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error('Error clearing history:', error)
  }
}

export const removeFromHistory = (taskId) => {
  try {
    const history = getHistory()
    const filtered = history.filter(item => item.taskId !== taskId)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error removing from history:', error)
  }
}

