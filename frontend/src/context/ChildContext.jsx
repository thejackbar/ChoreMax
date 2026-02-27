import { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../api/client'

const ChildContext = createContext(null)

export function ChildProvider({ children: reactChildren }) {
  const [activeChild, setActiveChild] = useState(null)
  const [children, setChildren] = useState([])
  const [loadingChildren, setLoadingChildren] = useState(false)

  const fetchChildren = useCallback(async () => {
    setLoadingChildren(true)
    try {
      const data = await api.children.list()
      setChildren(data)
    } catch {
      setChildren([])
    } finally {
      setLoadingChildren(false)
    }
  }, [])

  return (
    <ChildContext.Provider value={{
      activeChild,
      setActiveChild,
      children,
      setChildren,
      loadingChildren,
      fetchChildren,
    }}>
      {reactChildren}
    </ChildContext.Provider>
  )
}

export function useChild() {
  const ctx = useContext(ChildContext)
  if (!ctx) throw new Error('useChild must be used within ChildProvider')
  return ctx
}
