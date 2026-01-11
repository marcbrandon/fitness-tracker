import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to persist form state in local storage.
 * Automatically saves on changes and restores on mount.
 *
 * @param {string} key - Unique key for this form in local storage
 * @param {any} initialValue - Default value when nothing is stored
 * @returns {[any, function, function]} - [value, setValue, clearStorage]
 */
export function useFormStorage(key, initialValue) {
  const storageKey = `fitness-form-${key}`

  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // Storage full or unavailable - ignore
    }
  }, [storageKey, value])

  const clearStorage = useCallback(() => {
    localStorage.removeItem(storageKey)
  }, [storageKey])

  return [value, setValue, clearStorage]
}
