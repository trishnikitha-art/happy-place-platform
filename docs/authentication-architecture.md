# Provider-Agnostic Authentication Architecture

## Overview

The authentication system is designed to be provider-agnostic, allowing the platform to swap authentication providers (Google, Microsoft, Auth0, etc.) through configuration only. This enables ownership transfer without code changes and supports future platform expansion.

## Architecture Principles

1. **Configuration-Driven:** All provider-specific details live in environment variables
2. **Interface-Based:** Common authentication interface abstracts provider differences
3. **Swappable:** Providers can be swapped without code changes
4. **Transferable:** Credentials can be changed for ownership transfer
5. **Minimal Coupling:** No provider-specific code in business logic

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

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  metadata?: Record<string, unknown>;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
```

## Configuration Structure

### Environment Variables

```bash
# Authentication Provider Selection
AUTH_PROVIDER=google  # google, microsoft, auth0, custom

# Google OAuth (if AUTH_PROVIDER=google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Microsoft OAuth (if AUTH_PROVIDER=microsoft)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# Auth0 (if AUTH_PROVIDER=auth0)
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Custom Provider (if AUTH_PROVIDER=custom)
CUSTOM_AUTH_URL=
CUSTOM_CLIENT_ID=
CUSTOM_CLIENT_SECRET=

# Session Configuration
SESSION_SECRET=
SESSION_COOKIE_NAME=
SESSION_MAX_AGE=604800  # 7 days in seconds
```

### Configuration Schema

```typescript
interface AuthConfig {
  provider: "google" | "microsoft" | "auth0" | "custom";
  session: {
    secret: string;
    cookieName: string;
    maxAge: number;
  };
  providers: {
    google?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    microsoft?: {
      clientId: string;
      clientSecret: string;
      tenantId: string;
    };
    auth0?: {
      domain: string;
      clientId: string;
      clientSecret: string;
    };
    custom?: {
      authUrl: string;
      clientId: string;
      clientSecret: string;
    };
  };
}
```

## Provider Implementations

### Google OAuth Provider

```typescript
// src/lib/auth/providers/google.ts
import { OAuth2Client } from 'google-auth-library';

export class GoogleAuthProvider implements AuthProvider {
  name = "google";
  private client: OAuth2Client;

  constructor(config: { clientId: string; clientSecret: string; redirectUri: string }) {
    this.client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });
  }

  async initialize(): Promise<void> {
    // Initialize Google OAuth client
  }

  async signIn(): Promise<AuthUser> {
    // Implement Google OAuth flow
  }

  async signOut(): Promise<void> {
    // Revoke Google token
  }

  async getSession(): Promise<AuthSession | null> {
    // Get current session from cookies/storage
  }

  async refreshToken(): Promise<AuthSession> {
    // Refresh Google access token
  }

  async getUser(): Promise<AuthUser | null> {
    // Get current user from Google
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    // Set up Google auth state listener
    return () => {}; // Cleanup function
  }
}
```

### Microsoft OAuth Provider

```typescript
// src/lib/auth/providers/microsoft.ts
export class MicrosoftAuthProvider implements AuthProvider {
  name = "microsoft";
  // Similar implementation to Google but using Microsoft Identity Platform
}
```

### Auth0 Provider

```typescript
// src/lib/auth/providers/auth0.ts
export class Auth0AuthProvider implements AuthProvider {
  name = "auth0";
  // Similar implementation using Auth0 SDK
}
```

## Auth Manager

```typescript
// src/lib/auth/manager.ts
import { AuthProvider } from './types';
import { GoogleAuthProvider } from './providers/google';
import { MicrosoftAuthProvider } from './providers/microsoft';
import { Auth0AuthProvider } from './providers/auth0';

export class AuthManager {
  private provider: AuthProvider;

  constructor(config: AuthConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: AuthConfig): AuthProvider {
    switch (config.provider) {
      case 'google':
        if (!config.providers.google) {
          throw new Error('Google provider config missing');
        }
        return new GoogleAuthProvider(config.providers.google);
      case 'microsoft':
        if (!config.providers.microsoft) {
          throw new Error('Microsoft provider config missing');
        }
        return new MicrosoftAuthProvider(config.providers.microsoft);
      case 'auth0':
        if (!config.providers.auth0) {
          throw new Error('Auth0 provider config missing');
        }
        return new Auth0AuthProvider(config.providers.auth0);
      default:
        throw new Error(`Unsupported auth provider: ${config.provider}`);
    }
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
  }

  async signIn(): Promise<AuthUser> {
    return this.provider.signIn();
  }

  async signOut(): Promise<void> {
    return this.provider.signOut();
  }

  async getSession(): Promise<AuthSession | null> {
    return this.provider.getSession();
  }

  async refreshToken(): Promise<AuthSession> {
    return this.provider.refreshToken();
  }

