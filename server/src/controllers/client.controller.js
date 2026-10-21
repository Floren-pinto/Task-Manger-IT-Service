import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { created, ok } from "../utils/ApiResponse.js";

export const listClients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const query = req.supabase
    .from("clients")
    .select(
      `id, name, contact, email, address, service_type, created_at, updated_at`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) query.ilike("name", `%${search}%`);

  const { data, count, error } = await query;

  if (search && data.length === 0)
    throw new ApiError(
      404,
      "No clients found matching with the search criteria",
    );

  if (error) throw new ApiError(500, "failed to fetch clients");

  return ok(res, {
    clients: data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
    },
  });
});

export const getClientDetail = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    throw new ApiError(400, "client ID is required");
  }

  const { data, error } = await req.supabase
    .from("clients")
    .select(
      `id, name, contact, email, address, service_type, created_at, updated_at, tasks(id, title, description, priority, status, due_date, created_at, updated_at), assets:assets(id, name, description, created_at, updated_at)`,
    )
    .eq("id", clientId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "client not found");
    }
    throw new ApiError(500, "failed to fetch client detail");
  }

  return ok(res, data);
});

export const createClient = asyncHandler(async (req, res) => {
  const { name, contact, email = null, address, serviceType } = req.body;

  if (!name || !contact || !address || !serviceType) {
    throw new ApiError(
      400,
      "name, contact, email, address, and serviceType are required",
    );
  }

  const { data, error } = await req.supabase
    .from("clients")
    .insert({
      id: crypto.randomUUID(),
      name,
      contact,
      email,
      address,
      service_type: serviceType,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42501")
      throw new ApiError(403, "you are not allowed to create a new client");
    throw new ApiError(500, "Failed to create new client");
  }

  return created(res, data, "Client created successfully");
});

export const updateClient = asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { name, contact, email, address, serviceType, deleted } = req.body;
  const { role } = req.profile;

  if (!clientId) throw new ApiError(400, "client ID is required");

  const updatePayload = {};
  if (name) updatePayload.name = name;
  if (contact) updatePayload.contact = contact;
  if (email !== undefined || email !== null || email !== "")
    updatePayload.email = email;
  if (address) updatePayload.address = address;
  if (serviceType) updatePayload.service_type = serviceType;

  if (typeof deleted === "boolean") {
    updatePayload.deleted_at = deleted ? new Date() : null;
  }

  if (role === "TECHNICIAN")
    throw new ApiError(403, "Technician is not allowed to update client");

  if (role === "STAFF" && deleted === true) {
    throw new ApiError(403, "Staff is not allowed to delete client");
  }

  if (
    !name &&
    !contact &&
    !email &&
    !address &&
    !serviceType &&
    typeof deleted !== "boolean"
  )
    throw new ApiError(400, "At least one field is required to update");

  const { data, error } = await req.supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "Client not found");
    }
    throw new ApiError(500, "Failed to update client");
  }

  const resMessage =
    deleted === true
      ? "Client deleted successfully"
      : "Client updated successfully";

  return ok(res, data, resMessage);
});
