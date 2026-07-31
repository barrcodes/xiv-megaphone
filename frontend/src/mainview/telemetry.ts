import type { Tracer } from "@opentelemetry/api";
import { context, propagation, trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { env } from "../shared/env";
import { supabase } from "./lib/supabase";

let tracer: Tracer = trace.getTracer("xiv-megaphone-electron");
let initialized = false;

export async function initTelemetry() {
  if (initialized) return;
  initialized = true;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const version = await window.electronAPI.getVersion();

  const exporter = new OTLPTraceExporter({
    url: `${env.VITE_BACKEND_URL}/internal/client-telemetry/v1/traces`,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "xiv-megaphone",
      [ATTR_SERVICE_VERSION]: version,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: env.VITE_OTEL_ENV_NAME,
      "telemetry.schema.version": "4",
    }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  provider.register();
  tracer = trace.getTracer("xiv-megaphone-electron");
}

export { context, propagation, trace, tracer };
