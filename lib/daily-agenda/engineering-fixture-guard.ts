const reservedEngineeringPrefixes = [
  "synthetic v2 verification:",
] as const;

export function containsReservedEngineeringFixtureLabel(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLocaleLowerCase("en-US");
  return reservedEngineeringPrefixes.some((prefix) => normalized.startsWith(prefix));
}

export function containsReservedEngineeringFixture(input: Record<string, unknown>) {
  return [input.title, input.location, input.dressCode, input.notes]
    .some(containsReservedEngineeringFixtureLabel);
}
