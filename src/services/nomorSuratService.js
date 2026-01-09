import { supabase } from "./supabase";
import { getEffectiveWorkingDate, getLocalDateString, getLocalMonthString } from "../utils/dateHelpers";
import { getHolidays } from "./holidayService";

/**
 * ATOMIC BATCH ALLOCATION - PER TAHUN
 * Allocate nomor urut per tahun (reset setiap 1 Januari)
 */
async function allocateBatchNumbers(count, tahun = null) {
  const currentYear = tahun || new Date().getFullYear();

  console.log(`[allocateBatchNumbers] Requesting ${count} numbers for year ${currentYear}`);

  try {
    // Call PostgreSQL function untuk get nomor batch per tahun (ATOMIC operation)
    const { data, error } = await supabase.rpc("get_next_nomor_batch_yearly", {
      p_count: count,
      p_tahun: currentYear,
    });

    if (error) {
      console.error("[allocateBatchNumbers] Error:", error);
      throw error;
    }

    // Extract nomor_urut dari hasil
    const allocatedNumbers = data.map((row) => row.nomor_urut);

    console.log(
      `[allocateBatchNumbers] Requested: ${count}, Received: ${allocatedNumbers.length} for year ${currentYear}`
    );

    // Warning jika database function mengembalikan kurang dari yang diminta
    if (allocatedNumbers.length < count) {
      console.warn(
        `[allocateBatchNumbers] WARNING: Database only returned ${allocatedNumbers.length}/${count} numbers!`
      );
    }

    console.log(`[allocateBatchNumbers] Allocated numbers:`, allocatedNumbers.join(", "));

    return allocatedNumbers;
  } catch (error) {
    console.error("[allocateBatchNumbers] Fatal error:", error);
    throw error;
  }
}

/**
 * Ambil nomor yang bisa di-reuse (cancelled)
 */
export async function getCancelledNomor(jumlah, tahun = null) {
  try {
    const currentYear = tahun || new Date().getFullYear();
    console.log(`[getCancelledNomor] Mencari nomor cancelled untuk direuse (tahun: ${currentYear})`);

    const { data: adminPool, error: adminError } = await supabase
      .from("nomor_surat")
      .select("nomor_urut")
      .eq("tahun", currentYear)
      .eq("status", "reserved")
      .eq("keterangan", "ADMIN_EMERGENCY_POOL");

    if (adminError) throw adminError;

    const adminNomors = adminPool?.map((n) => n.nomor_urut) || [];

    const { data: allCancelled, error } = await supabase
      .from("nomor_surat")
      .select("*")
      .eq("tahun", currentYear)
      .eq("status", "cancelled")
      .order("nomor_urut", { ascending: true });

    if (error) throw error;

    const nonAdminCancelled = allCancelled?.filter((nomor) => nomor.keterangan !== "ADMIN_EMERGENCY_POOL") || [];
    const filteredCancelled = nonAdminCancelled.filter((nomor) => !adminNomors.includes(nomor.nomor_urut));
    const result = filteredCancelled.slice(0, jumlah);

    console.log(`[getCancelledNomor] Found ${result.length} cancelled nomor to reuse`);

    return result;
  } catch (error) {
    console.error("[getCancelledNomor] Error:", error);
    return [];
  }
}

/**
 * Auto-cancel nomor yang sudah expired
 */
