// components/common/Button.jsx
// Contoh: Button reusable dengan theme biru-kuning

export default function Button({
  children,
  variant = "primary", // 'primary' | 'secondary' | 'danger'
  onClick,
  disabled,
  ...props
}) {
  const styles = {
    primary: "bg-[#efbc62] hover:bg-[#d9a851] text-[#00325f]",
    secondary: "bg-[#00325f] hover:bg-[#002447] text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  };

  return (
    <button
      className={`px-4 py-2 rounded-lg font-semibold transition ${styles[variant]}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
