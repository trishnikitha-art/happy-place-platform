import { GET as getDiagnostic } from '@/app/api/diagnostics/sharp/route';
import { GET as getAdminHealth } from '@/app/api/admin/sharp-health/route';
import { runSharpDiagnostics, type SharpDiagnosticResult } from '@/lib/sharp-diagnostics';
import { workbenchSession } from '@/lib/workbench-session';

jest.mock('@/lib/sharp-diagnostics', () => ({ runSharpDiagnostics: jest.fn() }));
jest.mock('@/lib/workbench-session', () => ({ workbenchSession: { isAuthenticated: jest.fn() } }));

const success: SharpDiagnosticResult = {
  success: true,
  stages: {
    moduleImport: { status: 'passed' }, metadata: { status: 'passed' }, decode: { status: 'passed' },
    transform: { status: 'passed' }, webp: { status: 'passed' }, avif: { status: 'passed' },
  },
};

describe('protected Sharp diagnostic routes', () => {
  const previousSecret = process.env.DIAGNOSTIC_SECRET;
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.DIAGNOSTIC_SECRET = 'long-test-only-diagnostic-secret';
    jest.mocked(runSharpDiagnostics).mockResolvedValue(success);
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);
  });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.DIAGNOSTIC_SECRET;
    else process.env.DIAGNOSTIC_SECRET = previousSecret;
  });

  it('fails closed with a sanitized 503 when DIAGNOSTIC_SECRET is missing', async () => {
    delete process.env.DIAGNOSTIC_SECRET;
    const response = await getDiagnostic(new Request('https://test.invalid/api/diagnostics/sharp'));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, error: 'DIAGNOSTIC_NOT_CONFIGURED' });
    expect(runSharpDiagnostics).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer credential without running Sharp', async () => {
    const response = await getDiagnostic(new Request('https://test.invalid/api/diagnostics/sharp', {
      headers: { authorization: 'Bearer wrong-secret' },
    }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: 'UNAUTHORIZED' });
    expect(runSharpDiagnostics).not.toHaveBeenCalled();
  });

  it('reports success only after every Sharp capability passes', async () => {
    const response = await getDiagnostic(new Request('https://test.invalid/api/diagnostics/sharp', {
      headers: { authorization: `Bearer ${process.env.DIAGNOSTIC_SECRET}` },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, diagnostics: success });
  });

  it('returns 503 and success=false when any required capability fails', async () => {
    jest.mocked(runSharpDiagnostics).mockResolvedValue({
      success: false,
      stages: { ...success.stages, avif: { status: 'failed', errorCode: 'SHARP_AVIF_FAILED' } },
    });
    const response = await getDiagnostic(new Request('https://test.invalid/api/diagnostics/sharp', {
      headers: { authorization: `Bearer ${process.env.DIAGNOSTIC_SECRET}` },
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, diagnostics: { stages: { avif: { status: 'failed' } } } });
  });

  it('requires Workbench authentication for the admin health endpoint', async () => {
    jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
    const response = await getAdminHealth();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: 'UNAUTHORIZED' });
    expect(runSharpDiagnostics).not.toHaveBeenCalled();
  });

  it('uses the same truthful capability result for an authenticated Workbench user', async () => {
    const failed = { ...success, success: false };
    jest.mocked(runSharpDiagnostics).mockResolvedValue(failed);
    const response = await getAdminHealth();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, diagnostics: failed });
  });
});
