import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'

interface Stream {
  streamId: string
  broadcaster: string
  viewerCount: number
}

interface HomeProps {
  username: string
  isLoggedIn: boolean
  onLogin: (username: string) => void
  activeStreams: Stream[]
}

const Home = ({ username, isLoggedIn, onLogin, activeStreams }: HomeProps) => {
  const [inputUsername, setInputUsername] = useState('')
  
  // Log when active streams change
  useEffect(() => {
    console.log('Home component received activeStreams:', activeStreams)
  }, [activeStreams])
  
  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputUsername.trim()) {
      onLogin(inputUsername.trim())
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Active Streams</h1>
          <Link
            to="/create"
            className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
          >
            Start Streaming
          </Link>
        </div>

        {activeStreams.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 mb-4">No active streams at the moment.</p>
            <p className="text-gray-600">
              Be the first to{' '}
              <Link to="/create" className="text-indigo-600 hover:underline">
                start streaming
              </Link>
              !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStreams.map((stream) => (
              <div key={stream.streamId} className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-2">{stream.broadcaster}'s Stream</h2>
                <p className="text-gray-600 mb-4">
                  {stream.viewerCount} {stream.viewerCount === 1 ? 'viewer' : 'viewers'}
                </p>
                <Link
                  to={`/view/${stream.streamId}`}
                  className="block text-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
                >
                  Watch Stream
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home 