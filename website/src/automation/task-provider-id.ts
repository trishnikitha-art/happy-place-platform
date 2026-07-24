/** Task Provider ID

Constitutional task provider identifier.

Architecture:
CapabilityId
  ↓
TaskProviderId
  ↓
TaskProviderDescriptor

Strings shouldn't become constitutional identities.
TaskProviderId is a frozen value object for task provider identification.
*/

export class TaskProviderId {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  toString(): string {
    return this.value;
  }

  equals(other: TaskProviderId): boolean {
    return this.value === other.value;
  }

  hashCode(): number {
    return this.value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
}
