/**
 * Constitutional Validators for Image QA
 *
 * Each validator is an independent authority that checks a specific constitutional rule.
 * Validators return structured Violation objects instead of procedural fail() calls.
 *
 * This enables:
 * - CI/CD integration with structured output
 * - GitHub annotations
 * - VSCode diagnostics
 * - Future dashboard visualization
 */

/**
 * @typedef {Object} Violation
 * @property {string} severity - "error" | "warning"
 * @property {string} authority - "Presentation" | "Manifest" | "Gallery" | "Pipeline"
 * @property {string} rule - e.g. "DuplicateRole", "MissingHero"
 * @property {string} [image] - stableId or id of affected image
 * @property {string} message - human-readable description
 * @property {string} [fix] - suggested remediation
 */

export class Validator {
  constructor(name, authority) {
    this.name = name;
    this.authority = authority;
  }

  /**
   * Validate the given context and return violations.
   * @param {Object} context - validation context with authorities
   * @returns {Promise<Violation[]>}
   */
  async validate(context) {
    throw new Error(`${this.name}.validate() must be implemented`);
  }
}

export class DuplicateRoleValidator extends Validator {
  constructor() {
    super("DuplicateRoleValidator", "Presentation");
  }

  async validate(context) {
    const violations = [];
    const presentation = context.presentation;
    if (!presentation?.photoRoles) return violations;

    const roleIds = new Map();
    for (const role of presentation.photoRoles) {
      if (roleIds.has(role.id)) {
        violations.push({
          severity: "error",
          authority: this.authority,
          rule: "DuplicateRole",
          image: role.id,
          message: `Duplicate role id in presentation: ${role.id}`,
          fix: "Remove duplicate entry from presentation.v1.json photoRoles array",
        });
      }
      roleIds.set(role.id, true);
    }
    return violations;
  }
}

export class DuplicateStableIdValidator extends Validator {
  constructor() {
    super("DuplicateStableIdValidator", "Manifest");
  }

  async validate(context) {
    const violations = [];
    const manifestAssets = context.manifestAssets;
    if (!manifestAssets?.length) return violations;

    const stableIds = new Map();
    for (const asset of manifestAssets) {
      if (asset.stableId && stableIds.has(asset.stableId)) {
        violations.push({
          severity: "error",
          authority: this.authority,
          rule: "DuplicateStableId",
          image: asset.stableId,
          message: `Duplicate stableId in manifest: ${asset.stableId}`,
          fix: "Investigate content hash collision or regenerate stable IDs",
        });
      }
      if (asset.stableId) stableIds.set(asset.stableId, true);
    }
    return violations;
  }
}

export class DuplicateHashValidator extends Validator {
  constructor() {
    super("DuplicateHashValidator", "Manifest");
  }

  async validate(context) {
    const violations = [];
    const manifestAssets = context.manifestAssets;
    if (!manifestAssets?.length) return violations;

    const hashes = new Map();
    for (const asset of manifestAssets) {
      if (hashes.has(asset.contentHash)) {
        violations.push({
          severity: "error",
          authority: this.authority,
          rule: "DuplicateHash",
          image: asset.id,
          message: `Duplicate contentHash in manifest: ${asset.contentHash.substring(0, 16)}...`,
          fix: "Review duplicate images - consider deduplication",
        });
      }
      hashes.set(asset.contentHash, asset.id);
    }
    return violations;
  }
}

export class MissingHeroValidator extends Validator {
  constructor() {
    super("MissingHeroValidator", "Presentation");
  }

  async validate(context) {
    const violations = [];
    const presentation = context.presentation;
    if (!presentation?.photoRoles) return violations;

    const hasHero = presentation.photoRoles.some(r => r.roles && r.roles.includes("HeroBackground"));
    if (!hasHero) {
      violations.push({
        severity: "error",
        authority: this.authority,
        rule: "MissingHero",
        message: "Missing HeroBackground role in presentation",
        fix: "Add a photo with HeroBackground role to presentation.v1.json photoRoles",
      });
    }
    return violations;
  }
}

