import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { created, ok } from "../utils/ApiResponse.js";
import { supabaseAdmin } from "../config/supabase.js";
import { isUuid, sanitizeSearch } from "../utils/queryParams.js";
import { cleanString } from "../utils/validation.js";

const USER_COLUMNS = `id, name, email, role, is_active, division_id, division:divisions!users_division_id_fkey(id, name), deleted_at, created_at, updated_at`;

const ROLES = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "STAFF",
  "TECHNICIAN",
]);

const DIVISION_REQUIRED_ROLES = new Set(["TECHNICIAN", "MANAGER_DIVISION"]);

const ACTIVE_ASSIGNMENT_STATUSES = ["PENDING", "IN_PROGRESS", "ON_HOLD"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRole(value) {
  if (typeof value !== "string") return null;
  const role = value.trim().toUpperCase();
  return ROLES.has(role) ? role : null;
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

async function assertDivisionExists(supabase, divisionId) {
  const { data, error } = await supabase
    .from("divisions")
    .select("id")
    .eq("id", divisionId)
    .maybeSingle();

  if (error) {
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid division ID");
    }
    throw new ApiError(500, "Failed to validate division");
  }

  if (!data) {
    throw new ApiError(400, "Division not found");
  }
}

async function countActiveSuperAdmins(supabase) {
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "SUPER_ADMIN")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (error) {
    throw new ApiError(500, "Failed to validate SUPER_ADMIN count");
  }

  return count ?? 0;
}

async function hasActiveAssignments(supabase, userId) {
  const { data, error } = await supabase
    .from("task_assignments")
    .select("task_id, task:tasks!inner(id, status, deleted_at)")
    .eq("user_id", userId);

  if (error) {
    throw new ApiError(500, "Failed to validate active assignments");
  }

  return (data ?? []).some(
    (assignment) =>
      assignment.task &&
      !assignment.task.deleted_at &&
      ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.task.status),
  );
}

