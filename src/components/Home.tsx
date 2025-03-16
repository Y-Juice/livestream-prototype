import { useState } from 'react'
import { Link } from 'react-router-dom'

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputUsername.trim()) {
      onLogin(inputUsername.trim())
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {!isLoggedIn ? (
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Welcome to LiveStream</h1>
          <p className="text-gray-600 mb-6 text-center">
            Enter your username to start streaming or watch streams
          </p>
          
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="mb-4">
              <label htmlFor="username" className="block text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your username"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
            >
              Join
            </button>
          </form>
        </div>
      ) : (
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
      )}
    </div>
  )
}

export default Home 