export class MissingOwnerValidator extends Validator {
  constructor() {
    super("MissingOwnerValidator", "Presentation");
  }

  async validate(context) {
    const violations = [];
    const presentation = context.presentation;
    if (!presentation?.photoRoles) return violations;

    const hasOwner = presentation.photoRoles.some(r => r.roles && (r.roles.includes("OwnerPortrait") || r.roles.includes("AboutPortrait")));
    if (!hasOwner) {
      violations.push({
        severity: "error",
        authority: this.authority,
        rule: "MissingOwner",
        message: "Missing OwnerPortrait or AboutPortrait role in presentation",
        fix: "Add a photo with OwnerPortrait or AboutPortrait role to presentation.v1.json photoRoles",
      });
    }
    return violations;
  }
}

export class OrphanAssetValidator extends Validator {
  constructor() {
    super("OrphanAssetValidator", "Manifest");
  }

  async validate(context) {
    const violations = [];
    const presentation = context.presentation;
    const manifestAssets = context.manifestAssets;
    if (!presentation?.photoRoles || !manifestAssets?.length) return violations;

    const presentationIds = new Set(presentation.photoRoles.map(r => r.id));
    const manifestIds = new Set(manifestAssets.map(a => a.id));
    
    for (const id of manifestIds) {
      if (!presentationIds.has(id)) {
        violations.push({
          severity: "warning",
          authority: this.authority,
          rule: "OrphanAsset",
          image: id,
          message: `Orphan asset in manifest with no presentation role: ${id}`,
          fix: "Add role in presentation.v1.json or remove from manifest",
        });
      }
    }
    return violations;
  }
}

export class StalePresentationValidator extends Validator {
  constructor() {
    super("StalePresentationValidator", "Presentation");
  }

  async validate(context) {
    const violations = [];
    const presentation = context.presentation;
    const manifestAssets = context.manifestAssets;
    if (!presentation || !manifestAssets?.length) return violations;

    const manifestIds = new Set(manifestAssets.map(a => a.id));
    
    for (const role of (presentation.photoRoles || [])) {
      if (!manifestIds.has(role.id)) {
        violations.push({
          severity: "error",
          authority: this.authority,
          rule: "StaleReference",
          image: role.id,
          message: `Stale presentation reference: ${role.id} not in manifest`,
          fix: "Update presentation.v1.json to reference existing manifest assets",
        });
      }
    }
    for (const id of (presentation.homepageCuration || [])) {
      if (!manifestIds.has(id)) {
        violations.push({
          severity: "error",
          authority: this.authority,
          rule: "StaleReference",
          image: id,
          message: `Stale homepageCuration reference: ${id} not in manifest`,
          fix: "Update presentation.v1.json homepageCuration",
        });
      }
    }
    if (presentation.featuredTransformationId && !manifestIds.has(presentation.featuredTransformationId)) {
      violations.push({
        severity: "error",
        authority: this.authority,
        rule: "StaleReference",
        image: presentation.featuredTransformationId,
        message: `Stale featuredTransformationId reference: ${presentation.featuredTransformationId} not in manifest`,
        fix: "Update presentation.v1.json featuredTransformationId",
      });
    }
    return violations;
  }
}

export class StaleManifestValidator extends Validator {
  constructor() {
    super("StaleManifestValidator", "Manifest");
  }

  async validate(context) {
    const violations = [];
    const manifestAssets = context.manifestAssets;
    if (!manifestAssets?.length || !manifestAssets[0]?.createdAt) return violations;

    const manifestAge = Date.now() - new Date(manifestAssets[0].createdAt).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (manifestAge > thirtyDays) {
      violations.push({
        severity: "warning",
        authority: this.authority,
        rule: "StaleManifest",
        message: `Manifest is stale (${Math.floor(manifestAge / (24 * 60 * 60 * 1000))} days old)`,
        fix: "Run npm run images to regenerate manifest",
      });
    }
    return violations;
  }
}

export class MissingServiceCoverValidator extends Validator {
  constructor() {
    super("MissingServiceCoverValidator", "Presentation");
  }

