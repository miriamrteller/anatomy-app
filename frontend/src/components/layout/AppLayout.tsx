import React from 'react'
import { HeaderDropdown } from '../HeaderDropdown'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="w-full h-full bg-gray-100 flex flex-col">
      <div className="bg-white shadow-md rounded-lg m-4 p-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anatomy App</h1>
          <p className="text-gray-600">Interactive anatomical structure explorer</p>
        </div>
        <HeaderDropdown />
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden m-4 mt-0">
        {children}
      </div>
    </div>
  )
}
