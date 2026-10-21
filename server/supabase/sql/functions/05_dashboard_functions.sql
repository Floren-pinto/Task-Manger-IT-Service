-- dashboard summary for the current user
-- SECURITY INVOKER keeps the caller's RLS scope.
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS jsonb AS $$
WITH visible_tasks AS (
    SELECT t.*
    FROM tasks t
    WHERE t.deleted_at IS NULL
),
status_counts AS (
    SELECT status::text AS status, count(*)::int AS total
    FROM visible_tasks
    GROUP BY status
),
completed_today AS (
    SELECT count(DISTINCT h.task_id)::int AS total
    FROM task_status_history h
    JOIN visible_tasks t ON t.id = h.task_id
    WHERE h.new_status = 'COMPLETED'
      AND h.changed_at >= current_date
      AND h.changed_at < current_date + interval '1 day'
),
division_counts AS (
    SELECT d.id, d.name, count(t.id)::int AS total
    FROM divisions d
    LEFT JOIN visible_tasks t ON t.division_id = d.id
    GROUP BY d.id, d.name
),
technician_counts AS (
    SELECT u.id, u.name,
           count(DISTINCT t.id)::int AS total,
           count(DISTINCT t.id) FILTER (WHERE t.status = 'COMPLETED')::int AS completed
    FROM users u
    JOIN task_assignments ta ON ta.user_id = u.id
    JOIN visible_tasks t ON t.id = ta.task_id
    WHERE u.role = 'TECHNICIAN'
    GROUP BY u.id, u.name
),
summary AS (
    SELECT
        count(*) FILTER (
            WHERE status NOT IN ('COMPLETED', 'CANCELLED')
        )::int AS active_tasks,
        count(*) FILTER (
            WHERE due_date IS NOT NULL
              AND due_date < current_date
              AND status NOT IN ('COMPLETED', 'CANCELLED')
        )::int AS overdue,
        count(*) FILTER (
            WHERE status NOT IN ('COMPLETED', 'CANCELLED')
              AND NOT EXISTS (
                  SELECT 1 FROM task_assignments ta
                  WHERE ta.task_id = visible_tasks.id
              )
        )::int AS unassigned
    FROM visible_tasks
)
SELECT jsonb_build_object(
    'activeTasks', summary.active_tasks,
    'completedToday', (SELECT total FROM completed_today),
    'overdue', summary.overdue,
    'unassigned', summary.unassigned,
    'byStatus', COALESCE(
        (SELECT jsonb_object_agg(status, total) FROM status_counts),
        '{}'::jsonb
    ),
    'byDivision', COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'name', name, 'total', total)
                ORDER BY name
            )
            FROM division_counts
        ),
        '[]'::jsonb
    ),
    'byTechnician', COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'name', name,
                    'total', total,
                    'completed', completed
                )
                ORDER BY name
            )
            FROM technician_counts
        ),
        '[]'::jsonb
    )
)
FROM summary;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_summary() TO authenticated;
