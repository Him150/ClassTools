import webpack from 'webpack';
import { merge } from 'webpack-merge';
import { getNextronConfig } from './getNextronConfig';
import { getBaseConfig } from './webpack.config.base';

const getConfig = async () => {
  const { webpack: userWebpack } = await getNextronConfig();

  let config: webpack.Configuration = merge(await getBaseConfig(), {
    mode: 'development',
    plugins: [
      new webpack.EnvironmentPlugin({
        NODE_ENV: 'development',
      }),
      new webpack.LoaderOptionsPlugin({
        debug: true,
      }),
    ],
    devtool: 'inline-source-map',
  });

  if (typeof userWebpack === 'function') {
    config = userWebpack(config, 'development');
  }

  return config;
};

export { getConfig };
