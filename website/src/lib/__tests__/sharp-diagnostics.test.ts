import { runSharpDiagnostics, type SharpStage } from '../sharp-diagnostics';

function sharpFixture(failedStage?: SharpStage) {
  const sharp = (source: Buffer) => {
    expect(source.length).toBeGreaterThan(0);
    let operation: SharpStage = 'decode';
    return {
      metadata: async () => {
        if (failedStage === 'metadata') throw new Error('C:\\private\\path\\sharp.node');
        return { width: 1, height: 1, format: 'png' };
      },
      raw() { operation = 'decode'; return this; },
      resize() { operation = 'transform'; return this; },
      webp() { operation = 'webp'; return this; },
      avif() { operation = 'avif'; return this; },
      async toBuffer() {
        if (failedStage === operation) throw new Error('secret path or native stack');
        return Buffer.from([1, 2, 3]);
      },
    };
  };
  Object.assign(sharp, { versions: { vips: 'test-vips' } });
  return sharp;
}

describe('Sharp diagnostics behavior', () => {
  it('runs the required native image operations with the installed Sharp runtime', async () => {
    const result = await runSharpDiagnostics();
    expect(result.stages).toMatchObject({
      moduleImport: { status: 'passed' }, metadata: { status: 'passed' }, decode: { status: 'passed' },
      transform: { status: 'passed' }, webp: { status: 'passed' }, avif: { status: 'passed' },
    });
    expect(result.success).toBe(true);
    expect(Object.values(result.stages).every(stage => stage.status === 'passed')).toBe(true);
  });

  it('fails safely when the native module cannot be imported', async () => {
    const result = await runSharpDiagnostics(() => { throw new Error('C:\\private\\sharp.node'); });
    expect(result.success).toBe(false);
    expect(result.stages).toMatchObject({
      moduleImport: { status: 'failed', errorCode: 'SHARP_IMPORT_FAILED' },
      metadata: { status: 'skipped' },
    });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('fails closed when the JavaScript wrapper loads without its native libvips binding', async () => {
    const wrapper = Object.assign(() => ({}), { versions: {} });
    const result = await runSharpDiagnostics(() => wrapper);
    expect(result.success).toBe(false);
    expect(result.stages.moduleImport).toEqual({ status: 'failed', errorCode: 'SHARP_IMPORT_FAILED' });
    expect(result.stages.metadata.status).toBe('skipped');
  });

  it('reports every required capability as passed before returning success', async () => {
    const result = await runSharpDiagnostics(() => sharpFixture());
    expect(result).toEqual({
      success: true,
      stages: {
        moduleImport: { status: 'passed' }, metadata: { status: 'passed' }, decode: { status: 'passed' },
        transform: { status: 'passed' }, webp: { status: 'passed' }, avif: { status: 'passed' },
      },
    });
  });

  it.each([
    ['metadata', 'SHARP_METADATA_FAILED'],
    ['decode', 'SHARP_DECODE_FAILED'],
    ['transform', 'SHARP_TRANSFORM_FAILED'],
    ['webp', 'SHARP_WEBP_FAILED'],
    ['avif', 'SHARP_AVIF_FAILED'],
  ] as const)('fails the overall check when %s fails and omits native exception text', async (stage, errorCode) => {
    const result = await runSharpDiagnostics(() => sharpFixture(stage));
    expect(result.success).toBe(false);
    expect(result.stages[stage]).toEqual({ status: 'failed', errorCode });
    expect(JSON.stringify(result)).not.toContain('secret path');
  });
});
