type ProviderErrorShape = {
  status?: unknown;
  code?: unknown;
  type?: unknown;
  name?: unknown;
  requestID?: unknown;
  error?: {
    code?: unknown;
    type?: unknown;
  };
};

export class AIConfigurationError extends Error {
  readonly code = "ai_configuration_missing";

  constructor() {
    super("AI provider configuration is missing.");
    this.name = "AIConfigurationError";
  }
}

function providerShape(error: unknown): ProviderErrorShape {
  return typeof error === "object" && error !== null ? error as ProviderErrorShape : {};
}

function providerCodes(error: unknown) {
  const candidate = providerShape(error);
  return [candidate.code, candidate.type, candidate.error?.code, candidate.error?.type]
    .filter((value): value is string => typeof value === "string");
}

export function isOpenAIQuotaError(error: unknown) {
  const candidate = providerShape(error);
  const codes = providerCodes(error);
  return candidate.status === 429 && codes.some((code) =>
    code === "insufficient_quota" || code === "credit_balance_exhausted"
  );
}

export type OpenAIServiceFailure = {
  code:
    | "ai_configuration_missing"
    | "ai_credentials_invalid"
    | "ai_model_unavailable"
    | "ai_quota_exhausted"
    | "ai_rate_limited"
    | "ai_timed_out"
    | "ai_unavailable";
  message: string;
};

export function describeOpenAIServiceFailure(error: unknown, serviceName: string): OpenAIServiceFailure {
  const candidate = providerShape(error);
  const codes = providerCodes(error);
  if (error instanceof AIConfigurationError || codes.includes("ai_configuration_missing")) {
    return {
      code: "ai_configuration_missing",
      message: `${serviceName} is not configured correctly. Your request has been kept, and Curated’s team needs to restore this service.`,
    };
  }
  if (isOpenAIQuotaError(error)) {
    return {
      code: "ai_quota_exhausted",
      message: `${serviceName} is unavailable because its AI usage allowance has been reached. Your request has been kept, and Curated’s team needs to restore the allowance.`,
    };
  }
  if (candidate.status === 401 || codes.some((code) => code === "invalid_api_key" || code === "authentication_error")) {
    return {
      code: "ai_credentials_invalid",
      message: `${serviceName} cannot authenticate with its AI service. Your request has been kept, and Curated’s team needs to restore this connection.`,
    };
  }
  if (candidate.status === 404 && codes.some((code) => code === "model_not_found" || code === "not_found")) {
    return {
      code: "ai_model_unavailable",
      message: `${serviceName} cannot use its configured AI model. Your request has been kept, and Curated’s team needs to review the configuration.`,
    };
  }
  if (candidate.status === 429) {
    return {
      code: "ai_rate_limited",
      message: `${serviceName} is receiving more requests than it can consider just now. Your request has been kept; please try again shortly.`,
    };
  }
  if (
    candidate.code === "ETIMEDOUT"
    || candidate.code === "ECONNABORTED"
    || candidate.name === "AbortError"
    || candidate.name === "APIConnectionTimeoutError"
  ) {
    return {
      code: "ai_timed_out",
      message: `${serviceName} took longer than expected to respond. Your request has been kept; please try again.`,
    };
  }
  return {
    code: "ai_unavailable",
    message: `${serviceName} is temporarily unavailable. Your request has been kept; please try again shortly.`,
  };
}

export function safeAIIncident(error: unknown) {
  const candidate = providerShape(error);
  const codes = providerCodes(error);
  return {
    providerStatus: typeof candidate.status === "number" ? candidate.status : null,
    providerCode: codes[0] ?? null,
    providerRequestId: typeof candidate.requestID === "string" ? candidate.requestID : null,
  };
}

export function logAIServiceFailure(input: {
  service: string;
  boundary: string;
  requestId: string;
  error: unknown;
}) {
  const failure = describeOpenAIServiceFailure(input.error, input.service);
  console.error("curated_ai_incident", {
    service: input.service,
    boundary: input.boundary,
    requestId: input.requestId,
    category: failure.code,
    ...safeAIIncident(input.error),
  });
  return failure;
}
