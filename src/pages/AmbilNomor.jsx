import { useState } from "react";
import { reserveNomorBerurutan } from "../services/nomorSuratService";
import Loading from "../components/common/Loading";

function AmbilNomor() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // State untuk form
  const [formData, setFormData] = useState({
    kodeKanwil: "",
    kodeUPT: "",
    kodeMasalah: "",
    subMasalah1: "",
    subMasalah2: "",
  });
  const [jumlah, setJumlah] = useState(1);

  const handleReserve = async () => {
    // Ambil userId dari auth (contoh)
    const userId = localStorage.getItem("userId"); // atau dari useAuth()

    // Validasi
    if (!userId) {
      alert("Anda belum login!");
      return;
    }

    if (!formData.kodeKanwil || !formData.kodeUPT) {
      alert("Lengkapi form terlebih dahulu!");
      return;
    }

    // Tampilkan loading
    setLoading(true);
    setLoadingMessage("Mengambil nomor surat... Mohon tunggu...");

    try {
      const result = await reserveNomorBerurutan(userId, formData, jumlah);

      setLoading(false);

      if (result.success) {
        alert(`Berhasil! Anda mendapat ${result.data.length} nomor`);
        // Reset form atau redirect
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

      {/* Form Input */}
      <input
        type="text"
        placeholder="Kode Kanwil"
        value={formData.kodeKanwil}
        onChange={(e) => setFormData({ ...formData, kodeKanwil: e.target.value })}
      />

      <input
        type="number"
        placeholder="Jumlah Nomor"
        value={jumlah}
        onChange={(e) => setJumlah(parseInt(e.target.value))}
      />

      <button onClick={handleReserve} disabled={loading}>
        Reserve Nomor
      </button>
    </div>
  );
}

export default AmbilNomor;
