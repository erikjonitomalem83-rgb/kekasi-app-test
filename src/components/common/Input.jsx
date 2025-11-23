// components/common/Input.jsx
export default function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
  maxLength,
  pattern,
  autoUppercase = false,
  numbersOnly = false,
  ...props
}) {
  const handleChange = (e) => {
    let newValue = e.target.value;

    // Auto uppercase
    if (autoUppercase) {
      newValue = newValue.toUpperCase();
    }

    // Numbers only
    if (numbersOnly) {
      newValue = newValue.replace(/\D/g, "");
    }

    // Apply maxLength
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    onChange(newValue);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        pattern={pattern}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-kekasi-blue focus:border-transparent ${
          error ? "border-red-500" : "border-gray-300"
        } ${autoUppercase ? "uppercase" : ""}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
}
