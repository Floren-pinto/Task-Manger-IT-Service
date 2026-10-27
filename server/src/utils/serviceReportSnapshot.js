// Snapshot dibangun dari query req.supabase sehingga hanya berisi data yang
// boleh dilihat user (RLS). Relasi yang tidak terlihat bernilai null.
const SNAPSHOT_TASK_COLUMNS = `id, title, description, priority, status, due_date, completed_at, created_at, deleted_at,
  division:divisions!tasks_division_id_fkey (id, name),
  client:clients!tasks_client_id_fkey (id, name, contact, email, address, service_type),
  asset:assets!tasks_asset_id_fkey (id, name, serial_number, type),
  assignments:task_assignments (
    user:users!task_assignments_user_id_fkey (id, name, email)
  ),
  histories:task_status_history (
    old_status, new_status, changed_at,
    user:users!task_status_history_user_id_fkey (id, name)
  )`;

export async function fetchTaskForSnapshot(supabase, taskId) {
  return supabase
    .from("tasks")
    .select(SNAPSHOT_TASK_COLUMNS)
    .eq("id", taskId)
    .maybeSingle();
}

function pickClient(client) {
  if (!client) return null;
  return {
    id: client.id,
    name: client.name,
    contact: client.contact ?? null,
    email: client.email ?? null,
    address: client.address ?? null,
    service_type: client.service_type ?? null,
  };
}

function pickAsset(asset) {
  if (!asset) return null;
  return {
    id: asset.id,
    name: asset.name,
    serial_number: asset.serial_number ?? null,
    type: asset.type ?? null,
  };
}

export function buildServiceReportSnapshot(task) {
  const technicians = (task.assignments ?? [])
    .map((assignment) => assignment.user)
    .filter(Boolean)
    .map((user) => ({ id: user.id, name: user.name, email: user.email }));

  const statusHistory = [...(task.histories ?? [])]
    .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
    .map((history) => ({
      old_status: history.old_status,
      new_status: history.new_status,
      changed_at: history.changed_at,
      changed_by: history.user
        ? { id: history.user.id, name: history.user.name }
        : null,
    }));

  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ?? null,
      completed_at: task.completed_at ?? null,
      created_at: task.created_at,
    },
    division: task.division
      ? { id: task.division.id, name: task.division.name }
      : null,
    client: pickClient(task.client),
    asset: pickAsset(task.asset),
    technicians,
    status_history: statusHistory,
    generated_at: new Date().toISOString(),
  };
}
