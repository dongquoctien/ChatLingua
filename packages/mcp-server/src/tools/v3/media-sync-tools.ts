import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseConnection } from '../../database/connection.js';
import { RowDataPacket } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// ============================================================
// Tool Definitions
// ============================================================

export const syncMediaFilesTool: Tool = {
  name: 'sync_media_files',
  description: `[ADMIN] Sync media files from source folder to backend public folder.

Copies files from a source folder to the backend public folder structure.
Supports glob patterns for file filtering and optional file renaming.
Can update database URLs if mapId is provided.

=== EXAMPLE USAGE ===

Copy all MP3 files from a source folder:
{
  "sourceFolder": "D:\\\\English\\\\Prepare 2e Level 1\\\\00 Student's Book Audio",
  "targetFolder": "audio/word-maps/prepare-2e-l1/sb",
  "filePattern": "*.mp3"
}

With dry-run to preview:
{
  "sourceFolder": "D:\\\\English\\\\Prepare 2e Level 1\\\\Audio",
  "targetFolder": "audio/word-maps/prepare-2e-l1",
  "dryRun": true
}`,
  inputSchema: {
    type: 'object',
    properties: {
      sourceFolder: {
        type: 'string',
        description: 'Absolute path to source folder (e.g., "D:\\\\English\\\\Prepare 2e Level 1\\\\Audio")',
      },
      targetFolder: {
        type: 'string',
        description: 'Target folder relative to backend/public (e.g., "audio/word-maps/prepare-2e-l1/sb")',
      },
      filePattern: {
        type: 'string',
        description: 'Glob pattern for filtering files (default: "*.*")',
      },
      renamePattern: {
        type: 'string',
        description: 'Optional rename pattern. Use {name} for original name, {n} for index (e.g., "track-{n}.mp3")',
      },
      mapId: {
        type: 'number',
        description: 'Word Map ID for database URL updates (optional)',
      },
      dryRun: {
        type: 'boolean',
        description: 'Preview only, do not copy files (default: false)',
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite existing files (default: false)',
      },
    },
    required: ['sourceFolder', 'targetFolder'],
  },
};

export const listMediaFilesTool: Tool = {
  name: 'list_media_files',
  description: `[ADMIN] List media files in source or target folder.

Preview files before syncing. Shows file names, sizes, and count.
Use this to understand what files are available before running sync_media_files.

=== EXAMPLE USAGE ===

List source files:
{
  "folder": "D:\\\\English\\\\Prepare 2e Level 1\\\\00 Student's Book Audio",
  "pattern": "*.mp3"
}

List synced files in backend:
{
  "folder": "audio/word-maps/prepare-2e-l1/sb",
  "isBackendPath": true
}`,
  inputSchema: {
    type: 'object',
    properties: {
      folder: {
        type: 'string',
        description: 'Folder path (absolute or relative to backend/public if isBackendPath=true)',
      },
      pattern: {
        type: 'string',
        description: 'Glob pattern for filtering (default: "*.*")',
      },
      isBackendPath: {
        type: 'boolean',
        description: 'If true, folder is relative to backend/public (default: false)',
      },
      limit: {
        type: 'number',
        description: 'Maximum files to list (default: 100)',
      },
    },
    required: ['folder'],
  },
};

export const validateMediaUrlsTool: Tool = {
  name: 'validate_media_urls',
  description: `[ADMIN] Validate media URLs in database against actual files.

Checks lesson_content entries with audio/video/image content types
and verifies that the referenced files exist in the backend public folder.

Returns a report of missing files and broken URLs.

=== EXAMPLE USAGE ===

Validate all media URLs for a Word Map:
{
  "mapId": 2
}

Validate specific content types:
{
  "mapId": 2,
  "contentTypes": ["audio", "video"]
}`,
  inputSchema: {
    type: 'object',
    properties: {
      mapId: {
        type: 'number',
        description: 'Word Map ID to validate (validates all if not specified)',
      },
      contentTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['audio', 'video', 'image'],
        },
        description: 'Content types to validate (default: all media types)',
      },
      fixMissing: {
        type: 'boolean',
        description: 'Attempt to find and suggest fixes for missing files (default: false)',
      },
    },
  },
};

// ============================================================
// Tool Implementations
// ============================================================

interface SyncMediaFilesArgs {
  sourceFolder: string;
  targetFolder: string;
  filePattern?: string;
  renamePattern?: string;
  mapId?: number;
  dryRun?: boolean;
  overwrite?: boolean;
}

interface ListMediaFilesArgs {
  folder: string;
  pattern?: string;
  isBackendPath?: boolean;
  limit?: number;
}

