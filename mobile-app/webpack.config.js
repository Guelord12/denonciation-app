const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'src/assets', 
          to: 'assets',
          noErrorOnMissing: true // ✅ EMPÊCHE L'ERREUR SI LE DOSSIER N'EXISTE PAS
        },
        { 
          from: 'src/manifest.json', 
          to: 'manifest.json',
          noErrorOnMissing: true // ✅ EMPÊCHE L'ERREUR SI LE FICHIER N'EXISTE PAS
        }
      ],
    }),
  ],
  devServer: {
    static: './dist',
    port: 3000,
    hot: true,
    open: true
  },
};