import { Link } from 'react-router-dom'

interface NavbarProps {
  username: string
  isLoggedIn: boolean
  onLogout: () => void
}

const Navbar = ({ username, isLoggedIn, onLogout }: NavbarProps) => {
  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">LiveStream</Link>
        
        <div className="flex items-center space-x-4">
          {isLoggedIn && (
            <>
              <Link to="/create" className="hover:text-indigo-200 transition">
                Create Stream
              </Link>
              <span className="text-indigo-200">
                Welcome, {username}
              </span>
              <button 
                onClick={onLogout}
                className="bg-indigo-700 hover:bg-indigo-800 px-3 py-1 rounded transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar 