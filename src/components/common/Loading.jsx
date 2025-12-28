// src/components/common/Loading.jsx
export default function Loading({ message = "Loading..." }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  );
}