interface ValidateMediaUrlsArgs {
  mapId?: number;
  contentTypes?: string[];
  fixMissing?: boolean;
}

interface FileInfo {
  name: string;
  size: number;
  sizeFormatted: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getBackendPublicPath(): string {
  // MCP server runs from packages/mcp-server, backend public is at packages/backend/public
  const mcpRoot = process.cwd();
  // Handle different possible working directories
  if (mcpRoot.includes('packages/mcp-server') || mcpRoot.includes('packages\\mcp-server')) {
    return path.resolve(mcpRoot, '..', 'backend', 'public');
  }
  // If running from repo root
  return path.resolve(mcpRoot, 'packages', 'backend', 'public');
}

export async function syncMediaFiles(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<unknown> {
  const params = args as unknown as SyncMediaFilesArgs;
  const {
    sourceFolder,
    targetFolder,
    filePattern = '*.*',
    renamePattern,
    mapId,
    dryRun = false,
    overwrite = false,
  } = params;

  // Validate source folder exists
  if (!fs.existsSync(sourceFolder)) {
    return {
      success: false,
      error: `Source folder not found: ${sourceFolder}`,
    };
  }

  // Build target path
  const backendPublic = getBackendPublicPath();
  const fullTargetPath = path.join(backendPublic, targetFolder);

  // Create target directory if not exists (unless dry run)
  if (!dryRun && !fs.existsSync(fullTargetPath)) {
    fs.mkdirSync(fullTargetPath, { recursive: true });
  }

  // Find matching files
  const searchPattern = path.join(sourceFolder, filePattern).replace(/\\/g, '/');
  const files = glob.sync(searchPattern);

  if (files.length === 0) {
    return {
      success: true,
      message: 'No files matched the pattern',
      sourceFolder,
      pattern: filePattern,
      filesFound: 0,
    };
  }

  const results: {
    copied: string[];
    skipped: string[];
    errors: string[];
  } = {
    copied: [],
    skipped: [],
    errors: [],
  };

  let totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const originalName = path.basename(filePath);

    // Determine target filename
    let targetName = originalName;
    if (renamePattern) {
      const ext = path.extname(originalName);
      const nameWithoutExt = path.basename(originalName, ext);
      targetName = renamePattern
        .replace('{name}', nameWithoutExt)
        .replace('{n}', String(i + 1).padStart(3, '0'));
      if (!targetName.includes('.')) {
        targetName += ext;
      }
    }

    const targetFilePath = path.join(fullTargetPath, targetName);

    try {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;

      // Check if file exists
      if (fs.existsSync(targetFilePath) && !overwrite) {
        results.skipped.push(`${originalName} (already exists)`);
        continue;
      }

      if (!dryRun) {
        fs.copyFileSync(filePath, targetFilePath);
      }

      results.copied.push(dryRun ? `[DRY-RUN] ${originalName} -> ${targetName}` : `${originalName} -> ${targetName}`);
    } catch (err) {
      results.errors.push(`${originalName}: ${(err as Error).message}`);
    }
  }

  // Build URL pattern for reference
  const urlPattern = `/${targetFolder}/{filename}`;

  return {
    success: true,
    dryRun,
    sourceFolder,
    targetFolder: fullTargetPath,
    pattern: filePattern,
    urlPattern,
    summary: {
      totalFiles: files.length,
      copied: results.copied.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      totalSize: formatFileSize(totalSize),
    },
    copied: results.copied,
    skipped: results.skipped.length > 0 ? results.skipped : undefined,
    errors: results.errors.length > 0 ? results.errors : undefined,
    nextSteps: dryRun
      ? ['Set dryRun: false to actually copy the files']
      : mapId
        ? [`Use link_media_resource to connect audio files to lessons in Word Map ${mapId}`]
        : ['Use link_media_resource to connect files to lessons'],
  };
}

export async function listMediaFiles(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<unknown> {
  const params = args as unknown as ListMediaFilesArgs;
  const {
    folder,
    pattern = '*.*',
    isBackendPath = false,
    limit = 100,
  } = params;

  // Resolve folder path
  let fullPath: string;
  if (isBackendPath) {
    const backendPublic = getBackendPublicPath();
    fullPath = path.join(backendPublic, folder);
  } else {
    fullPath = folder;
  }

  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      error: `Folder not found: ${fullPath}`,
      resolvedPath: fullPath,
    };
  }

  // Find files
  const searchPattern = path.join(fullPath, pattern).replace(/\\/g, '/');
  const files = glob.sync(searchPattern);

  if (files.length === 0) {
    return {
      success: true,
      folder: fullPath,
      pattern,
      filesFound: 0,
      files: [],
    };
  }

  // Get file info
  const fileInfos: FileInfo[] = [];
  let totalSize = 0;

