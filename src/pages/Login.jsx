import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import { useNotification } from "../components/common/Notification";
import ForgotPasswordModal from "../components/common/ForgotPasswordModal";
import LogoKekasi from "../assets/images/Logo_KEKASI.svg";
import { Eye, EyeOff, Lock, User } from "lucide-react";

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-kekasi-blue-600 via-kekasi-blue-500 to-kekasi-blue-400 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-kekasi-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-kekasi-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-5"></div>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8 sm:p-12 mx-4 max-w-[440px] w-full relative z-10 animate-slide-up border border-white">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-0">
            <img src={LogoKekasi} alt="Logo KEKASI" className="h-14 sm:h-16 w-auto" />
          </div>

          {/* <p className="text-sm text-gray-600 font-medium">Kantor Imigrasi Kelas II TPI Pematang Siantar</p> */}
          <div className="mt-4 h-1.5 w-16 bg-gradient-to-r from-kekasi-yellow-500 to-kekasi-yellow-400 rounded-full mx-auto"></div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-error-50 border-2 border-error-200 text-error-700 px-4 py-3 rounded-2xl mb-6 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field */}
          <div>
            <label className="input-label flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-kekasi-blue-500" />
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field !normal-case bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-kekasi-blue-500 transition-all duration-200 py-3.5 rounded-2xl shadow-sm"
                placeholder="Masukkan username"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="input-label flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-kekasi-blue-500" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field !normal-case pr-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-kekasi-blue-500 transition-all duration-200 py-3.5 rounded-2xl shadow-sm"
                placeholder="Masukkan password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-kekasi-blue-500 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full btn-primary py-4 text-base font-bold shadow-kekasi-glow rounded-xl hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner-small"></span>
                Memproses...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                Login
              </span>
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-kekasi-blue-600 hover:text-kekasi-blue-700 font-semibold transition-colors hover:underline"
              disabled={isLoading}
            >
              Lupa Password?
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-center text-gray-500">© 2026 Kantor Imigrasi Kelas II TPI Pematang Siantar</p>
        </div>
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
