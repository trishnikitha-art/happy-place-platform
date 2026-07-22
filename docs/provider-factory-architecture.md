# Provider Factory Architecture

## Overview

The Provider Factory enables self-registration of authentication providers, allowing new providers to be added without modifying the AuthManager. This follows the Open/Closed Principle - open for extension, closed for modification.

## Architecture

```
Provider (e.g., GoogleProvider)
    ↓
ProviderRegistry.register()
    ↓
ProviderFactory
    ↓
AuthManager
```

## Provider Interface

```typescript
interface AuthProvider {
  name: string;
  initialize(): Promise<void>;
  signIn(): Promise<AuthUser>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  refreshToken(): Promise<AuthSession>;
  getUser(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}
```

## Provider Registry

```typescript
// src/lib/auth/provider-registry.ts
class ProviderRegistry {
  private providers = new Map<string, AuthProvider>();

  register(provider: AuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): AuthProvider | undefined {
    return this.providers.get(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const registry = new ProviderRegistry();
```

## Provider Factory

```typescript
// src/lib/auth/provider-factory.ts
import { registry } from './provider-registry';

export class ProviderFactory {
  static create(name: string): AuthProvider {
    const provider = registry.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }

  static listProviders(): string[] {
    return registry.list();
  }
}
```

## Provider Self-Registration

```typescript
// src/lib/auth/providers/google.ts
import { registry } from '../provider-registry';
import type { AuthProvider } from '../types';

export class GoogleAuthProvider implements AuthProvider {
  name = "google";
  // ... implementation

  static register() {
    registry.register(new GoogleAuthProvider());
  }
}

// Auto-register on import
GoogleAuthProvider.register();
```

```typescript
// src/lib/auth/providers/github.ts
import { registry } from '../provider-registry';
import type { AuthProvider } from '../types';

export class GitHubAuthProvider implements AuthProvider {
  name = "github";
  // ... implementation

  static register() {
    registry.register(new GitHubAuthProvider());
  }
}

// Auto-register on import
GitHubAuthProvider.register();
```

## Usage in AuthManager

```typescript
// src/lib/auth/manager.ts
import { ProviderFactory } from './provider-factory';
import type { AuthConfig } from './config';

export class AuthManager {
  private provider: AuthProvider;

  constructor(config: AuthConfig) {
    // No switch statement needed!
    this.provider = ProviderFactory.create(config.provider);
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
  }

  async signIn(): Promise<AuthUser> {
    return this.provider.signIn();
  }

  // ... other methods delegate to provider
}
```

## Adding a New Provider

To add a new provider (e.g., Microsoft):

1. Create the provider class:
```typescript
// src/lib/auth/providers/microsoft.ts
import { registry } from '../provider-registry';
import type { AuthProvider } from '../types';

export class MicrosoftAuthProvider implements AuthProvider {
  name = "microsoft";
  // ... implementation

  static register() {
    registry.register(new MicrosoftAuthProvider());
  }
}

MicrosoftAuthProvider.register();
```

2. Import it in the auth index:
```typescript
// src/lib/auth/index.ts
import './providers/microsoft';
```

3. Configure it in environment:
```bash
AUTH_PROVIDER=microsoft
```

**No changes needed to AuthManager!**

## Benefits

1. **Zero changes to AuthManager:** Adding a provider requires no modification to existing code
2. **Self-registration:** Providers register themselves on import
3. **Dynamic discovery:** Can list available providers at runtime
4. **Testable:** Easy to mock providers for testing
5. **Extensible:** Third-party providers can be added as separate packages

## Testing

```typescript
// src/lib/auth/providers/mock.ts
import { registry } from '../provider-registry';
import type { AuthProvider } from '../types';

export class MockAuthProvider implements AuthProvider {
  name = "mock";
  // ... mock implementation

  static register() {
    registry.register(new MockAuthProvider());
  }
}

MockAuthProvider.register();
```

```typescript
// test config
AUTH_PROVIDER=mock
```

## Configuration

```typescript
// src/lib/auth/config.ts
export interface AuthConfig {
  provider: string; // "google", "github", "microsoft", "mock", etc.
  session: {
    secret: string;
    cookieName: string;
    maxAge: number;
  };
  providers: {
    [key: string]: any; // Provider-specific config
  };
}
```

## Future Extensions

1. **Plugin System:** Load providers from external packages
2. **Dynamic Loading:** Load providers on-demand
3. **Provider Health:** Monitor provider availability
4. **Provider Fallback:** Automatic fallback to backup provider