export async function cleanExpiredNomor() {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("nomor_surat")
      .update({
        status: "cancelled",
        cancelled_at: now,
      })
      .eq("status", "reserved")
      .lt("expired_at", now)
      .select();

    if (error) throw error;

    console.log(`Auto-cancelled ${data?.length || 0} expired nomor`);
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error("Error clean expired nomor:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Pastikan admin pool bulan ini sudah ada (3 nomor acak)
 */
export async function ensureAdminPoolExists(kodeKanwil, kodeUPT, kodeMasalah, subMasalah1, subMasalah2) {
  try {
    const currentMonth = getLocalMonthString();
    const startOfMonth = `${currentMonth}-01`;
    const nextMonth = new Date(currentMonth + "-01");
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endOfMonth = nextMonth.toISOString().split("T")[0];

    const { data: existingPool, error: checkError } = await supabase
      .from("nomor_surat")
      .select("*")
      .eq("kode_kanwil", kodeKanwil)
      .eq("kode_upt", kodeUPT)
      .eq("kode_masalah", kodeMasalah)
      .eq("kode_submasalah1", subMasalah1)
      .eq("kode_submasalah2", subMasalah2)
      .gte("tanggal", startOfMonth)
      .lt("tanggal", endOfMonth)
      .eq("keterangan", "ADMIN_EMERGENCY_POOL");

    if (checkError) throw checkError;

    const poolCount = existingPool?.length || 0;

    if (poolCount >= 3) {
      return { success: true, needCreate: false, existing: existingPool };
    }

    const needCount = 3 - poolCount;

    return {
      success: true,
      needCreate: true,
      needCount: needCount,
      existing: existingPool,
    };
  } catch (error) {
    console.error("Error ensure admin pool:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sisihkan 1 nomor untuk admin pool
 */
export async function createAdminReservedNumber(kodeKanwil, kodeUPT, kodeMasalah, subMasalah1, subMasalah2, nomorUrut) {
  try {
    const today = getLocalDateString();
    const expiredAt = new Date();
    expiredAt.setFullYear(expiredAt.getFullYear() + 30);

    const cleanSubMasalah2 = (subMasalah2 || "").toString().trim();
    const nomorLengkap =
      cleanSubMasalah2 !== ""
        ? `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}.${cleanSubMasalah2}-${nomorUrut}`
        : `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}-${nomorUrut}`;

    const { data, error } = await supabase
      .from("nomor_surat")
      .insert({
        kode_kanwil: kodeKanwil,
        kode_upt: kodeUPT,
        kode_masalah: kodeMasalah,
        kode_submasalah1: subMasalah1,
        kode_submasalah2: subMasalah2,
        nomor_urut: nomorUrut,
        nomor_lengkap: nomorLengkap,
        tanggal: today,
        status: "reserved",
        user_id: null,
        reserved_at: new Date().toISOString(),
        expired_at: expiredAt.toISOString(),
        keterangan: "ADMIN_EMERGENCY_POOL",
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error create admin reserved number:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sisihkan beberapa nomor untuk admin pool
 */
export async function createMultipleAdminReservedNumbers(
  kodeKanwil,
  kodeUPT,
  kodeMasalah,
  subMasalah1,
  subMasalah2,
  count,
  baseNomor
) {
  try {
    const today = getLocalDateString();
    const expiredAt = new Date();
    expiredAt.setFullYear(expiredAt.getFullYear() + 30);

    const { data: cancelledData, error: cancelledError } = await supabase
      .from("nomor_surat")
      .select("*")
      .eq("kode_kanwil", kodeKanwil)
      .eq("kode_upt", kodeUPT)
      .eq("kode_masalah", kodeMasalah)
      .eq("kode_submasalah1", subMasalah1)
      .eq("kode_submasalah2", subMasalah2)
      .in("status", ["cancelled"])
      .order("nomor_urut", { ascending: true })
      .limit(count);

    if (cancelledError) throw cancelledError;

    const reuseNumbers = cancelledData || [];
    const reuseCount = reuseNumbers.length;
    const needNewCount = count - reuseCount;
    const newNumbers = [];

    if (needNewCount > 0) {
      const rangeSize = Math.min(Math.max(needNewCount * 10, 30), 100);
      const possibleNumbers = [];
      const segmentSize = Math.floor(rangeSize / needNewCount);

      for (let i = 0; i < needNewCount; i++) {
        const segmentStart = baseNomor + i * segmentSize + 1;
        const randomInSegment = Math.floor(Math.random() * segmentSize) + segmentStart;
        possibleNumbers.push(randomInSegment);
      }

      possibleNumbers.sort((a, b) => a - b);
      const selectedNew = possibleNumbers.slice(0, needNewCount);

      selectedNew.forEach((nomorUrut) => {
        const cleanSubMasalah2 = (subMasalah2 || "").toString().trim();
        const nomorLengkap =
          cleanSubMasalah2 !== ""
            ? `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}.${cleanSubMasalah2}-${nomorUrut}`
            : `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}-${nomorUrut}`;

        newNumbers.push({
          kode_kanwil: kodeKanwil,
          kode_upt: kodeUPT,
          kode_masalah: kodeMasalah,
          kode_submasalah1: subMasalah1,
          kode_submasalah2: subMasalah2,
          nomor_urut: nomorUrut,
          nomor_lengkap: nomorLengkap,
          tanggal: today,
          status: "reserved",
          user_id: null,
          reserved_at: new Date().toISOString(),
          expired_at: expiredAt.toISOString(),
          keterangan: "ADMIN_EMERGENCY_POOL",
        });
      });
    }

    if (reuseCount > 0) {
      const reuseIds = reuseNumbers.map((n) => n.id);

      const { error: updateError } = await supabase
        .from("nomor_surat")
        .update({
          status: "reserved",
          user_id: null,
          reserved_at: new Date().toISOString(),
          expired_at: expiredAt.toISOString(),
          keterangan: "ADMIN_EMERGENCY_POOL",
          cancelled_at: null,
        })
        .in("id", reuseIds);

      if (updateError) throw updateError;
    }

    if (newNumbers.length > 0) {
      const { error: insertError } = await supabase.from("nomor_surat").insert(newNumbers);
      if (insertError) throw insertError;
    }

    return {
      success: true,
      reuseCount,
      newCount: needNewCount,
    };
  } catch (error) {
    console.error("Error create multiple admin reserved numbers:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reserve nomor surat (mode berurutan) - DENGAN ADVISORY LOCK
 */
export async function reserveNomorBerurutan(userId, formData, jumlah) {
  try {
    const { kodeKanwil, kodeUPT, kodeMasalah, subMasalah1, subMasalah2 } = formData;

    // Ambil data hari libur untuk tahun ini DAN tahun sebelumnya
    // (karena di awal tahun baru, tanggal mungkin mundur ke tahun sebelumnya)
    const thisYear = new Date().getFullYear();
    const [holidayThisYear, holidayLastYear] = await Promise.all([getHolidays(thisYear), getHolidays(thisYear - 1)]);
    const holidayDates = [
      ...(holidayThisYear.success ? holidayThisYear.data.map((h) => h.tanggal) : []),
      ...(holidayLastYear.success ? holidayLastYear.data.map((h) => h.tanggal) : []),
    ];

    // Hitung tanggal kerja efektif (mundur jika weekend/libur)
    const today = getEffectiveWorkingDate(new Date(), holidayDates);

    // PENTING: Tahun diambil dari tanggal efektif, BUKAN dari new Date()
    // Ini memastikan konsistensi: jika tanggal = 31 Des 2025, maka tahun = 2025
    const currentYear = parseInt(today.substring(0, 4));

    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 5);

    // Clean expired nomor dengan error handling
    try {
      await cleanExpiredNomor();
    } catch (cleanError) {
      console.warn("[reserveNomorBerurutan] Clean expired error (non-critical):", cleanError);
    }

    console.log(`[reserveNomorBerurutan] User ${userId} request ${jumlah} nomor`);

    const resultData = [];

    // STEP 1: Ambil nomor cancelled untuk direuse
    const cancelledNomor = await getCancelledNomor(jumlah, currentYear);

    // STEP 2: Reuse nomor cancelled (OPTIMIZED dengan BATCH)
    if (cancelledNomor.length > 0) {
      console.log(`[reserveNomorBerurutan] Batch processing ${cancelledNomor.length} cancelled nomor...`);

      // Ambil IDs untuk batch delete
      const cancelledIds = cancelledNomor.map((n) => n.id);

      // BATCH DELETE semua sekaligus
      const { error: batchDeleteError } = await supabase.from("nomor_surat").delete().in("id", cancelledIds);

      if (batchDeleteError) {
        console.error(`[reserveNomorBerurutan] Batch delete error:`, batchDeleteError);
        // Jika batch delete gagal, fallback ke loop satu-per-satu
        console.log(`[reserveNomorBerurutan] Falling back to individual delete...`);

        for (const nomor of cancelledNomor) {
          try {
            const { error: deleteError } = await supabase.from("nomor_surat").delete().eq("id", nomor.id);

            if (!deleteError) {
              const cleanSubMasalah2 = (subMasalah2 || "").toString().trim();
              const nomorLengkap =
                cleanSubMasalah2 !== ""
                  ? `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}.${cleanSubMasalah2}-${nomor.nomor_urut}`
                  : `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}-${nomor.nomor_urut}`;

              const { data, error: insertError } = await supabase
                .from("nomor_surat")
                .insert({
                  kode_kanwil: kodeKanwil,
                  kode_upt: kodeUPT,
                  kode_masalah: kodeMasalah,
                  kode_submasalah1: subMasalah1,
                  kode_submasalah2: subMasalah2 || "",
                  nomor_urut: nomor.nomor_urut,
                  nomor_lengkap: nomorLengkap,
                  tanggal: today,
                  tahun: currentYear,
                  status: "reserved",
                  user_id: userId,
                  reserved_at: new Date().toISOString(),
                  expired_at: expiredAt.toISOString(),
                  keterangan: null,
                })
                .select()
                .single();

              if (!insertError) {
                resultData.push({ ...data, is_reused: true });
              }
            }
          } catch (err) {
            console.error(`[reserveNomorBerurutan] Error in fallback:`, err);
          }
        }
      } else {
        console.log(`[reserveNomorBerurutan] Batch deleted ${cancelledIds.length} cancelled nomor`);

        // BATCH INSERT semua sekaligus
        const batchInsertData = cancelledNomor.map((nomor) => {
          const cleanSubMasalah2 = (subMasalah2 || "").toString().trim();
          const nomorLengkap =
            cleanSubMasalah2 !== ""
              ? `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}.${cleanSubMasalah2}-${nomor.nomor_urut}`
              : `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}-${nomor.nomor_urut}`;
          return {
            kode_kanwil: kodeKanwil,
            kode_upt: kodeUPT,
            kode_masalah: kodeMasalah,
            kode_submasalah1: subMasalah1,
            kode_submasalah2: subMasalah2 || "",
            nomor_urut: nomor.nomor_urut,
            nomor_lengkap: nomorLengkap,
            tanggal: today,
            tahun: currentYear,
            status: "reserved",
            user_id: userId,
            reserved_at: new Date().toISOString(),
            expired_at: expiredAt.toISOString(),
            keterangan: null,
          };
        });

        const { data: batchInsertResult, error: batchInsertError } = await supabase
          .from("nomor_surat")
          .insert(batchInsertData)
          .select();

        if (batchInsertError) {
          console.error(`[reserveNomorBerurutan] Batch insert error:`, batchInsertError);
        } else {
          // Tandai sebagai reused
          const markedAsReused = batchInsertResult.map((n) => ({ ...n, is_reused: true }));
          resultData.push(...markedAsReused);
          console.log(`[reserveNomorBerurutan] Batch reused ${batchInsertResult.length} nomor successfully`);
        }
      }
    }

    // STEP 3: Kalau kurang, allocate nomor baru DENGAN LOCK
    const actualReused = resultData.length;
    const sisaYangDibutuhkan = jumlah - actualReused;

    console.log(`[reserveNomorBerurutan] Reused: ${actualReused}, Need new: ${sisaYangDibutuhkan}`);

    if (sisaYangDibutuhkan > 0) {
      // Sync sequence dulu sebelum allocate untuk memastikan tidak ada conflict
      await syncNomorSequence(currentYear);

      // ATOMIC ALLOCATION dengan advisory lock - pass currentYear untuk konsistensi
      const allocatedNumbers = await allocateBatchNumbers(sisaYangDibutuhkan, currentYear);

      console.log(`[reserveNomorBerurutan] Allocated numbers:`, allocatedNumbers);

      // Insert semua nomor yang sudah diallocate
      // BATCH INSERT: Insert semua nomor sekaligus (bukan satu-per-satu)
      if (allocatedNumbers.length > 0) {
        console.log(`[reserveNomorBerurutan] Batch inserting ${allocatedNumbers.length} numbers...`);

        const batchInsertData = allocatedNumbers.map((nomorUrut) => {
          const cleanSubMasalah2 = (subMasalah2 || "").toString().trim();
          const nomorLengkap =
            cleanSubMasalah2 !== ""
              ? `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}.${cleanSubMasalah2}-${nomorUrut}`
              : `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}-${nomorUrut}`;

          return {
            kode_kanwil: kodeKanwil,
            kode_upt: kodeUPT,
            kode_masalah: kodeMasalah,
            kode_submasalah1: subMasalah1,
            kode_submasalah2: subMasalah2 || "",
            nomor_urut: nomorUrut,
            nomor_lengkap: nomorLengkap,
            tanggal: today,
            tahun: currentYear,
            status: "reserved",
            user_id: userId,
            reserved_at: new Date().toISOString(),
            expired_at: expiredAt.toISOString(),
            keterangan: null,
          };
        });

        const { data: batchData, error: batchError } = await supabase
          .from("nomor_surat")
          .insert(batchInsertData)
          .select();

        if (batchError) {
          console.error(`[reserveNomorBerurutan] Batch insert error:`, batchError);
          throw batchError;
        }

        resultData.push(...batchData);
        console.log(`[reserveNomorBerurutan] Successfully batch inserted ${batchData.length} numbers`);
      }
    }

    console.log(`[reserveNomorBerurutan] FINAL: User ${userId} got ${resultData.length}/${jumlah} nomor`);

    // PENTING: Jika tidak dapat semua yang diminta, beri tahu UI
    if (resultData.length < jumlah) {
      console.warn(`[reserveNomorBerurutan] Partial allocation: ${resultData.length}/${jumlah}`);

      return {
        success: false,
        error: "PARTIAL_SUCCESS",
        message: `Sistem hanya berhasil memesan ${resultData.length} dari ${jumlah} nomor yang diminta.`,
        data: resultData,
        availableCount: resultData.length,
        requestedCount: jumlah,
      };
    }

    return {
      success: true,
      data: resultData,
    };
  } catch (error) {
    console.error("[reserveNomorBerurutan] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reserve nomor surat (mode acak) - DENGAN ADVISORY LOCK
 */
export async function reserveNomorAcak(userId, formData, jumlah) {
  try {
    const { kodeKanwil, kodeUPT, kodeMasalah, subMasalah1, subMasalah2 } = formData;

    // Ambil data hari libur untuk tahun ini DAN tahun sebelumnya
    // (karena di awal tahun baru, tanggal mungkin mundur ke tahun sebelumnya)
    const thisYear = new Date().getFullYear();
    const [holidayThisYear, holidayLastYear] = await Promise.all([getHolidays(thisYear), getHolidays(thisYear - 1)]);
    const holidayDates = [
      ...(holidayThisYear.success ? holidayThisYear.data.map((h) => h.tanggal) : []),
      ...(holidayLastYear.success ? holidayLastYear.data.map((h) => h.tanggal) : []),
    ];

    // Hitung tanggal kerja efektif (mundur jika weekend/libur)
    const today = getEffectiveWorkingDate(new Date(), holidayDates);

    // PENTING: Tahun diambil dari tanggal efektif, BUKAN dari new Date()
    // Ini memastikan konsistensi: jika tanggal = 31 Des 2025, maka tahun = 2025
    const currentYear = parseInt(today.substring(0, 4));

    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 5);

    // Clean expired nomor dengan error handling
    try {
      await cleanExpiredNomor();
    } catch (cleanError) {
      console.warn("[reserveNomorAcak] Clean expired error (non-critical):", cleanError);
    }

    console.log(`[reserveNomorAcak] User ${userId} request ${jumlah} nomor (mode acak)`);

    const cancelledNomor = await getCancelledNomor(100, currentYear);
    const shuffled = cancelledNomor.sort(() => Math.random() - 0.5);
    const nomorToReuse = shuffled.slice(0, jumlah);

    const resultData = [];

    if (nomorToReuse.length > 0) {
      for (const nomor of nomorToReuse) {
        try {
          const { error: deleteError } = await supabase.from("nomor_surat").delete().eq("id", nomor.id);

          if (deleteError) {
            console.log(`[reserveNomorAcak] Skip nomor ${nomor.nomor_urut}`);
            continue;
          }

          const cleanSubMasalah2 = (subMasalah2 || "").toString().trim();
          const nomorLengkap =
            cleanSubMasalah2 !== ""
              ? `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}.${cleanSubMasalah2}-${nomor.nomor_urut}`
              : `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}-${nomor.nomor_urut}`;

          const { data, error } = await supabase
            .from("nomor_surat")
            .insert({
              kode_kanwil: kodeKanwil,
              kode_upt: kodeUPT,
              kode_masalah: kodeMasalah,
              kode_submasalah1: subMasalah1,
              kode_submasalah2: subMasalah2 || "",
              nomor_urut: nomor.nomor_urut,
              nomor_lengkap: nomorLengkap,
              tanggal: today,
              tahun: currentYear,
              status: "reserved",
              user_id: userId,
              reserved_at: new Date().toISOString(),
              expired_at: expiredAt.toISOString(),
              keterangan: null,
            })
            .select()
            .single();

          if (error && error.code !== "23505") throw error;

          if (!error) {
            resultData.push({ ...data, is_reused: true });
            console.log(`[reserveNomorAcak] Reused nomor ${nomor.nomor_urut}`);
          }
        } catch (err) {
          console.error(`[reserveNomorAcak] Error reusing:`, err);
        }
      }
    }

    const actualReused = resultData.length;
    const sisaYangDibutuhkan = jumlah - actualReused;

    console.log(`[reserveNomorAcak] Reused: ${actualReused}, Need new: ${sisaYangDibutuhkan}`);

    if (sisaYangDibutuhkan > 0) {
      // Sync sequence dulu sebelum allocate untuk memastikan tidak ada conflict
      await syncNomorSequence(currentYear);

      // ATOMIC ALLOCATION dengan advisory lock - pass currentYear untuk konsistensi
      const allocatedNumbers = await allocateBatchNumbers(sisaYangDibutuhkan, currentYear);

      // Acak urutan nomor untuk mode acak
      const shuffledAllocated = allocatedNumbers.sort(() => Math.random() - 0.5);

      for (const nomorUrut of shuffledAllocated) {
        try {
          const cleanSubMasalah2 = (subMasalah2 || "").toString().trim();
          const nomorLengkap =
            cleanSubMasalah2 !== ""
              ? `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}.${cleanSubMasalah2}-${nomorUrut}`
              : `${kodeKanwil}.${kodeUPT}-${kodeMasalah}.${subMasalah1}-${nomorUrut}`;

          const { data, error } = await supabase
            .from("nomor_surat")
            .insert({
              kode_kanwil: kodeKanwil,
              kode_upt: kodeUPT,
              kode_masalah: kodeMasalah,
              kode_submasalah1: subMasalah1,
              kode_submasalah2: subMasalah2 || "",
              nomor_urut: nomorUrut,
              nomor_lengkap: nomorLengkap,
              tanggal: today,
              status: "reserved",
              user_id: userId,
              reserved_at: new Date().toISOString(),
              expired_at: expiredAt.toISOString(),
              keterangan: null,
            })
            .select()
            .single();

          if (error) {
            console.error(`[reserveNomorAcak] Error inserting ${nomorUrut}:`, error);
            continue;
          }

          resultData.push(data);
          console.log(`[reserveNomorAcak] Inserted nomor ${nomorUrut}`);
        } catch (err) {
          console.error(`[reserveNomorAcak] Error:`, err);
        }
      }
    }

    console.log(`[reserveNomorAcak] FINAL: User ${userId} got ${resultData.length}/${jumlah} nomor`);

    // PENTING: Jika tidak dapat semua yang diminta, beri tahu UI
    if (resultData.length < jumlah) {
      console.warn(`[reserveNomorAcak] Partial allocation: ${resultData.length}/${jumlah}`);

      return {
        success: false,
        error: "PARTIAL_SUCCESS",
        message: `Sistem hanya berhasil memesan ${resultData.length} dari ${jumlah} nomor yang diminta.`,
        data: resultData,
        availableCount: resultData.length,
        requestedCount: jumlah,
      };
    }

    return {
      success: true,
      data: resultData,
    };
  } catch (error) {
    console.error("[reserveNomorAcak] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Konfirmasi nomor surat
 */
export async function confirmNomorSurat(nomorId, updateData) {
  try {
    const { data, error } = await supabase
      .from("nomor_surat")
      .update({
        status: "confirmed",
        ...updateData,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", nomorId)
      .select();

    if (error) throw error;

    await supabase.from("history_log").insert({
      nomor_id: nomorId,
      user_id: data[0].user_id,
      action: "confirm",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: data[0],
    };
  } catch (error) {
    console.error("Error confirm nomor:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Batalkan nomor surat
 */
export async function cancelNomorSurat(nomorId, userId) {
  try {
    const { error } = await supabase
      .from("nomor_surat")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        keterangan: null,
      })
      .eq("id", nomorId)
      .select();

    if (error) throw error;

    await supabase.from("history_log").insert({
      nomor_id: nomorId,
      user_id: userId,
      action: "cancel",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error cancel nomor:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sync sequence dengan database per tahun (dipanggil saat app start)
 * Mencegah nomor loncat setelah database dibersihkan
 */
export async function syncNomorSequence(tahun = null) {
  try {
    // Gunakan tahun yang diberikan atau fallback ke tahun saat ini
    const currentYear = tahun || new Date().getFullYear();
    console.log(`[syncNomorSequence] Syncing sequence for year ${currentYear}...`);

    // Tambahkan delay kecil untuk menghindari race condition
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { error } = await supabase.rpc("reset_nomor_sequence_yearly", {
      p_tahun: currentYear,
    });

    if (error) {
      console.error("[syncNomorSequence] Error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[syncNomorSequence] Sequence for year ${currentYear} synced successfully`);
    return { success: true };
  } catch (error) {
    console.error("[syncNomorSequence] Fatal error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update keterangan nomor surat yang sudah dikonfirmasi
 */
export async function updateKeteranganNomor(nomorId, keteranganBaru) {
  try {
    // Validasi
    if (!keteranganBaru || keteranganBaru.trim() === "") {
      return {
        success: false,
        error: "Keterangan tidak boleh kosong",
      };
    }

    // Update keterangan
    const { data, error } = await supabase
      .from("nomor_surat")
      .update({
        keterangan: keteranganBaru.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", nomorId)
      .eq("status", "confirmed") // Hanya bisa update yang sudah confirmed
      .select()
      .single();

    if (error) throw error;

    // Log ke history
    await supabase.from("history_log").insert({
      nomor_id: nomorId,
      user_id: data.user_id,
      action: "update_keterangan",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Error update keterangan:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update data nomor surat lengkap (kecuali nomor_urut)
 */
export async function updateNomorSuratData(nomorId, updateData) {
  try {
    // Validasi
    if (!updateData.kodeKanwil || updateData.kodeKanwil.trim() === "") {
      return {
        success: false,
        error: "Kode Kanwil tidak boleh kosong",
      };
    }

    if (!updateData.kodeUPT || updateData.kodeUPT.trim() === "") {
      return {
        success: false,
        error: "Kode UPT tidak boleh kosong",
      };
    }

    if (!updateData.kodeMasalah || updateData.kodeMasalah.trim() === "") {
      return {
        success: false,
        error: "Kode Masalah tidak boleh kosong",
      };
    }

    if (updateData.kodeMasalah.length !== 2) {
      return {
        success: false,
        error: "Kode Masalah harus 2 huruf",
      };
    }

    if (!updateData.subMasalah1 || updateData.subMasalah1.trim() === "") {
      return {
        success: false,
        error: "Sub Masalah 1 tidak boleh kosong",
      };
    }

    if (updateData.subMasalah1.length !== 2) {
      return {
        success: false,
        error: "Sub Masalah 1 harus 2 digit angka",
      };
    }

    if (updateData.subMasalah2 && updateData.subMasalah2.trim() !== "" && updateData.subMasalah2.length !== 2) {
      return {
        success: false,
        error: "Sub Masalah 2 harus 2 digit angka atau kosong",
      };
    }

    if (!updateData.keterangan || updateData.keterangan.trim() === "") {
      return {
        success: false,
        error: "Keterangan tidak boleh kosong",
      };
    }

    // Get nomor_urut dari database (tidak boleh diubah)
    const { data: existingData, error: fetchError } = await supabase
      .from("nomor_surat")
      .select("nomor_urut")
      .eq("id", nomorId)
      .eq("status", "confirmed")
      .single();

    if (fetchError) throw fetchError;

    if (!existingData) {
      return {
        success: false,
        error: "Nomor surat tidak ditemukan atau belum dikonfirmasi",
      };
    }

    const nomorUrut = existingData.nomor_urut;

    // Generate nomor_lengkap baru
    const cleanSubMasalah2 = (updateData.subMasalah2 || "").toString().trim();
    const nomorLengkap =
      cleanSubMasalah2 !== ""
        ? `${updateData.kodeKanwil}.${updateData.kodeUPT}-${updateData.kodeMasalah}.${updateData.subMasalah1}.${cleanSubMasalah2}-${nomorUrut}`
        : `${updateData.kodeKanwil}.${updateData.kodeUPT}-${updateData.kodeMasalah}.${updateData.subMasalah1}-${nomorUrut}`;

    // Update data
    const { data, error } = await supabase
      .from("nomor_surat")
      .update({
        kode_kanwil: updateData.kodeKanwil.trim(),
        kode_upt: updateData.kodeUPT.trim(),
        kode_masalah: updateData.kodeMasalah.trim().toUpperCase(),
        kode_submasalah1: updateData.subMasalah1.trim(),
        kode_submasalah2: cleanSubMasalah2,
        keterangan: updateData.keterangan.trim(),
        nomor_lengkap: nomorLengkap,
        updated_at: new Date().toISOString(),
      })
      .eq("id", nomorId)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error) throw error;

    // Log ke history
    await supabase.from("history_log").insert({
      nomor_id: nomorId,
      user_id: data.user_id,
      action: "update_nomor_data",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Error update nomor surat data:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reserve nomor lama (dari tahun sebelumnya)
 * Dipanggil dari NomorLamaModal
 */
export async function reserveNomorLama(userId, selectedNomor, keterangan) {
  try {
    console.log(`[reserveNomorLama] User ${userId} reserving ${selectedNomor.length} old numbers`);

    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 5);

    const resultData = [];

    // Process setiap nomor yang dipilih
    for (const nomor of selectedNomor) {
      try {
        // 1. Delete nomor cancelled lama
        const { error: deleteError } = await supabase.from("nomor_surat").delete().eq("id", nomor.id);

        if (deleteError) {
          console.error(`[reserveNomorLama] Failed to delete nomor ${nomor.nomor_urut}:`, deleteError);
          continue;
        }

        // 2. PENTING: Pertahankan tanggal & tahun ASLI nomor lama
        const originalTanggal = nomor.tanggal; // Tanggal asli (misal: 2024-02-02)
        const originalTahun = nomor.tahun; // Tahun asli (misal: 2024)
        const originalBulan = nomor.bulan; // Bulan asli (misal: 2)

        console.log(
          `[reserveNomorLama] Preserving original date: ${originalTanggal} (tahun: ${originalTahun}, bulan: ${originalBulan})`
        );

        // 3. Insert ulang dengan status reserved (PERTAHANKAN TANGGAL ASLI)
        const { data, error: insertError } = await supabase
          .from("nomor_surat")
          .insert({
            kode_kanwil: nomor.kode_kanwil,
            kode_upt: nomor.kode_upt,
            kode_masalah: nomor.kode_masalah,
            kode_submasalah1: nomor.kode_submasalah1,
            kode_submasalah2: nomor.kode_submasalah2 || "",
            nomor_urut: nomor.nomor_urut,
            nomor_lengkap: nomor.nomor_lengkap,
            tanggal: originalTanggal, // ✅ PERTAHANKAN tanggal asli
            tahun: originalTahun, // ✅ PERTAHANKAN tahun asli
            bulan: originalBulan, // ✅ PERTAHANKAN bulan asli
            status: "reserved",
            user_id: userId,
            reserved_at: new Date().toISOString(), // Timestamp sekarang untuk tracking
            expired_at: expiredAt.toISOString(), // 5 menit dari sekarang
            keterangan: keterangan,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[reserveNomorLama] Failed to insert nomor ${nomor.nomor_urut}:`, insertError);
          continue;
        }

        resultData.push(data);
        console.log(
          `[reserveNomorLama] Successfully reserved old nomor ${nomor.nomor_urut} with original date ${originalTanggal}`
        );
      } catch (err) {
        console.error(`[reserveNomorLama] Error processing nomor ${nomor.nomor_urut}:`, err);
      }
    }

    console.log(`[reserveNomorLama] FINAL: User ${userId} got ${resultData.length}/${selectedNomor.length} old nomor`);

    return {
      success: true,
      data: resultData,
    };
  } catch (error) {
    console.error("[reserveNomorLama] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete nomor surat yang sudah dikonfirmasi dan kembalikan ke pool
 * (hanya superadmin dan admin yang bisa)
 */
export async function deleteNomorSurat(nomorId, userId) {
  try {
    // Update status jadi cancelled agar bisa direuse
    const { data, error } = await supabase
      .from("nomor_surat")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        keterangan: null,
      })
      .eq("id", nomorId)
      .eq("status", "confirmed")
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return {
        success: false,
        error: "Nomor tidak ditemukan atau sudah dihapus",
      };
    }

    // Log ke history
    await supabase.from("history_log").insert({
      nomor_id: nomorId,
      user_id: userId,
      action: "return_to_pool",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Error delete nomor surat:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
