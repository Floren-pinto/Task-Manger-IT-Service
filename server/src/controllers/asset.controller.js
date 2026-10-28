import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { created, ok } from "../utils/ApiResponse.js";
import {
  isUuid,
  parsePaginationParams,
  sanitizeSearch,
} from "../utils/queryParams.js";
import {
  parseOptionalBoolean,
  parseOptionalText,
  parseRequiredText,
} from "../utils/validation.js";

const ASSET_COLUMNS =
  "id, name, serial_number, type, client_id, deleted_at, created_at, updated_at";

const MAX_LENGTH = { name: 200, type: 100, serialNumber: 100 };

// Asset yang sudah dipakai task tidak boleh pindah client: task lama akan
// menunjuk asset milik client lain.
async function assertAssetCanMoveToClient(supabase, assetId, clientId) {
  const { data: asset, error } = await supabase
    .from("assets")
    .select("id, client_id")
    .eq("id", assetId)
    .maybeSingle();

  if (error) throw new ApiError(500, "Failed to fetch asset");
  if (!asset) throw new ApiError(404, "Asset not found");
  if (asset.client_id === clientId) return;

  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId);

  if (countError) throw new ApiError(500, "Failed to validate asset usage");
  if ((count ?? 0) > 0) {
    throw new ApiError(
      409,
      "Asset is already used by tasks and cannot be moved to another client",
    );
  }
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

  if (req.profile?.role === "TECHNICIAN") {
    throw new ApiError(403, "Technician is not allowed to create asset");
  }

  if (!isUuid(clientId)) {
    throw new ApiError(400, "Invalid client ID");
  }

  const payload = {
    id: crypto.randomUUID(),
    name: parseRequiredText(name, "name", MAX_LENGTH.name),
    serial_number:
      parseOptionalText(serialNumber, "serialNumber", MAX_LENGTH.serialNumber) ??
      null,
    type: parseRequiredText(type, "type", MAX_LENGTH.type),
    client_id: clientId,
  };

  const { data, error } = await req.supabase
    .from("assets")
    .insert(payload)
    .select(ASSET_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new ApiError(400, "Invalid client ID");
    }
    if (error.code === "42501") {
      throw new ApiError(403, "You are not allowed to create an asset");
    }
    throw new ApiError(500, "Failed to create new asset");
  }

  return created(res, data, "Asset created successfully");
});

export const updateAsset = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const { name, serialNumber, type, clientId, deleted } = req.body ?? {};
  const role = req.profile?.role;

  if (!isUuid(assetId)) {
    throw new ApiError(400, "Invalid asset ID");
  }

  if (role === "TECHNICIAN") {
    throw new ApiError(403, "Technician is not allowed to update asset");
  }

  parseOptionalBoolean(deleted, "deleted");

  if (role === "STAFF" && deleted !== undefined) {
    throw new ApiError(403, "Staff is not allowed to archive or restore asset");
  }

  if (clientId !== undefined && !isUuid(clientId)) {
    throw new ApiError(400, "Invalid client ID");
  }

  const updatePayload = {};

  if (name !== undefined) {
    updatePayload.name = parseRequiredText(name, "name", MAX_LENGTH.name);
  }
  if (serialNumber !== undefined) {
    updatePayload.serial_number = parseOptionalText(
      serialNumber,
      "serialNumber",
      MAX_LENGTH.serialNumber,
    );
  }
  if (type !== undefined) {
    updatePayload.type = parseRequiredText(type, "type", MAX_LENGTH.type);
  }

  if (clientId !== undefined) {
    await assertAssetCanMoveToClient(req.supabase, assetId, clientId);
    updatePayload.client_id = clientId;
  }

  if (deleted !== undefined) {
    updatePayload.deleted_at = deleted ? new Date() : null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const { data, error } = await req.supabase
    .from("assets")
    .update(updatePayload)
    .eq("id", assetId)
    .select(ASSET_COLUMNS)
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
