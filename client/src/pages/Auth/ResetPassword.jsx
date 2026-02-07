import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPasswordAPI } from '../../services/authService';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract query params: ?token=...&id=...
  const token = searchParams.get('token');
  const userId = searchParams.get('id');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
        return setError("Passwords do not match");
    }

    setLoading(true);

    try {
      await resetPasswordAPI(userId, token, password);
      setMessage("Password reset successfully! Redirecting to login...");
      
      // Delay redirect so user can read message
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Something went wrong.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Guard clause if URL is malformed
  if (!token || !userId) {
      return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded text-red-500 font-bold">
                Invalid or Missing Reset Link
            </div>
        </div>
      );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>
        
        {message && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded text-sm">{message}</div>}
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded text-sm">{error}</div>}

        {!message && ( // Hide form if success message is showing
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">New Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="New password"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Confirm Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;