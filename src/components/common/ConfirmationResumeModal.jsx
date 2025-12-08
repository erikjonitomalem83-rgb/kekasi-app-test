import { useState } from "react";

export default function ConfirmationResumeModal({ isOpen, onClose, confirmedNumbers }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [allCopied, setAllCopied] = useState(false);

  if (!isOpen || !confirmedNumbers || confirmedNumbers.length === 0) return null;

  // Format nomor surat lengkap
  // Format: {Kode Kanwil}.{Kode UPT}-{Kode Masalah}.{Sub Masalah 1}.{Sub Masalah 2}-{NomorUrut}
  // Contoh: WIM.2.IMI.4-UM.01.01-1234
  const formatNomorLengkap = (nomor) => {
    const nomorUrut = String(nomor.nomor_urut);

    // Build kode masalah dengan sub masalah
    // Database columns: kode_submasalah1, kode_submasalah2
    let kodeMasalahFull = nomor.kode_masalah;
    if (nomor.kode_submasalah1) kodeMasalahFull += `.${nomor.kode_submasalah1}`;
    if (nomor.kode_submasalah2) kodeMasalahFull += `.${nomor.kode_submasalah2}`;

    // Format: KodeKanwil.KodeUPT-KodeMasalah-NomorUrut
    return `${nomor.kode_kanwil}.${nomor.kode_upt}-${kodeMasalahFull}-${nomorUrut}`;
  };

  // Copy single nomor
  const handleCopySingle = async (nomor, index) => {
    try {
      const nomorLengkap = formatNomorLengkap(nomor);
      await navigator.clipboard.writeText(nomorLengkap);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Copy all nomor
  const handleCopyAll = async () => {
    try {
      const allNomor = confirmedNumbers
        .map((nomor, idx) => {
          const nomorLengkap = formatNomorLengkap(nomor);
          return `${idx + 1}. ${nomorLengkap} - ${nomor.keterangan || "-"}`;
        })
        .join("\n");

      await navigator.clipboard.writeText(allNomor);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy all:", err);
    }
  };

  // Print resume
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resume Konfirmasi Nomor Surat</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            color: #16a34a;
            font-size: 18px;
            margin-bottom: 20px;
          }
          .info {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #16a34a;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f0fdf4;
          }
          .nomor-col {
            font-family: 'Consolas', monospace;
            font-weight: 600;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>RESUME KONFIRMASI NOMOR SURAT</h1>
        <p class="info">Hari/Tanggal: ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">No</th>
              <th style="text-align: center;">Nomor Surat</th>
              <th style="text-align: center;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${confirmedNumbers
              .map(
                (nomor, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td class="nomor-col">${formatNomorLengkap(nomor)}</td>
                <td>${nomor.keterangan || "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Format tanggal
  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">✓ Konfirmasi Berhasil!</h2>
              <p className="text-green-100 text-sm mt-1">{confirmedNumbers.length} nomor surat berhasil dikonfirmasi</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body - Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Tanggal Info */}
          <p className="text-center text-gray-500 text-sm mb-4">Hari/Tanggal: {formattedDate}</p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-green-600 text-white px-4 py-3 font-semibold text-sm w-16 text-center rounded-tl-lg">
                    No
                  </th>
                  <th className="bg-green-600 text-white text-center px-4 py-3 font-semibold text-sm">Nomor Surat</th>
                  <th className="bg-green-600 text-white text-center px-4 py-3 font-semibold text-sm rounded-tr-lg">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody>
                {confirmedNumbers.map((nomor, index) => (
                  <tr
                    key={nomor.id || index}
                    className={`border-b border-gray-200 hover:bg-green-50 transition ${
                      index % 2 === 1 ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-gray-900 text-sm">
                          {formatNomorLengkap(nomor)}
                        </span>
                        <button
                          onClick={() => handleCopySingle(nomor, index)}
                          className={`flex-shrink-0 p-1.5 rounded transition ${
                            copiedIndex === index
                              ? "bg-green-100 text-green-700"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          }`}
                          title="Salin nomor surat"
                        >
                          {copiedIndex === index ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm text-left">{nomor.keterangan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex flex-wrap gap-3 justify-end flex-shrink-0 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleCopyAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              allCopied
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {allCopied ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tersalin!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Semua
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
