/** Automation Capability ID

Constitutional automation capability identifier.

Architecture:
CapabilityId
  ↓
TaskProviderId
  ↓
TaskProviderDescriptor

Strings shouldn't become constitutional identities.
CapabilityId is a frozen value object for capability identification.
*/

export class AutomationCapabilityId {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  toString(): string {
    return this.value;
  }

  equals(other: AutomationCapabilityId): boolean {
    return this.value === other.value;
  }

  hashCode(): number {
    return this.value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
}
