import React from 'react'
import Editor from './components/Editor'

export default function App(){
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Thumbnail Creator</h1>
        <Editor />
      </div>
    </div>
  )
}
