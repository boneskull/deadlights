'use strict';

const path = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');

module.exports = {
  entry: path.join(__dirname, 'src', 'index.js'),
  target: 'node',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'deadlights.cjs.js',
    libraryTarget: 'commonjs2'
  },
  externals: [nodeExternals()],
  plugins: [
    new webpack.BannerPlugin({
      banner: "require('source-map-support').install();",
      raw: true,
      entryOnly: false
    })
  ],
  node: {
    console: false,
    global: false,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
    setImmediate: false
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  devtool: 'inline-source-map'
};
