import { useState } from "react";
import { supabase } from "../services/supabaseClient.js";
import {
  assignTask as assignTaskService,
  createTaskAttachment as createTaskAttachmentService,
  deleteTaskAttachment as deleteTaskAttachmentService,
} from "../services/taskService.js";
import { allowedAttachmentTypes } from "../constants/taskConstants.js";
import { getErrorMessage } from "../utils/errorMessage.js";

// Supabase Storage menolak key dengan karakter non-ASCII dan beberapa simbol
// (#, ?, %, ...). Nama asli tetap disimpan di kolom file_name.
function toStorageFileName(name) {
  const slugify = (value) =>
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const extension = dotIndex > 0 ? slugify(name.slice(dotIndex + 1)) : "";
  const safeBase = slugify(base).slice(0, 80) || "lampiran";

  return extension ? `${safeBase}.${extension}` : safeBase;
}

export const useTaskMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const assignTask = async (taskId, userId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await assignTaskService(taskId, userId);
      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Gagal menetapkan tugas.");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createTaskAttachment = async (taskId, file) => {
    setLoading(true);
    setError(null);
    try {
      if (!file) {
        throw new Error("File tidak ditemukan.");
      }

      // 1. Validasi ukuran (< 5MB) dan tipe/mime
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error("Ukuran file melebihi batas maksimal 5MB.");
      }

      if (!allowedAttachmentTypes.includes(file.type)) {
        throw new Error(
          "Tipe file tidak didukung. Gunakan JPEG, PNG, WEBP, atau PDF.",
        );
      }

      // 2. Storage path: "taskId/uniqueFileName"
      const uniqueFileName = `${Date.now()}-${toStorageFileName(file.name)}`;
      const filePath = `${taskId}/${uniqueFileName}`;

      // 3. Upload ke Supabase Storage bucket "task_attachments" (dengan pengecekan RLS policy)
      const { error: uploadError } = await supabase.storage
        .from("task_attachments")
        .upload(filePath, file);

      if (uploadError) {
        if (
          uploadError.statusCode === "403" ||
          uploadError.message?.toLowerCase().includes("row-level security") ||
          uploadError.message?.toLowerCase().includes("policy") ||
          uploadError.error === "Unauthorized"
        ) {
          throw new Error(
            "Gagal mengunggah: Anda tidak memiliki izin untuk mengunggah ke tugas ini.",
          );
        }
        throw new Error(
          uploadError.message || "Gagal mengunggah file ke storage.",
        );
      }

      // 4. Panggil API backend untuk menyimpan record database (menggunakan .select().single() di server)
      const result = await createTaskAttachmentService(taskId, {
        filePath,
        fileName: file.name,
        fileType: file.type,
      });

      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Gagal mengunggah lampiran.");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTaskAttachment = async (taskId, attachmentId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteTaskAttachmentService(taskId, attachmentId);
      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Gagal menghapus lampiran.");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    assignTask,
    createTaskAttachment,
    deleteTaskAttachment,
    loading,
    error,
  };
};
