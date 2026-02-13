import fs from 'fs';
import path from 'path';
import { loadScriptFile } from './typescriptLoader';
import type { Configuration as WebpackConfiguration } from 'webpack';

/**
 * The configuration interface for nextron.
 */
export declare interface Configuration {
  /**
   * Specify an alternate main src directory, defaults to 'main'.
   */
  rendererSrcDir?: string;

  /**
   * Specify an alternate renderer src directory, defaults to 'renderer'.
   */
  mainSrcDir?: string;

  /**
   * Specify a startup delay in milliseconds to retry to test if the debugger port is open, defaults to '10000'.
   */
  startupDelay?: number;

  /**
   * Override for the main process's webpack
   * @param {import('webpack').Configuration} config An instance of the base webpack configuration.
   * @param {'development'|'production'} mode A string specifying the build mode of the program.
   * @returns {import('webpack').Configuration} Returns an instance of the final configuration instance.
   */
  webpack?: (config: WebpackConfiguration, mode: 'development' | 'production') => WebpackConfiguration;
}

const cwd = process.cwd();

export const getNextronConfig = async (): Promise<Configuration> => {
  if (fs.existsSync(path.join(cwd, 'nextron.config.js')))
    return await loadScriptFile(path.join(cwd, 'nextron.config.js'));
  if (fs.existsSync(path.join(cwd, 'nextron.config.ts')))
    return await loadScriptFile(path.join(cwd, 'nextron.config.ts'));
  return {};
};
