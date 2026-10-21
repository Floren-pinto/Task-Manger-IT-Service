# Task Manager(IT-Service)

A task management application for managing tasks, assignments, task status, attachments, service reports, clients, and related activities based on user roles on it service.

## About the Project

This project is being developed as a learning project to practice full-stack web development, database design, role-based access control, and task management workflows.

The system is designed around different roles, including:

- Manager Division
- Staff
- Technician

Access to data and operations is controlled according to each user's role and the scope of the related task or division.

## Tech Stack

- React.js
- Express.js
- Supabase JS Client
- Prisma ORM (tooling & maintenance scripts)
- PostgreSQL
- Supabase
- Git & GitHub

## Features

- [x] Project initialization
- [x] Database setup
- [x] Role-based database permissions
- [x] Authentication
- [x] Task Management
- [x] Task Assignment
- [x] Task Status History
- [x] Task Attachments
- [ ] Service Reports
- [ ] Client Management
- [x] Notification
- [x] Dashboard

## Database

The PostgreSQL database has been set up as the foundation of the Task Manager application.

The database uses role-based permissions to control access to data and operations. The current permission design covers the following tables:

- `tasks`
- `task_assignments`
- `task_status_history`
- `task_attachments`
- `service_reports`
- `clients`

### Database Permission

Access to the `tasks` table is divided by role:

- **MANAGER_DIVISION** — can access all tasks within the applicable scope and perform task management operations, including soft delete.
- **STAFF** — can access tasks across divisions and can update only specific fields such as `priority` and `dueDate`.
- **TECHNICIAN** — can access tasks within their division and can update `status` and `description`.

The `task_assignments` table allows `MANAGER_DIVISION` and `STAFF` to access and manage assignments within the scope of their tasks, while `TECHNICIAN` has read-only access.

The `task_status_history` table is designed as an immutable log. `MANAGER_DIVISION`, `STAFF`, and `TECHNICIAN` have different read scopes, while records are not intended to be updated or deleted.

The `task_attachments` table controls access according to the task scope. Technicians can delete only attachments uploaded by themselves.

The `service_reports` table is also designed as immutable data. `MANAGER_DIVISION` and `TECHNICIAN` can read reports within the task scope, while reports cannot be updated or deleted.

The `clients` table provides role-based access where `MANAGER_DIVISION` has full access with soft delete, `STAFF` has full access with soft delete, and `TECHNICIAN` has read-only access.

The dashboard summary uses the `get_dashboard_summary()` RPC. Apply `server/supabase/sql/functions/05_dashboard_functions.sql` in the Supabase SQL editor before using `GET /api/dashboard/summary`.

## Progress

### Completed

- [x] Project initialized
- [x] Database setup
- [x] Database tables and relationships
- [x] Role-based database permissions (RLS)
- [x] Express backend skeleton (routing, middleware, JWT verification dari Supabase)
- [x] RBAC middleware & protected routes (FR-02, FR-04)
- [x] Task Management v1 (list, search, filter, sort, pagination, create, edit, soft delete)
- [x] Task Management (create, assign, status update — FR-20–FR-27)
- [x] Notification
- [x] Task Assignment
- [x] Authentication (Supabase Auth di frontend — FR-01)
- [x] Task Status History
- [x] Task Attachments
- [x] Dashboard summary (role-scoped metrics, workload per division/technician, recent tasks)

### In Progress

- [ ] Client Management

### Planned

- [ ] Service Reports

## Feature Improvements

### Task Management

- [x] Add task priority
- [x] Add due date
- [x] Add task search
- [x] Add task filtering
- [x] Add task sorting
- [x] Add pagination

### Role & Permission

- [ ] Implement role-based authorization in the application layer
- [ ] Improve permission validation
- [ ] Add permission-related error handling

### UI/UX

- [x] Add loading states
- [x] Add empty states
- [x] Add error states
- [x] Improve responsive design

## Installation

Installation instructions will be added once the initial application setup is completed.

## Future Improvements

- Add client management and service report UI
- Add automated integration tests for RLS and role-scoped endpoints
- Harden production configuration (CORS allowlist, structured logging, validation)
- Add scheduled cleanup for orphaned storage files
