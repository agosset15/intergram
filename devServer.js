const path = require('path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./webpack.config');

const compiler = webpack({ ...config, mode: 'development' });
const server = new WebpackDevServer({
    port: 3000,
    static: { directory: path.join(__dirname, 'dist') },
    hot: true,
    historyApiFallback: true,
}, compiler);

server.start().then(() => {
    console.log('Listening at localhost:3000');
}).catch(err => {
    console.error(err);
});
