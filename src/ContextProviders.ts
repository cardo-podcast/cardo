import { createContext, useContext } from "react";
import { SyncContextType } from "./sync";



export const SyncContext = createContext<SyncContextType | null>(null)
export const useSync = () => useContext(SyncContext) as SyncContextType