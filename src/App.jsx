import { useState, useEffect } from "react";
import { testConnection } from "./services/supabase";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [dbStatus, setDbStatus] = useState("checking");
  const [dbData, setDbData] = useState(null);

  useEffect(() => {
    // Test database connection on mount
    const checkDB = async () => {
      const result = await testConnection();
      setDbStatus(result.success ? "connected" : "error");
      setDbData(result);
    };
    checkDB();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-2xl w-full">
        <h1 className="text-gradient mb-2">🎯 KEKASI</h1>
        <h2 className="text-lg mb-6">Kode Klasifikasi Arsip Imigrasi Siantar</h2>

        {/* Database Status */}
        <div
          className={`p-4 rounded-lg mb-6 ${
            dbStatus === "connected" ? "bg-green-100" : dbStatus === "error" ? "bg-red-100" : "bg-yellow-100"
          }`}>
          <p className="font-semibold mb-2">
            {dbStatus === "checking" && "⏳ Checking database connection..."}
            {dbStatus === "connected" && "✅ Database connected successfully!"}
            {dbStatus === "error" && "❌ Database connection failed"}
          </p>

          {dbStatus === "connected" && dbData?.data && (
            <details className="text-sm text-gray-700">
              <summary className="cursor-pointer">View settings data</summary>
              <pre className="mt-2 p-2 bg-white rounded overflow-auto">{JSON.stringify(dbData.data, null, 2)}</pre>
            </details>
          )}

          {dbStatus === "error" && dbData?.error && <p className="text-sm text-red-700 mt-2">Error: {dbData.error}</p>}
        </div>

        {/* Counter Test */}
        <div className="space-y-4">
          <p className="text-gray-600">
            Setup selesai! Counter test: <strong>{count}</strong>
          </p>

          <div className="flex gap-2 justify-center">
            <button className="btn-primary" onClick={() => setCount(count + 1)}>
              Tambah
            </button>
            <button className="btn-secondary" onClick={() => setCount(0)}>
              Reset
            </button>
          </div>

          <div className="mt-6 space-y-2">
            <div className="badge-reserved inline-block">Reserved</div>
            <div className="badge-confirmed inline-block mx-2">Confirmed</div>
            <div className="badge-cancelled inline-block">Cancelled</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
