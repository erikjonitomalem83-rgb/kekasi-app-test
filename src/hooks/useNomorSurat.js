import { useState } from "react";
import useNomorSurat from "../hooks/useNomorSurat"; // Import custom hook
import Loading from "../components/common/Loading";

function AmbilNomor() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Gunakan custom hook
  const { reserveNomor } = useNomorSurat();

  const handleReserve = async () => {
    setLoading(true);
    setLoadingMessage("Mengambil nomor surat... Mohon tunggu...");

    try {
      // Call function dari custom hook
      const result = await reserveNomor();

      setLoading(false);

      if (result.success) {
        alert(`Berhasil! Anda mendapat ${result.data.length} nomor`);
      } else {
        alert(`Gagal: ${result.error}`);
      }
    } catch (error) {
      setLoading(false);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      {loading && <Loading message={loadingMessage} />}
      <button onClick={handleReserve} disabled={loading}>
        Reserve Nomor
      </button>
    </div>
  );
}

export default AmbilNomor;
