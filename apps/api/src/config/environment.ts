import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().url(),
    API_CORS_ORIGIN: z.string().min(1).default("http://localhost:3200"),
    PORT: z.string().regex(/^\d+$/).optional(),
    API_PORT: z.string().regex(/^\d+$/).default("4200"),
    API_RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default("60000"),
    API_RATE_LIMIT_MAX: z.string().regex(/^\d+$/).default("120"),
    TRUST_PROXY_HOPS: z.string().regex(/^\d+$/).default("0"),
    PUBLIC_DEMO_MODE: z.enum(["true", "false"]).default("false"),
  })
  .passthrough()
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === "production" &&
      !environment.DATABASE_URL.startsWith("postgresql://") &&
      !environment.DATABASE_URL.startsWith("postgres://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Production requires a PostgreSQL connection URL",
      });
    }

    if (environment.NODE_ENV === "production") {
      for (const origin of environment.API_CORS_ORIGIN.split(",")) {
        if (!origin.trim().startsWith("https://")) {
          context.addIssue({
            code: "custom",
            path: ["API_CORS_ORIGIN"],
            message: "Production CORS origins must use HTTPS",
          });
        }
      }
    }
  });

export function validateEnvironment(environment: Record<string, unknown>) {
  return environmentSchema.parse(environment);
}
