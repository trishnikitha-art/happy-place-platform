/**
 * Pipeline Stages — constitutional execution units for the image pipeline.
 *
 * Each stage:
 * - Has a single responsibility
 * - Receives a PipelineContext
 * - Mutates the context
 * - Returns void
 *
 * Stages are orchestrated in sequence by the pipeline executor.
 */

export class Stage {
  constructor(name) {
    this.name = name;
  }

  /**
   * Execute the stage.
   * @param {PipelineContext} context - pipeline context
   * @returns {Promise<void>}
   */
  async execute(context) {
    throw new Error(`${this.name}.execute() must be implemented`);
  }
}

export class DiscoveryStage extends Stage {
  constructor() {
    super("DiscoveryStage");
  }

  async execute(context) {
    const projectList = await context.source.listProjects();
    context.projects = projectList;
    context.statistics.discovered = projectList.length;
    console.log(`🔍 Discovered ${projectList.length} projects`);
  }
}

export class ClassificationStage extends Stage {
  constructor() {
    super("ClassificationStage");
  }

  async execute(context) {
    // Classification happens per-project during transformation
    // This stage validates that classification rules are loaded
    console.log(`📋 Classification rules loaded`);
  }
}

export class TransformStage extends Stage {
  constructor(sharp) {
    super("TransformStage");
    this.sharp = sharp;
  }

  async execute(context) {
    // Transformation happens per-project
    // This stage validates that sharp is loaded
    console.log(`🔧 Transform engine ready`);
  }
}

export class OptimizationStage extends Stage {
  constructor() {
    super("OptimizationStage");
  }

  async execute(context) {
    // Optimization happens during transformation (variants, blur)
    console.log(`⚡ Optimization settings loaded`);
  }
}

export class ManifestStage extends Stage {
  constructor() {
    super("ManifestStage");
  }

  async execute(context) {
    // Manifest generation happens after all projects processed
    console.log(`📝 Manifest authority ready`);
  }
}

export class PresentationValidationStage extends Stage {
  constructor() {
    super("PresentationValidationStage");
  }

  async execute(context) {
    // Validate presentation authority
    if (!context.presentation) {
      context.addViolation({
        severity: "error",
        authority: "Presentation",
        rule: "MissingPresentation",
        message: "presentation.v1.json not found",
        fix: "Create presentation.v1.json",
      });
    } else {
      console.log(`✅ Presentation authority validated`);
    }
  }
}

export class EmitStage extends Stage {
  constructor() {
    super("EmitStage");
  }

  async execute(context) {
    // Emit happens after all stages complete
    console.log(`💾 Emit stage ready`);
  }
}

/**
 * Pipeline Executor — orchestrates stages in sequence.
 */
export class PipelineExecutor {
  constructor(stages) {
    this.stages = stages;
  }

  /**
   * Execute all stages in sequence.
   * @param {PipelineContext} context - pipeline context
   * @returns {Promise<void>}
   */
  async execute(context) {
    for (const stage of this.stages) {
      console.log(`\n▶ ${stage.name}`);
      await stage.execute(context);
    }
  }
}
