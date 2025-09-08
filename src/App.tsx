import { useState } from 'react'
import { ChromaticGame } from './components/ChromaticGame'
import { Onboarding } from './components/Onboarding'
import { Analytics } from "@vercel/analytics/react"

function App() {
  const [started, setStarted] = useState(false)
  return (
    <div className="min-h-dvh bg-white text-black font-sans">
      <Analytics />
      {started ? (
        <ChromaticGame />
      ) : (
        <Onboarding onStart={() => setStarted(true)} />
      )}
    </div>
  )
}

export default App
