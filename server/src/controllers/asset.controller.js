import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { created, ok } from "../utils/ApiResponse.js";

export const listAssets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const query = req.supabase
    .from("assets")
    .select(
      `id, name, serial_number, type, client!assets_client_id_fkey(id, name), created_at, updated_at`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) query.like("name", `%${search}%`);

  const { data, count, error } = await query;

  if (error) throw new ApiError(500, "failed to fetch assets");

  return ok(res, {
    assets: data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
    },
  });
});

export const getAssetDetail = asyncHandler(async (req, res) => {
  const { assetId } = req.params;

  if (!assetId) {
    throw new ApiError(400, "asset ID is required");
  }

  const { data, error } = await req.supabase
    .from("assets")
    .select(
      `id, name, serial_number, type, client!assets_client_id_fkey(id, name), created_at, updated_at, tasks(id, title, description, due_date, created_at, updated_at)`,
    )
    .eq("id", assetId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "asset not found");
    }
    throw new ApiError(500, "failed to fetch asset detail");
  }

  return ok(res, data);
});

export const createAsset = asyncHandler(async (req, res) => {
  const { name, serialNumber, type, clientId } = req.body;

  if (!name || !type || !clientId) {
    throw new ApiError(400, "name, type, and client are required");
  }

  const { data, error } = await req.supabase
    .from("assets")
    .insert({
      id: crypto.randomUUID(),
      name,
      serial_number: serialNumber || null,
      type,
      client_id: clientId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new ApiError(400, "Invalid client ID");
    throw new ApiError(500, "Failed to create new asset");
  }

  return created(res, data, "Asset created successfully");
});

export const updateAsset = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const { name, serialNumber, type, clientId, deleted } = req.body;

  if (!assetId) throw new ApiError(400, "asset ID is required");

  const updatePayload = {};
  if (name) updatePayload.name = name;
  if (serialNumber !== undefined) {
    updatePayload.serial_number = serialNumber === "" ? null : serialNumber;
  }
  if (type) updatePayload.type = type;
  if (clientId) updatePayload.client_id = clientId;

  if (typeof deleted === "boolean") {
    updatePayload.deleted_at = deleted ? new Date() : null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const { data, error } = await req.supabase
    .from("assets")
    .update(updatePayload)
    .eq("id", assetId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "Asset not found");
    } else if (error.code === "23503") {
      throw new ApiError(400, "Invalid client ID");
    }
    throw new ApiError(500, "Failed to update asset");
  }

  const resMessage =
    deleted === true
      ? "Asset deleted successfully"
      : "Asset updated successfully";

  return ok(res, data, resMessage);
});
