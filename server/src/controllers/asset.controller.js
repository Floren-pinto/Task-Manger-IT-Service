import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { created, ok } from "../utils/ApiResponse.js";
import {
  isUuid,
  parsePaginationParams,
  sanitizeSearch,
} from "../utils/queryParams.js";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : value;
}

function cleanSerialNumber(value) {
  const cleanValue = cleanString(value);
  return cleanValue ? cleanValue : null;
}

export const listAssets = asyncHandler(async (req, res) => {
  const { page, limit, search, clientId, includeDeleted } = req.query;
  const { safePage, safeLimit, from, to } = parsePaginationParams(page, limit);

  if (clientId !== undefined && !isUuid(clientId)) {
    throw new ApiError(400, "Invalid client ID");
  }

  let query = req.supabase
    .from("assets")
    .select(
      `id, name, serial_number, type, deleted_at, client:clients!assets_client_id_fkey(id, name), created_at, updated_at`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (includeDeleted !== true) {
    query = query.is("deleted_at", null);
  }

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const keyword = search ? sanitizeSearch(search) : "";
  if (keyword) {
    query = query.ilike("name", `%${keyword}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid filter value");
    }
    throw new ApiError(500, "Failed to fetch assets");
  }

  const total = count ?? 0;

  return ok(res, {
    assets: data ?? [],
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

export const getAssetDetail = asyncHandler(async (req, res) => {
  const { assetId } = req.params;

  if (!isUuid(assetId)) {
    throw new ApiError(400, "Invalid asset ID");
  }

  const { data, error } = await req.supabase
    .from("assets")
    .select(
      `id, name, serial_number, type, deleted_at, client:clients!assets_client_id_fkey(id, name), created_at, updated_at, tasks(id, title, description, due_date, created_at, updated_at)`,
    )
    .eq("id", assetId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "Asset not found");
    }
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid asset ID");
    }
    throw new ApiError(500, "Failed to fetch asset detail");
  }

  return ok(res, data);
});

export const createAsset = asyncHandler(async (req, res) => {
  const { name, serialNumber, type, clientId } = req.body ?? {};

  const cleanName = cleanString(name);
  const cleanType = cleanString(type);

  if (!cleanName || !cleanType || !clientId) {
    throw new ApiError(400, "name, type, and clientId are required");
  }

  if (!isUuid(clientId)) {
    throw new ApiError(400, "Invalid client ID");
  }

  const { data, error } = await req.supabase
    .from("assets")
    .insert({
      id: crypto.randomUUID(),
      name: cleanName,
      serial_number: cleanSerialNumber(serialNumber),
      type: cleanType,
      client_id: clientId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new ApiError(400, "Invalid client ID");
    }
    throw new ApiError(500, "Failed to create new asset");
  }

  return created(res, data, "Asset created successfully");
});

export const updateAsset = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const { name, serialNumber, type, clientId, deleted } = req.body ?? {};

  if (!isUuid(assetId)) {
    throw new ApiError(400, "Invalid asset ID");
  }

  if (clientId !== undefined && clientId !== null && clientId !== "") {
    if (!isUuid(clientId)) {
      throw new ApiError(400, "Invalid client ID");
    }
  }

  const updatePayload = {};

  const cleanName = cleanString(name);
  if (cleanName) updatePayload.name = cleanName;

  if (serialNumber !== undefined) {
    updatePayload.serial_number = cleanSerialNumber(serialNumber);
  }

  const cleanType = cleanString(type);
  if (cleanType) updatePayload.type = cleanType;

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
    }
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid asset ID");
    }
    if (error.code === "23503") {
      throw new ApiError(400, "Invalid client ID");
    }
    if (error.code === "42501") {
      throw new ApiError(403, "You are not allowed to update this asset");
    }
    throw new ApiError(500, "Failed to update asset");
  }

  let resMessage = "Asset updated successfully";
  if (deleted === true) resMessage = "Asset deleted successfully";
  if (deleted === false) resMessage = "Asset restored successfully";

  return ok(res, data, resMessage);
});
