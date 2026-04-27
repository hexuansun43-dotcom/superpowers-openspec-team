import { z } from 'zod';

// Frontmatter schema for SKILL.md
export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  'argument-hint': z.string().optional(),
  type: z.enum(['orchestrator', 'workflow']).optional(),
  standalone: z.boolean().optional(),
  triggers: z.array(z.string()).optional(),
  dependencies: z
    .object({
      workflows: z.array(z.string()).optional(),
      external_skills: z.array(z.string()).optional(),
    })
    .optional(),
  outputs: z.array(z.string()).optional(),
  // P0: Progressive loading fields
  model_hint: z.enum(['haiku', 'sonnet', 'opus']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.enum(['engineering', 'orchestration', 'learning', 'writing', 'research', 'planning', 'review', 'debugging']).optional(),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

// Skill index entry for skill-index.json
export interface SkillIndexEntry {
  name: string;
  description: string;
  'argument-hint'?: string;
  type: 'orchestrator' | 'workflow';
  triggers?: string[];
  model_hint?: 'haiku' | 'sonnet' | 'opus';
  tags?: string[];
  category?: 'engineering' | 'orchestration' | 'learning' | 'writing' | 'research' | 'planning' | 'review' | 'debugging';
  phases?: Phase[];
  skill_path: string;
}

// Phase definition for workflow phases
export const PhaseSchema = z.object({
  name: z.string(),
  model_hint: z.enum(['haiku', 'sonnet', 'opus']).optional().default('sonnet'),
});

export type Phase = z.infer<typeof PhaseSchema>;

// Workflow.yaml schema
export const WorkflowMetaSchema = z.object({
  name: z.string(),
  type: z.enum(['orchestrator', 'workflow']),
  standalone: z.boolean(),
  description: z.string(),
  model_hint: z.enum(['haiku', 'sonnet', 'opus']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.enum(['engineering', 'orchestration', 'learning', 'writing', 'research', 'planning', 'review', 'debugging']).optional(),
  version: z.string().optional(),
  tool_support: z.array(z.string()).optional(),
  activation: z
    .object({
      mode: z.enum(['explicit-only', 'auto']),
      triggers: z.array(z.string()).optional(),
    })
    .optional(),
  dependencies: z
    .object({
      workflows: z.array(z.string()).optional(),
      external_skills: z.array(z.string()).optional(),
    })
    .optional(),
  outputs: z.array(z.string()).optional(),
  phases: z.array(PhaseSchema).optional(),
  optional_features: z
    .record(
      z.string(),
      z.object({
        description: z.string().optional(),
        roles: z.array(z.string()).optional(),
        parallel_phases: z.array(z.string()).optional(),
      })
    )
    .optional(),
  security: z
    .object({
      writable_paths: z.array(z.string()).optional(),
      requires_validation: z.boolean().optional(),
    })
    .optional(),
});

export type WorkflowMeta = z.infer<typeof WorkflowMetaSchema>;

// Complete skill definition
export interface SkillDefinition {
  name: string;
  description: string;
  content: string; // Full SKILL.md content
  frontmatter: SkillFrontmatter;
  metadata?: WorkflowMeta;
  type: 'orchestrator' | 'workflow';
  standalone: boolean;
  dependencies: string[];
}

// Agentskills compatibility manifest
export interface AgentskillsManifest {
  id: string;
  version: string;
  type: 'workflow' | 'orchestrator';
  description: string;
  triggers?: string[];
  tags?: string[];
  category?: string;
  phases?: Array<{ name: string; modelHint: string }>;
  dependencies: string[];
  outputs?: string[];
  instructions: string;
}

// Generated file representation
export interface GeneratedFile {
  path: string; // Relative to project root
  content: string;
  overwrite: boolean;
  generatedBy: string; // 'sot@{version}'
  checksum?: string; // SHA-256
}

// Tool adapter interface
export interface ToolAdapter {
  readonly id: string;
  readonly name: string;
  readonly skillsDir: string;
  readonly detectionPaths: string[];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[];
  detect(projectRoot: string): boolean;
}

// Installation result
export interface InstallationResult {
  success: boolean;
  filesWritten: string[];
  filesBackedUp: string[];
  errors: string[];
  warnings: string[];
}

// Dependency check result
export interface DependencyStatus {
  name: string;
  installed: boolean;
  version?: string;
  required: string;
}
