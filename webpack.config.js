const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: {
        widget: path.join(__dirname, 'src', 'widget', 'widget-index.js'),
        chat:   path.join(__dirname, 'src', 'chat',   'chat-index.js'),
    },
    output: {
        path: path.join(__dirname, 'dist', 'js'),
        filename: '[name].js',
        publicPath: '/js/'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ['babel-loader'],
                include: path.join(__dirname, 'src')
            }
        ]
    }
};
