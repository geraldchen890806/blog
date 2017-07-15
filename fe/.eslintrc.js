module.exports = {
  parser: 'babel-eslint',
  extends: 'airbnb',
  env: {
    browser: true,
    node: true,
    jest: true,
    es6: true
  },
  plugins: ['react'],
  globals: {
    Highcharts: true,
    _config: true
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    camelcase: [
      'error',
      {
        properties: 'never'
      }
    ],
    'class-methods-use-this': 0,
    'comma-dangle': 0,
    'class-methods-use-this': 'off',
    eqeqeq: ['warn', 'smart'],
    'max-len': ['warn', 200],
    'no-param-reassign': 0,
    'prefer-const': 0,
    indent: ['error', 2],
    'no-new': 0,
    'import/extensions': 0,
    'import/first': 1,
    'import/newline-after-import': 0,
    'import/no-extraneous-dependencies': 0,
    'import/no-dynamic-require': 0,
    'import/no-named-as-default': 0,
    'import/no-unresolved': 0,
    'import/no-webpack-loader-syntax': 0,
    'import/prefer-default-export': 0,
    'jsx-a11y/no-static-element-interactions': 0,
    'no-underscore-dangle': 0,
    'no-mixed-operators': 1,
    'no-use-before-define': 0,
    'no-new': 0,
    'object-curly-spacing': 0,
    'react/forbid-prop-types': 0,
    'react/prefer-stateless-function': 0,
    'react/prop-types': 1,
    'react/sort-comp': 0,
    'no-bitwise': 0,
    'no-unused-vars': ['warn'],
    'react/jsx-filename-extension': [
      1,
      {
        extensions: ['.js', '.jsx']
      }
    ],
    'comma-dangle': ['error', 'never']
  },
  settings: {
    'import/resolver': {
      webpack: {
        config: './webpack.config.js'
      }
    }
  }
};