  async getUser(): Promise<AuthUser | null> {
    return this.provider.getUser();
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return this.provider.onAuthStateChange(callback);
  }
}
```

## Usage in Application

```typescript
// src/lib/auth/index.ts
import { AuthManager } from './manager';
import { loadAuthConfig } from './config';

// Singleton instance
let authManager: AuthManager | null = null;

export function getAuthManager(): AuthManager {
  if (!authManager) {
    const config = loadAuthConfig();
    authManager = new AuthManager(config);
  }
  return authManager;
}
```

```typescript
// Example usage in a component
import { getAuthManager } from '@/lib/auth';

export default function LoginPage() {
  const auth = getAuthManager();

  const handleSignIn = async () => {
    const user = await auth.signIn();
    // Handle signed-in user
  };

  const handleSignOut = async () => {
    await auth.signOut();
    // Handle sign-out
  };

  return (
    <button onClick={handleSignIn}>Sign In</button>
  );
}
```

## Ownership Transfer Process

### Step 1: Developer Credentials (Current)

```bash
AUTH_PROVIDER=google
GOOGLE_CLIENT_ID=developer-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=developer-secret
```

### Step 2: Client Credentials (After Transfer)

```bash
AUTH_PROVIDER=google
GOOGLE_CLIENT_ID=client-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=client-secret
```

**No code changes required.** Only environment variables are updated.

## Google-Specific Integrations

### Google Workspace vs. Individual Google Account

The platform should prefer individual Google OAuth over Google Workspace where possible to avoid requiring the client to pay for Google Workspace.

**Preferred:**
- Google OAuth (individual account)
- Google Business Profile (free)
- Gmail API (if using Gmail, can use individual account)

**Only require Google Workspace when:**
- Custom domain email is required by client
- Google Workspace-specific features are needed

### Provider Abstraction for Google Services

```typescript
// src/lib/integrations/google/base.ts
export interface GoogleServiceConfig {
  provider: "oauth" | "workspace";
  credentials: {
    clientId?: string;
    clientSecret?: string;
    serviceAccountKey?: string;
  };
}

export class GoogleServiceManager {
  private config: GoogleServiceConfig;

  constructor(config: GoogleServiceConfig) {
    this.config = config;
  }

  getClient(): GoogleAuth {
    if (this.config.provider === "workspace") {
      return this.getServiceAccountClient();
    } else {
      return this.getOAuthClient();
    }
  }

  private getOAuthClient(): GoogleAuth {
    // Use OAuth credentials
  }

  private getServiceAccountClient(): GoogleAuth {
    // Use service account key
  }
}
```

## Security Considerations

1. **Credential Storage:** All credentials stored in environment variables, never in code
2. **Secret Rotation:** Support for credential rotation without downtime
3. **Token Security:** Secure storage of access tokens (httpOnly cookies)
4. **CSRF Protection:** Implement CSRF tokens for OAuth flows
5. **PKCE:** Use PKCE for OAuth flows where supported
6. **Token Expiration:** Automatic token refresh before expiration

## Testing Strategy

### Mock Provider for Testing

```typescript
// src/lib/auth/providers/mock.ts
export class MockAuthProvider implements AuthProvider {
  name = "mock";
  private mockUser: AuthUser | null = null;

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async signIn(): Promise<AuthUser> {
    this.mockUser = {
      id: "test-user",
      email: "test@example.com",
      name: "Test User",
      provider: "mock",
    };
    return this.mockUser;
  }

  async signOut(): Promise<void> {
    this.mockUser = null;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.mockUser ? {
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
      expiresAt: Date.now() + 3600000,
    } : null;
  }

  async refreshToken(): Promise<AuthSession> {
    return this.getSession()!;
  }

  async getUser(): Promise<AuthUser | null> {
    return this.mockUser;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return () => {};
  }
}
```

### Test Configuration

```bash
# .env.test
AUTH_PROVIDER=mock
SESSION_SECRET=test-secret
```

## Migration Path

### From Current Implementation

1. Extract current authentication logic into provider interface
2. Create Google provider implementation
3. Update configuration to use new system
4. Test with mock provider
5. Deploy with Google provider
6. Remove legacy authentication code

### To New Provider

1. Implement new provider class
2. Add provider to AuthManager factory
3. Update environment variables
4. Deploy
5. Remove old provider (optional)

## Future Extensions

### Additional Providers

- **Email/Password:** Traditional authentication
- **SAML:** Enterprise SSO
- **Magic Link:** Passwordless authentication
- **Multi-factor:** 2FA/MFA support

### Provider Features

- **Social Login:** Facebook, Twitter, GitHub
- **Enterprise:** Okta, OneLogin
- **Custom:** Custom OAuth 2.0 / OpenID Connect providers

## Documentation Requirements

1. **Setup Guide:** How to configure each provider
2. **Transfer Guide:** Step-by-step ownership transfer
3. **Troubleshooting:** Common issues and solutions
4. **Security Best Practices:** Credential management
5. **API Reference:** Provider interface documentation
