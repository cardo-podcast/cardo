import { createContext, useContext } from 'react'
import { SyncContextType } from './sync'
import { DB } from './DB'

export const SyncContext = createContext<SyncContextType | null>(null)
export const useSync = () => useContext(SyncContext) as SyncContextType

export const DBContext = createContext<DB | undefined>(undefined)
export function useDB(): DB {
  return useContext(DBContext) as DB
}
