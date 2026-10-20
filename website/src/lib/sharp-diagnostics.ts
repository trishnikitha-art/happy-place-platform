const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWO4U2Fzp8KGAUIBAC5OBkGYIavGAAAAAElFTkSuQmCC',
  'base64',
);

export type SharpStage = 'moduleImport' | 'metadata' | 'decode' | 'transform' | 'webp' | 'avif';
export type SharpStageResult = { status: 'passed' | 'failed' | 'skipped'; errorCode?: string };
export interface SharpDiagnosticResult {
  success: boolean;
  stages: Record<SharpStage, SharpStageResult>;
}

type SharpLoader = () => any;

/** Run deterministic, sanitized runtime checks for the native image pipeline. */
export async function runSharpDiagnostics(loadSharp: SharpLoader = () => require('sharp')): Promise<SharpDiagnosticResult> {
  const stages: Record<SharpStage, SharpStageResult> = {
    moduleImport: { status: 'failed', errorCode: 'SHARP_IMPORT_FAILED' },
    metadata: { status: 'skipped' },
    decode: { status: 'skipped' },
    transform: { status: 'skipped' },
    webp: { status: 'skipped' },
    avif: { status: 'skipped' },
  };

  let sharp: any;
  try {
    sharp = loadSharp();
    // The vips version is populated by Sharp's native binding; checking the
    // JS wrapper alone could report healthy while the native runtime is absent.
    if (typeof sharp !== 'function' || typeof sharp.versions?.vips !== 'string') {
      throw new Error('Sharp native runtime unavailable');
    }
    stages.moduleImport = { status: 'passed' };
  } catch {
    return { success: false, stages };
  }

  const run = async (stage: Exclude<SharpStage, 'moduleImport'>, operation: () => Promise<unknown>, errorCode: string) => {
    try {
      const output = await operation();
      if (output instanceof Buffer && output.length === 0) throw new Error('Empty image output');
      stages[stage] = { status: 'passed' };
    } catch {
      // Native exceptions can include paths and runtime details. Only stable
      // error codes leave this helper.
      stages[stage] = { status: 'failed', errorCode };
    }
  };

  await run('metadata', async () => {
    const metadata = await sharp(FIXTURE_PNG).metadata();
    if (!metadata?.width || !metadata?.height || metadata.format !== 'png') throw new Error('Invalid metadata');
  }, 'SHARP_METADATA_FAILED');
  await run('decode', async () => sharp(FIXTURE_PNG).raw().toBuffer(), 'SHARP_DECODE_FAILED');
  await run('transform', async () => sharp(FIXTURE_PNG).resize(2, 2).toBuffer(), 'SHARP_TRANSFORM_FAILED');
  await run('webp', async () => sharp(FIXTURE_PNG).webp().toBuffer(), 'SHARP_WEBP_FAILED');
  await run('avif', async () => sharp(FIXTURE_PNG).avif().toBuffer(), 'SHARP_AVIF_FAILED');

  const success = Object.values(stages).every(stage => stage.status === 'passed');
  return { success, stages };
}