  async validate(context) {
    const violations = [];
    const presentation = context.presentation;
    if (!presentation?.serviceCover) return violations;

    const requiredServices = ["decks", "fences", "pergolas", "kitchen-remodel", "bath-remodel", "built-ins", "outdoor-living", "repairs"];
    for (const service of requiredServices) {
      if (!presentation.serviceCover[service]) {
        violations.push({
          severity: "error",
          authority: this.authority,
          rule: "MissingServiceCover",
          message: `Missing service cover for: ${service}`,
          fix: `Add ${service} to presentation.v1.json serviceCover mapping`,
        });
      }
    }
    return violations;
  }
}

export class MissingTransformationValidator extends Validator {
  constructor() {
    super("MissingTransformationValidator", "Presentation");
  }

  async validate(context) {
    const violations = [];
    const presentation = context.presentation;
    const manifestAssets = context.manifestAssets;
    if (!presentation?.featuredTransformationId || !manifestAssets?.length) return violations;

    const manifestIds = new Set(manifestAssets.map(a => a.id));
    if (!manifestIds.has(presentation.featuredTransformationId)) {
      violations.push({
        severity: "error",
        authority: this.authority,
        rule: "MissingTransformation",
        image: presentation.featuredTransformationId,
        message: `Featured transformation not in manifest: ${presentation.featuredTransformationId}`,
        fix: "Update presentation.v1.json featuredTransformationId to reference existing asset",
      });
    }
    return violations;
  }
}

export class DirectImportValidator extends Validator {
  constructor() {
    super("DirectImportValidator", "Constitutional");
  }

  async validate(context) {
    const violations = [];
    const { readFileSync, readdirSync } = await import("node:fs");
    const { join, resolve } = await import("node:path");
    
    const root = resolve(process.cwd());
    const srcDir = join(root, "src");
    
    // Files allowed to import constitutional authorities
    const allowedFiles = [
      "lib/media.ts",
      "lib/presentation-authority.ts",
    ];
    
    // Patterns that indicate direct imports
    const forbiddenPatterns = [
      /from\s+["'].*gallery\.json["']/,
      /from\s+["'].*presentation\.v1\.json["']/,
      /from\s+["'].*manifest\.v1\.json["']/,
      /import\s+.*gallery\.json/,
      /import\s+.*presentation\.v1\.json/,
      /import\s+.*manifest\.v1\.json/,
    ];
    
    function walkDir(dir, acc = []) {
      if (!readdirSync(dir).length) return acc;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walkDir(p, acc);
        else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) acc.push(p);
      }
      return acc;
    }
    
    const files = walkDir(srcDir);
    
    for (const file of files) {
      const relativePath = file.replace(srcDir, "").replace(/\\/g, "/").substring(1);
      
      // Skip allowed files
      if (allowedFiles.some(allowed => relativePath.includes(allowed))) continue;
      
      const content = readFileSync(file, "utf8");
      
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push({
            severity: "error",
            authority: this.authority,
            rule: "DirectImport",
            message: `Direct import of constitutional authority in ${relativePath}`,
            fix: "Use media.ts functions instead of importing gallery.json/presentation.v1.json/manifest.v1.json directly",
          });
          break; // Only report once per file
        }
      }
    }
    
    return violations;
  }
}

/**
 * Run all validators and collect violations.
 * @param {Object} context - validation context
 * @returns {Promise<Violation[]>}
 */
export async function runValidators(context) {
  const validators = [
    new DuplicateRoleValidator(),
    new DuplicateStableIdValidator(),
    new DuplicateHashValidator(),
    new MissingHeroValidator(),
    new MissingOwnerValidator(),
    new OrphanAssetValidator(),
    new StalePresentationValidator(),
    new StaleManifestValidator(),
    new MissingServiceCoverValidator(),
    new MissingTransformationValidator(),
    new DirectImportValidator(),
  ];

  const allViolations = [];
  for (const validator of validators) {
    const violations = await validator.validate(context);
    allViolations.push(...violations);
  }
  return allViolations;
}
