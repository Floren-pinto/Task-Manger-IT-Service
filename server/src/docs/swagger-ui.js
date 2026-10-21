import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const taskStatusEnum = [
  "PENDING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

const priorityEnum = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Task Manager for IT Service",
      version: "1.0.0",
      description:
        "Dokumentasi API Express untuk pengelolaan tiket IT, termasuk daftar tugas, pembuatan, pembaruan, soft delete, dan ringkasan dashboard.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
    tags: [
      { name: "Divisions", description: "Data divisi penanggung jawab" },
      { name: "Tasks", description: "Tiket dan penugasan layanan IT" },
      { name: "Dashboard", description: "Ringkasan operasional tiket" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Gunakan access token Supabase yang valid pada header Authorization.",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Task not found" },
            error: {
              nullable: true,
              description: "Detail error tambahan jika tersedia.",
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 42 },
            totalPages: { type: "integer", example: 3 },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: priorityEnum },
            status: { type: "string", enum: taskStatusEnum },
            due_date: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            division: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
              },
            },
            client: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
              },
            },
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        TaskResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "OK" },
            data: { $ref: "#/components/schemas/Task" },
          },
        },
        TaskListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "OK" },
            data: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Task" },
                },
                pagination: { $ref: "#/components/schemas/Pagination" },
              },
            },
          },
        },
        DashboardSummary: {
          type: "object",
          properties: {
            activeTasks: { type: "integer", example: 12 },
            completedToday: { type: "integer", example: 3 },
            overdue: { type: "integer", example: 2 },
            unassigned: { type: "integer", example: 4 },
            byStatus: {
              type: "object",
              additionalProperties: { type: "integer" },
              example: {
                PENDING: 5,
                IN_PROGRESS: 4,
                ON_HOLD: 1,
                COMPLETED: 8,
                CANCELLED: 1,
              },
            },
            byDivision: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  name: { type: "string" },
                  total: { type: "integer" },
                },
              },
            },
            byTechnician: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  name: { type: "string" },
                  total: { type: "integer" },
                  completed: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/divisions": {
        get: {
          tags: ["Divisions"],
          summary: "Ambil daftar divisi",
          description:
            "Mengembalikan seluruh divisi yang dapat diakses oleh pengguna terautentikasi.",
          responses: {
            200: {
              description: "Daftar divisi",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            name: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Tidak terautentikasi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/tasks": {
        get: {
          tags: ["Tasks"],
          summary: "Ambil daftar tiket",
          description:
            "Mendukung pencarian, filter, pengurutan, dan pagination di sisi server.",
          parameters: [
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description: "Cari berdasarkan judul atau ID tiket. Awalan # diabaikan.",
            },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: taskStatusEnum },
            },
            {
              name: "priority",
              in: "query",
              schema: { type: "string", enum: priorityEnum },
            },
            {
              name: "divisionId",
              in: "query",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "clientId",
              in: "query",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "technicianId",
              in: "query",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "dueFrom",
              in: "query",
              schema: { type: "string", format: "date" },
            },
            {
              name: "dueTo",
              in: "query",
              schema: { type: "string", format: "date" },
            },
            {
              name: "sortBy",
              in: "query",
              schema: {
                type: "string",
                enum: ["created_at", "due_date"],
                default: "created_at",
              },
            },
            {
              name: "sortOrder",
              in: "query",
              schema: {
                type: "string",
                enum: ["asc", "desc"],
                default: "desc",
              },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              name: "includeDeleted",
              in: "query",
              schema: { type: "boolean", default: false },
              description:
                "Tetap dibatasi oleh RLS; pengguna tanpa akses tidak dapat melihat data terhapus.",
            },
          ],
          responses: {
            200: {
              description: "Daftar tiket",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/TaskListResponse",
                  },
                },
              },
            },
            400: {
              description: "Filter tidak valid",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            401: {
              description: "Tidak terautentikasi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Tasks"],
          summary: "Buat tiket baru",
          description:
            "Hanya Manager/Super Admin/Staff yang dapat membuat tiket. Teknisi ditolak backend.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "description", "divisionId", "clientId"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    divisionId: { type: "string", format: "uuid" },
                    clientId: { type: "string", format: "uuid" },
                    assetId: {
                      type: "string",
                      format: "uuid",
                      nullable: true,
                    },
                    priority: {
                      type: "string",
                      enum: priorityEnum,
                      default: "MEDIUM",
                    },
                    dueDate: {
                      type: "string",
                      format: "date",
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Tiket dibuat",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TaskResponse" },
                },
              },
            },
            400: {
              description: "Payload tidak valid",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            401: {
              description: "Tidak terautentikasi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            403: {
              description: "Peran tidak diizinkan",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/tasks/{taskId}": {
        patch: {
          tags: ["Tasks"],
          summary: "Perbarui tiket atau soft delete",
          description:
            "Perubahan kolom dibatasi oleh trigger database sesuai peran. Gunakan endpoint status untuk mengubah status.",
          parameters: [
            {
              name: "taskId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: priorityEnum },
                    dueDate: {
                      type: "string",
                      format: "date",
                      nullable: true,
                    },
                    divisionId: { type: "string", format: "uuid" },
                    clientId: { type: "string", format: "uuid" },
                    assetId: {
                      type: "string",
                      format: "uuid",
                      nullable: true,
                    },
                    deleted: {
                      type: "boolean",
                      description:
                        "true untuk soft delete, false untuk restore.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Tiket diperbarui atau dihapus",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TaskResponse" },
                },
              },
            },
            400: {
              description: "Payload tidak valid",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            401: {
              description: "Tidak terautentikasi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            403: {
              description: "Peran tidak diizinkan mengubah kolom tersebut",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            404: {
              description: "Tiket tidak ditemukan atau tidak dapat diakses",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/tasks/{taskId}/status": {
        patch: {
          tags: ["Tasks"],
          summary: "Perbarui status tiket",
          parameters: [
            {
              name: "taskId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["newStatus"],
                  properties: {
                    newStatus: {
                      type: "string",
                      enum: taskStatusEnum,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Status tiket diperbarui",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TaskResponse" },
                },
              },
            },
            400: {
              description: "Status tidak valid atau sama dengan status saat ini",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            401: {
              description: "Tidak terautentikasi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            403: {
              description: "Peran tidak diizinkan",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            404: {
              description: "Tiket tidak ditemukan atau tidak dapat diakses",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/dashboard/summary": {
        get: {
          tags: ["Dashboard"],
          summary: "Ambil ringkasan dashboard",
          description:
            "Menggunakan RPC get_dashboard_summary() dengan SECURITY INVOKER sehingga RLS tetap berlaku.",
          responses: {
            200: {
              description: "Ringkasan dashboard",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "OK" },
                      data: {
                        $ref: "#/components/schemas/DashboardSummary",
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Tidak terautentikasi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            500: {
              description: "Gagal mengambil ringkasan dashboard",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

// Endpoint untuk UI Dokumentasi
const router = Router();
router.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerJsdoc(swaggerOptions)),
);

export default router;
