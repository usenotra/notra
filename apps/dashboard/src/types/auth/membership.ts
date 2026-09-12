export interface MembershipUpsertInput {
  readonly organizationId: string;
  readonly userId: string;
  readonly role: string;
  readonly createdAt: Date;
}

export interface MembershipUpsertStrategies {
  readonly atomic: (input: MembershipUpsertInput) => Promise<void>;
  readonly readThenWrite: (input: MembershipUpsertInput) => Promise<void>;
  readonly onFallback?: () => void;
}