export const listUsers = asyncHandler(async (req, res) => {
  const { search, role, division, status, includeDeleted } = req.query;

  let query = req.supabase
    .from("users")
    .select(USER_COLUMNS)
    .order("name", { ascending: true });

  if (typeof status === "boolean") {
    query = query.eq("is_active", status);
  }

  if (role !== undefined && role !== "") {
    const parsedRole = parseRole(role);
    if (!parsedRole) {
      throw new ApiError(400, "Invalid role");
    }
    query = query.eq("role", parsedRole);
  }

  if (division) {
    if (!isUuid(division)) {
      throw new ApiError(400, "Invalid division ID");
    }
    query = query.eq("division_id", division);
  }

  if (includeDeleted !== true) {
    query = query.is("deleted_at", null);
  }

  const keyword = search ? sanitizeSearch(search) : "";
  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,email.ilike.%${keyword}%`);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid filter value");
    }
    console.error("Failed to fetch users:", error.message);
    throw new ApiError(500, "Failed to fetch users");
  }

  return ok(res, data ?? []);
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, divisionId } = req.body ?? {};

  const cleanName = cleanString(name);
  const cleanEmail = cleanString(email);
  const parsedRole = parseRole(role);
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanName) {
    throw new ApiError(400, "name is required");
  }

  if (cleanName.length > 200) {
    throw new ApiError(400, "name must be at most 200 characters");
  }

  if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
    throw new ApiError(400, "email must be a valid email address");
  }

  if (cleanPassword.length < 8) {
    throw new ApiError(400, "password must be at least 8 characters");
  }

  if (!parsedRole) {
    throw new ApiError(
      400,
      "role must be one of SUPER_ADMIN, MANAGER_DIVISION, STAFF, TECHNICIAN",
    );
  }

  let cleanDivisionId = null;
  if (divisionId !== undefined && divisionId !== null && divisionId !== "") {
    if (!isUuid(divisionId)) {
      throw new ApiError(400, "Invalid division ID");
    }
    cleanDivisionId = divisionId;
  }

  if (DIVISION_REQUIRED_ROLES.has(parsedRole) && !cleanDivisionId) {
    throw new ApiError(
      400,
      "divisionId is required for TECHNICIAN and MANAGER_DIVISION",
    );
  }

  if (cleanDivisionId) {
    await assertDivisionExists(req.supabase, cleanDivisionId);
  }

  if (!supabaseAdmin) {
    throw new ApiError(503, "User admin is not configured");
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail.toLowerCase(),
      password: cleanPassword,
      email_confirm: true,
      user_metadata: { name: cleanName },
    });

  if (authError) {
    if (
      authError.code === "email_exists" ||
      authError.code === "user_already_exists" ||
      /already (registered|exists)/i.test(authError.message || "")
    ) {
      throw new ApiError(409, "Email is already registered");
    }

    console.error("Failed to create auth user:", authError.message);
    throw new ApiError(500, "Failed to create user");
  }

  const userId = authData?.user?.id;
  if (!userId) {
    throw new ApiError(500, "Failed to create user");
  }

  const { data: profile, error: profileError } = await req.supabase
    .from("users")
    .update({
      name: cleanName,
      role: parsedRole,
      division_id: cleanDivisionId,
      is_active: true,
    })
    .eq("id", userId)
    .select(USER_COLUMNS)
    .single();

  if (profileError) {
    console.error("Failed to finalize user profile:", profileError.message);

    const { error: cleanupError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (cleanupError) {
      console.error("Failed to rollback auth user:", cleanupError.message);
    }

    throw new ApiError(500, "Failed to create user");
  }

  return created(res, profile, "User created successfully");
});

export const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const body = req.body ?? {};
  const { name, email, role, divisionId, isActive, deleted } = body;

  if (!isUuid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  if (hasOwn(body, "email")) {
    throw new ApiError(400, "Email cannot be updated");
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be a boolean");
  }

  if (deleted !== undefined && typeof deleted !== "boolean") {
    throw new ApiError(400, "deleted must be a boolean");
  }

  const { data: target, error: targetError } = await req.supabase
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", userId)
    .single();

  if (targetError) {
    if (targetError.code === "PGRST116") {
      throw new ApiError(404, "User not found");
    }
    if (targetError.code === "22P02") {
      throw new ApiError(400, "Invalid user ID");
    }
    throw new ApiError(500, "Failed to fetch user");
  }

  const isSelf = req.profile?.id === userId;

  if (isSelf) {
    if (role !== undefined || isActive !== undefined || deleted !== undefined) {
      throw new ApiError(
        400,
        "You cannot change your own role or account status",
      );
    }
  }

  let nextRole = target.role;
  if (role !== undefined) {
    nextRole = parseRole(role);
    if (!nextRole) {
      throw new ApiError(400, "Invalid role");
    }
  }

  let nextDivisionId = target.division_id;
  if (divisionId !== undefined) {
    if (divisionId === null || divisionId === "") {
      nextDivisionId = null;
    } else if (!isUuid(divisionId)) {
      throw new ApiError(400, "Invalid division ID");
    } else {
      await assertDivisionExists(req.supabase, divisionId);
      nextDivisionId = divisionId;
    }
  }

  if (DIVISION_REQUIRED_ROLES.has(nextRole) && !nextDivisionId) {
    throw new ApiError(
      400,
      "divisionId is required for TECHNICIAN and MANAGER_DIVISION",
    );
  }

  const nextIsActive =
    typeof isActive === "boolean" ? isActive : target.is_active;
  const resultingIsActive = deleted === true ? false : nextIsActive;
  const resultingDeleted = deleted === true ? true : Boolean(target.deleted_at);

  const targetWasActiveSuperAdmin =
    target.role === "SUPER_ADMIN" &&
    target.is_active &&
    !target.deleted_at;

  const losesSuperAdmin =
    nextRole !== "SUPER_ADMIN" || !resultingIsActive || resultingDeleted;

  if (targetWasActiveSuperAdmin && losesSuperAdmin) {
    const activeSuperAdmins = await countActiveSuperAdmins(req.supabase);
    if (activeSuperAdmins <= 1) {
      throw new ApiError(
        409,
        "Cannot deactivate or demote the last active SUPER_ADMIN",
      );
    }
  }

  const divisionChanged =
    divisionId !== undefined && nextDivisionId !== target.division_id;

  if (divisionChanged && (await hasActiveAssignments(req.supabase, userId))) {
    throw new ApiError(
      409,
      "User still has active assignments; reassign them before changing division",
    );
  }

  const updatePayload = {};

  if (name !== undefined) {
    const cleanName = cleanString(name);
    if (!cleanName) {
      throw new ApiError(400, "name cannot be empty");
    }
    if (cleanName.length > 200) {
      throw new ApiError(400, "name must be at most 200 characters");
    }
    updatePayload.name = cleanName;
  }

  if (role !== undefined) {
    updatePayload.role = nextRole;
  }

  if (divisionId !== undefined) {
    updatePayload.division_id = nextDivisionId;
  }

  if (deleted === true) {
    updatePayload.deleted_at = new Date();
    updatePayload.is_active = false;
  } else if (deleted === false) {
    updatePayload.deleted_at = null;
    if (typeof isActive === "boolean") {
      updatePayload.is_active = isActive;
    }
  } else if (typeof isActive === "boolean") {
    updatePayload.is_active = isActive;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const { data: updatedProfile, error: updateError } = await req.supabase
    .from("users")
    .update(updatePayload)
    .eq("id", userId)
    .select(USER_COLUMNS)
    .single();

  if (updateError) {
    if (updateError.code === "PGRST116") {
      throw new ApiError(404, "User not found");
    }
    if (updateError.code === "22P02") {
      throw new ApiError(400, "Invalid user ID");
    }
    if (updateError.code === "42501") {
      throw new ApiError(403, "You are not allowed to update this user");
    }
    if (updateError.code === "P0001") {
      console.error(
        "User update rejected by database trigger:",
        updateError.message,
      );
      throw new ApiError(403, "You are not allowed to update this field");
    }
    console.error("Failed to update user:", updateError.message);
    throw new ApiError(500, "Failed to update user");
  }

  // Arsip/nonaktif cukup lewat kolom is_active & deleted_at (dijamin RLS untuk
  // SUPER_ADMIN). User nonaktif otomatis ditolak oleh attachProfile.
  return ok(res, updatedProfile, "User updated successfully");
});
