import {
  CUSTOMER_MEMORY_COMMAND_VERSION,
  executeCustomerMemoryCommand,
  type CorrectionDirective,
  type CustomerMemoryExecutionResult,
  type CustomerMemoryRepository,
  type CustomerMemoryScope,
} from "./customer-memory";
import type { CustomerStateMutationAuthorization } from "./authority";

export const V2_CONSULTATION_COMMAND_VERSION = "v2-consultation-command.v2.1.0" as const;

export type ConsultationInputMethod = "typed" | "enter-key" | "suggested-prompt";
export type ConsultationCommand = {
  commandVersion: typeof V2_CONSULTATION_COMMAND_VERSION;
  consultationId: string;
  requestId: string;
  ownerUserId: string;
  inputMethod: ConsultationInputMethod;
  originalLanguage: string;
  scope: CustomerMemoryScope;
  directive: CorrectionDirective;
  authorization: CustomerStateMutationAuthorization;
};

export type ConsultationState =
  | { status: "idle"; draft: string }
  | { status: "submitting"; draft: string; consultationId: string }
  | {
      status: "succeeded";
      draft: "";
      consultationId: string;
      understood: string;
      remembered: string;
      rebuildRequired: true;
      ownerUserId: string;
      correctionRevision: number;
      suppressionRevision: number;
    }
  | {
      status: "failed";
      draft: string;
      consultationId: string;
      retryable: boolean;
      message: string;
    };

export function beginConsultation(command: ConsultationCommand): ConsultationState {
  if (command.commandVersion !== V2_CONSULTATION_COMMAND_VERSION) {
    return {
      status: "failed",
      draft: command.originalLanguage,
      consultationId: command.consultationId,
      retryable: false,
      message: "This consultation version is no longer supported.",
    };
  }
  if (!command.originalLanguage.trim()) {
    return {
      status: "failed",
      draft: command.originalLanguage,
      consultationId: command.consultationId,
      retryable: false,
      message: "Tell Curated what you would like considered.",
    };
  }
  if (command.ownerUserId !== command.authorization.targetUserId) {
    return {
      status: "failed",
      draft: command.originalLanguage,
      consultationId: command.consultationId,
      retryable: false,
      message: "This note could not be applied to the selected customer.",
    };
  }
  return {
    status: "submitting",
    draft: command.originalLanguage,
    consultationId: command.consultationId,
  };
}

function finishConsultation(
  command: ConsultationCommand,
  result: CustomerMemoryExecutionResult,
): ConsultationState {
  if (!result.success) {
    return {
      status: "failed",
      draft: result.preservedInput ?? command.originalLanguage,
      consultationId: command.consultationId,
      retryable: result.retryable,
      message: result.reason,
    };
  }
  return {
    status: "succeeded",
    draft: "",
    consultationId: command.consultationId,
    understood: result.customerMessage,
    remembered: result.rememberedMessage,
    rebuildRequired: true,
    ownerUserId: result.cacheInvalidation.ownerUserId,
    correctionRevision: result.cacheInvalidation.correctionRevision,
    suppressionRevision: result.cacheInvalidation.suppressionRevision,
  };
}

/**
 * One canonical submission path for typed text, Enter, and suggested prompts.
 * The draft is cleared only after owner-scoped durable persistence succeeds.
 */
export async function submitConsultation(
  repository: CustomerMemoryRepository,
  command: ConsultationCommand,
): Promise<ConsultationState> {
  const started = beginConsultation(command);
  if (started.status !== "submitting") return started;
  const result = await executeCustomerMemoryCommand(repository, {
    commandVersion: CUSTOMER_MEMORY_COMMAND_VERSION,
    kind: "create-correction",
    authorization: command.authorization,
    scope: command.scope,
    originalLanguage: command.originalLanguage,
    directive: command.directive,
  });
  return finishConsultation(command, result);
}
