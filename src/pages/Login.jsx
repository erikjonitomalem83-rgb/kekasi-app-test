import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import { useNotification } from "../components/common/Notification";
import ForgotPasswordModal from "../components/common/ForgotPasswordModal";
import { detectBrowser, getBrowserMessage } from "../utils/browserDetection";
import LogoKekasi from "../assets/images/Logo_KEKASI.svg";

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setProfile, setError } = useAuthStore();

  const notification = useNotification();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMsg(""); // Clear error saat user ketik
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const result = await login(formData.username, formData.password);

    if (result.success) {
      setUser(result.user);
      setProfile(result.profile);
      navigate("/dashboard");
    } else {
      setErrorMsg(result.error);
      setError(result.error);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    const browser = detectBrowser();
    if (browser.blocked) {
      const message = getBrowserMessage();

      // Show blocking alert
      alert(`⛔ ${message.title}\n\n${message.message}\n\nAnda akan diarahkan ke halaman download Chrome.`);

      // Redirect to Chrome download
      window.location.href = "https://www.google.com/chrome/";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="card max-w-md w-full shadow-kekasi">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-1">
            <img src={LogoKekasi} alt="Logo KEKASI" className="h-14 w-auto" />
          </div>
          <p className="text-gray-600 font-semibold tracking-tighter">Kantor Imigrasi Kelas II TPI Pematang Siantar</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 animate-fade-in">
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kekasi-blue focus:border-transparent"
              placeholder="Masukkan username"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Password</label>
            <div className="relative mb-5">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kekasi-blue focus:border-transparent"
                placeholder="Masukkan password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="w-full btn-primary py-3 text-lg" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="spinner mr-2"></span>
                Login...
              </span>
            ) : (
              "Login"
            )}
          </button>

          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition"
              disabled={isLoading}
            >
              Lupa Password?
            </button>
          </div>
        </form>
      </div>
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        notification={notification}
      />
    </div>
  );
}
