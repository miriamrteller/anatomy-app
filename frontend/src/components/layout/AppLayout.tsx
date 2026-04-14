import React from 'react'

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * Root layout component for the anatomy app.
 * Provides the basic structure: header, main content grid with sidebar.
 * All children are positioned within the main content area.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="w-full h-screen bg-gray-100 p-4">
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <h1 className="text-3xl font-bold text-gray-900">Anatomy App</h1>
          <p className="text-gray-600">Interactive anatomical structure explorer</p>
        </div>

        {/* Main content area with sidebar */}
        <div className="flex-1 flex gap-4">
          {children}
        </div>
      </div>
    </div>
  )
}
