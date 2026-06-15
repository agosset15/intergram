import globals from 'globals';
import babelParser from '@babel/eslint-parser';

export default [
    {
        files: ['src/**/*.js'],
        languageOptions: {
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false,
                babelOptions: {
                    presets: [['@babel/preset-react', { pragma: 'h', runtime: 'classic' }]]
                }
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            quotes: [2, 'single'],
            strict: [2, 'never']
        }
    }
];
