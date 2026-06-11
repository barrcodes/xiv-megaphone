import z from "zod";

const viteEnv =
  typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined"
    ? import.meta.env
    : undefined;

const nodeEnv =
  typeof process !== "undefined" && process.env ? process.env : undefined;

// this will get whichever environment is present in the current code. Resolves nodeEnv in main process, and viteEnv in renderer.
const currentEnv =
  viteEnv && Object.keys(viteEnv).some((key) => key.startsWith("VITE_"))
    ? viteEnv
    : nodeEnv;

export const Environment = z.object({
  VITE_BACKEND_URL: z.string(),
  VITE_LOCAL_PORT: z.coerce.number().default(57577),
  VITE_SUPABASE_URL: z.string(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string(),
});

export type Environment = z.infer<typeof Environment>;

export const env = Environment.parse(currentEnv);
