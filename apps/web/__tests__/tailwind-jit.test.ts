import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(TEST_DIR, '..');
const SOURCE_DIRS = ['app', 'components', 'lib'] as const;
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mdx']);
const RESPONSIVE_CLASS_PATTERN = /(?:^|[\s"'`])((?:sm|md|lg|xl):[^\s"'`<>]+)/g;
const REQUIRED_GRID_CLASSES = [
  'lg:grid-cols-4',
  'lg:grid-cols-5',
  'lg:grid-cols-6',
  'lg:grid-rows-1',
  'lg:col-span-1',
  'lg:col-span-2',
  'lg:col-span-3',
  'lg:col-span-4',
  'lg:col-span-5',
  'lg:col-span-6',
] as const;

describe('Tailwind v4 responsive JIT generation', () => {
  it('generates every responsive class used by app, components, and lib source', async () => {
    // Given: the web app source files and global Tailwind entrypoint.
    const sourceFiles = await collectSourceFiles(
      SOURCE_DIRS.map((dir) => path.join(WEB_ROOT, dir)),
    );
    const sourceTexts = await Promise.all(
      sourceFiles.map((filePath) => readFile(filePath, 'utf8')),
    );
    const responsiveClasses = extractResponsiveClasses(sourceTexts.join('\n'));

    // When: Tailwind v4 compiles the app stylesheet through the production PostCSS plugin.
    const compiledCss = await compileTailwindCss();

    // Then: every responsive source class and the required grid safelist utilities exist.
    const expectedClasses = [...new Set([...responsiveClasses, ...REQUIRED_GRID_CLASSES])].sort();
    const missingClasses = expectedClasses.filter(
      (className) => !compiledCss.includes(`.${escapeClassSelector(className)}`),
    );

    expect(missingClasses).toEqual([]);
  });
});

async function collectSourceFiles(directories: readonly string[]): Promise<readonly string[]> {
  const files: string[] = [];
  for (const directory of directories) {
    files.push(...(await collectSourceFilesFromDirectory(directory)));
  }
  return files;
}

async function collectSourceFilesFromDirectory(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFilesFromDirectory(entryPath)));
      continue;
    }

    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function extractResponsiveClasses(sourceText: string): readonly string[] {
  const matches = sourceText.matchAll(RESPONSIVE_CLASS_PATTERN);
  const classNames = [...matches].map((match) => normalizeClassName(match[1]));
  return [...new Set(classNames)].sort();
}

function normalizeClassName(className: string | undefined): string {
  return (className ?? '').replace(/[;,]+$/, '');
}

async function compileTailwindCss(): Promise<string> {
  const cssPath = path.join(WEB_ROOT, 'app', 'globals.css');
  const css = await readFile(cssPath, 'utf8');
  const result = await postcss([tailwindcss()]).process(css, { from: cssPath });
  return result.css;
}

function escapeClassSelector(className: string): string {
  return className.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}
