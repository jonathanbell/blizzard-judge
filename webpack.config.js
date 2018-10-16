const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const autoprefixer = require('autoprefixer');

const javascript = {
  test: /\.(js)$/,
  use: [
    {
      loader: 'babel-loader',
      options: { presets: ['env'] }
    }
  ]
};

const postcss = {
  loader: 'postcss-loader',
  options: {
    plugins() {
      return [autoprefixer({ browsers: 'last 3 versions' })];
    }
  }
};

const styles = {
  test: /\.(scss)$/,
  use: ExtractTextPlugin.extract([
    'css-loader?sourceMap',
    postcss,
    'sass-loader?sourceMap'
  ])
};

const uglify = new webpack.optimize.UglifyJsPlugin({
  compress: { warnings: false }
});

// WebPack config
const config = {
  entry: {
    App: './public/javascripts/blizzard-judge.js'
  },

  // specify which kind of sourcemap to use
  devtool: 'source-map',

  output: {
    path: path.resolve(__dirname, 'public', 'dist'),
    // We can use "substitutions" in file names like [name] and [hash]
    // name will be `App` because that is what we used above in our `entry`.
    filename: '[name].bundle.js'
  },

  module: {
    rules: [javascript, styles]
  },

  plugins: [
    uglify,
    // output our css to a separate file
    new ExtractTextPlugin('style.css')
  ]
};

// make webpack be quiet about soon to be deprecated APIs.
process.noDeprecation = true;

module.exports = config;
