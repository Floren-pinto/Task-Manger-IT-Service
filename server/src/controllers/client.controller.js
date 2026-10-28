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

const CLIENT_COLUMNS =
  "id, name, contact, email, address, service_type, deleted_at, created_at, updated_at";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LENGTH = { name: 200, contact: 100, email: 254, address: 500, serviceType: 100 };

function parseEmail(value) {
  const email = parseOptionalText(value, "email", MAX_LENGTH.email);
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "email must be a valid email address");
  }
  return email;
}

function canViewDeletedAssets(role) {
  return role === "SUPER_ADMIN" || role === "MANAGER_DIVISION";
}

export const listClients = asyncHandler(async (req, res) => {
  const { page, limit, search, includeDeleted } = req.query;
  const { safePage, safeLimit, from, to } = parsePaginationParams(page, limit);

  let query = req.supabase
    .from("clients")
    .select(CLIENT_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (includeDeleted !== true) {
    query = query.is("deleted_at", null);
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
    throw new ApiError(500, "Failed to fetch clients");
  }

  const total = count ?? 0;

  return ok(res, {
    clients: data ?? [],
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

export const getClientDetail = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  if (!isUuid(clientId)) {
    throw new ApiError(400, "Invalid client ID");
  }

  const { data: client, error } = await req.supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("id", clientId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "Client not found");
    }
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid client ID");
    }
    throw new ApiError(500, "Failed to fetch client detail");
  }

  const includeDeletedAssets =
    req.query.includeDeletedAssets === true &&
    canViewDeletedAssets(req.profile?.role);

  let assetQuery = req.supabase
    .from("assets")
    .select(
      "id, name, serial_number, type, deleted_at, created_at, updated_at",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (!includeDeletedAssets) {
    assetQuery = assetQuery.is("deleted_at", null);
  }

  const { data: assets, error: assetsError } = await assetQuery;

  if (assetsError) {
    throw new ApiError(500, "Failed to fetch client assets");
  }

  return ok(res, { ...client, assets: assets ?? [] });
});

export const createClient = asyncHandler(async (req, res) => {
  const { name, contact, email, address, serviceType } = req.body ?? {};

  const payload = {
    id: crypto.randomUUID(),
    name: parseRequiredText(name, "name", MAX_LENGTH.name),
    contact: parseRequiredText(contact, "contact", MAX_LENGTH.contact),
    email: parseEmail(email) ?? null,
    address: parseRequiredText(address, "address", MAX_LENGTH.address),
    service_type: parseRequiredText(
      serviceType,
      "serviceType",
      MAX_LENGTH.serviceType,
    ),
  };

  const { data, error } = await req.supabase
    .from("clients")
    .insert(payload)
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    if (error.code === "42501") {
      throw new ApiError(403, "You are not allowed to create a client");
    }
    throw new ApiError(500, "Failed to create new client");
  }

  return created(res, data, "Client created successfully");
});

export const updateClient = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { name, contact, email, address, serviceType, deleted } =
    req.body ?? {};
  const role = req.profile?.role;

  if (!isUuid(clientId)) {
    throw new ApiError(400, "Invalid client ID");
  }

  if (role === "TECHNICIAN") {
    throw new ApiError(403, "Technician is not allowed to update client");
  }

  parseOptionalBoolean(deleted, "deleted");

  if (role === "STAFF" && deleted === true) {
    throw new ApiError(403, "Staff is not allowed to delete client");
  }

  const updatePayload = {};

  if (name !== undefined) {
    updatePayload.name = parseRequiredText(name, "name", MAX_LENGTH.name);
  }
  if (contact !== undefined) {
    updatePayload.contact = parseRequiredText(
      contact,
      "contact",
      MAX_LENGTH.contact,
    );
  }
  if (email !== undefined) updatePayload.email = parseEmail(email);
  if (address !== undefined) {
    updatePayload.address = parseRequiredText(
      address,
      "address",
      MAX_LENGTH.address,
    );
  }
  if (serviceType !== undefined) {
    updatePayload.service_type = parseRequiredText(
      serviceType,
      "serviceType",
      MAX_LENGTH.serviceType,
    );
  }

  if (deleted !== undefined) {
    updatePayload.deleted_at = deleted ? new Date() : null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const { data, error } = await req.supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId)
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "Client not found");
    }
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid client ID");
    }
    if (error.code === "42501") {
      throw new ApiError(403, "You are not allowed to update this client");
    }
    throw new ApiError(500, "Failed to update client");
  }

  let resMessage = "Client updated successfully";
  if (deleted === true) resMessage = "Client deleted successfully";
  if (deleted === false) resMessage = "Client restored successfully";

  return ok(res, data, resMessage);
});
