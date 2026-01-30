const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'bundle.[contenthash].js', // 哈希文件名
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    // 强力混淆配置
    new WebpackObfuscator({
      rotateStringArray: true, // 旋转字符串数组
      stringArray: true,       // 提取字符串
      stringArrayEncoding: ['rc4'], // 使用 RC4 加密字符串
      stringArrayThreshold: 1, // 100% 的字符串都加密
      deadCodeInjection: true, // 注入死代码
      deadCodeInjectionThreshold: 0.4,
      controlFlowFlattening: true, // 展平控制流 (switch-case 地狱)
      controlFlowFlatteningThreshold: 1,
      transformObjectKeys: true, // 混淆对象键名
      unicodeEscapeSequence: true, // 将代码转为 Unicode 转义
    }, [])
  ]
};