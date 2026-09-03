import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CustomerMemoryCommand,
  type CustomerMemoryRepository,
  type PersistedCustomerMemoryMutation,
} from "./customer-memory";

type RpcResult = {
  record_id: string;
  owner_user_id: string;
  record_kind: "correction" | "suppression";
  operation: "created" | "restored" | "superseded";
  scope: PersistedCustomerMemoryMutation["scope"];
  correction_revision: number;
  suppression_revision: number;
  audit_record_id: string | null;
};

/**
 * Owner-scoped persistence boundary. The database RPC is the authorization and
 * transaction boundary; this adapter never performs direct table mutations.
 */
export class SupabaseCustomerMemoryRepository implements CustomerMemoryRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly authenticatedUserId: string,
  ) {}

  async executeAuthorized(command: CustomerMemoryCommand): Promise<PersistedCustomerMemoryMutation> {
    if (command.authorization.targetUserId !== this.authenticatedUserId) {
      throw new Error("Customer-memory repository owner mismatch.");
    }
    const service = command.authorization.actor.kind === "authorized-customer-service";
    const functionName = service
      ? "service_execute_recommendation_memory_v2"
      : "customer_execute_recommendation_memory_v2";
    const { data, error } = await this.client.rpc(functionName, {
      command: command as unknown as Record<string, unknown>,
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as RpcResult | null;
    if (!row || row.owner_user_id !== this.authenticatedUserId) {
      throw new Error("Customer-memory persistence returned an invalid owner.");
    }
    return {
      recordId: row.record_id,
      ownerUserId: row.owner_user_id,
      recordKind: row.record_kind,
      operation: row.operation,
      scope: row.scope,
      revisions: {
        correctionRevision: Number(row.correction_revision),
        suppressionRevision: Number(row.suppression_revision),
      },
      auditRecordId: row.audit_record_id,
    };
  }
}
