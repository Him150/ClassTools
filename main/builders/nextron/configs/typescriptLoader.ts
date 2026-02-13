/* eslint-disable @typescript-eslint/no-explicit-any */

import path from 'path';
import { createJiti } from 'jiti';
import { TypeScriptCompileError } from './typescriptCompileError';

type Jiti = ReturnType<typeof createJiti>;
type JitiOptions = Parameters<typeof createJiti>[1];
type LoaderAsync = (filepath: string) => Promise<any>;

function TypeScriptLoader(options?: JitiOptions): LoaderAsync {
  const loader: Jiti = createJiti('', { interopDefault: true, ...options });
  return async (path: string): Promise<any> => {
    try {
      // Because the import resolved as `unknown`, in the union of `unknown & { default?: unknown }`
      // `unknown` is the loosest type, however, we know it's an imported module possibly with a
      // default export set.

      const result = (await loader.import(path)) as { default?: unknown };

      // `default` is used when exporting using export default, some modules
      // may still use `module.exports` or if in TS `export = `

      return result.default || result;
    } catch (error) {
      if (error instanceof Error) {
        // Coerce generic error instance into typed error with better logging.
        throw TypeScriptCompileError.fromError(error);
      }
      throw error;
    }
  };
}

export async function loadScriptFile<T = any>(filePath: string): Promise<T> {
  if (['.js', '.mjs', '.cjs'].includes(path.extname(filePath))) {
    return require(filePath) as T;
  }
  return TypeScriptLoader()(filePath) as T;
}