  const filesToProcess = files.slice(0, limit);
  for (const filePath of filesToProcess) {
    try {
      const stats = fs.statSync(filePath);
      const name = path.basename(filePath);
      fileInfos.push({
        name,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
      });
      totalSize += stats.size;
    } catch {
      // Skip files that can't be read
    }
  }

  // Sort by name
  fileInfos.sort((a, b) => a.name.localeCompare(b.name));

  return {
    success: true,
    folder: fullPath,
    pattern,
    filesFound: files.length,
    filesListed: fileInfos.length,
    totalSize: formatFileSize(totalSize),
    files: fileInfos,
    ...(files.length > limit && {
      note: `Showing first ${limit} of ${files.length} files. Increase limit to see more.`,
    }),
  };
}

export async function validateMediaUrls(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<unknown> {
  const params = args as unknown as ValidateMediaUrlsArgs;
  const {
    mapId,
    contentTypes = ['audio', 'video', 'image'],
    fixMissing = false,
  } = params;

  const backendPublic = getBackendPublicPath();

  // Build query to get lesson content with media URLs
  let query = `
    SELECT
      lc.id,
      lc.lesson_id,
      lc.content_type,
      lc.custom_content,
      ul.title as lesson_title,
      mu.title as unit_title,
      wm.name as map_name
    FROM lesson_content lc
    JOIN unit_lessons ul ON lc.lesson_id = ul.id
    JOIN map_units mu ON ul.unit_id = mu.id
    JOIN word_maps wm ON mu.map_id = wm.id
    WHERE lc.content_type IN (?)
      AND lc.custom_content IS NOT NULL
  `;
  const queryParams: unknown[] = [contentTypes];

  if (mapId) {
    query += ' AND wm.id = ?';
    queryParams.push(mapId);
  }

  query += ' ORDER BY wm.id, mu.unit_number, ul.lesson_number, lc.display_order';

  const rows = await db.query<RowDataPacket[]>(query, queryParams);

  const results: {
    valid: number;
    missing: Array<{
      contentId: number;
      lessonId: number;
      contentType: string;
      url: string;
      mapName: string;
      unitTitle: string;
      lessonTitle: string;
      suggestion?: string;
    }>;
    invalid: Array<{
      contentId: number;
      issue: string;
    }>;
  } = {
    valid: 0,
    missing: [],
    invalid: [],
  };

  for (const row of rows) {
    let customContent: Record<string, unknown>;
    try {
      customContent = typeof row.custom_content === 'string'
        ? JSON.parse(row.custom_content)
        : row.custom_content;
    } catch {
      results.invalid.push({
        contentId: row.id,
        issue: 'Invalid JSON in custom_content',
      });
      continue;
    }

    const url = customContent.url as string | undefined;
    if (!url) {
      results.invalid.push({
        contentId: row.id,
        issue: 'No URL in custom_content',
      });
      continue;
    }

    // Resolve file path from URL
    const relativePath = url.startsWith('/') ? url.slice(1) : url;
    const filePath = path.join(backendPublic, relativePath);

    if (fs.existsSync(filePath)) {
      results.valid++;
    } else {
      const missingEntry: {
        contentId: number;
        lessonId: number;
        contentType: string;
        url: string;
        mapName: string;
        unitTitle: string;
        lessonTitle: string;
        suggestion?: string;
      } = {
        contentId: row.id,
        lessonId: row.lesson_id,
        contentType: row.content_type,
        url,
        mapName: row.map_name,
        unitTitle: row.unit_title,
        lessonTitle: row.lesson_title,
      };

      // Try to find similar files if fixMissing is true
      if (fixMissing) {
        const urlDir = path.dirname(filePath);
        const urlBasename = path.basename(url);
        if (fs.existsSync(urlDir)) {
          const filesInDir = fs.readdirSync(urlDir);
          const similar = filesInDir.find(
            f => f.toLowerCase().includes(urlBasename.toLowerCase().split('.')[0])
          );
          if (similar) {
            missingEntry.suggestion = `/${relativePath.replace(path.basename(url), similar)}`;
          }
        }
      }

      results.missing.push(missingEntry);
    }
  }

  return {
    success: true,
    mapId: mapId || 'all',
    contentTypes,
    backendPublicPath: backendPublic,
    summary: {
      totalChecked: rows.length,
      valid: results.valid,
      missing: results.missing.length,
      invalid: results.invalid.length,
    },
    ...(results.missing.length > 0 && { missing: results.missing }),
    ...(results.invalid.length > 0 && { invalid: results.invalid }),
    ...(results.missing.length === 0 && results.invalid.length === 0 && {
      message: 'All media URLs are valid!',
    }),
  };
}
