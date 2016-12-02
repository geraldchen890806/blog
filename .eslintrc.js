module.exports = {
    "parser": "babel-eslint",
    "env": {
        "browser": true,
        "node": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 7,
        "sourceType": "module",
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true,
            "jsx": true
        }
    },
    "plugins": [
        "react"
    ],
    "rules": {
        "indent": [
            1,
            4
        ],
        "quotes": 1,
        "semi": 1,
        /*global define*/
        "no-undef":2,
        "no-unused-vars":1,
        "no-console":1
    },
    "globals":{
        "$": false,
        "moment": false,
        "setTimeout": false,
        "clearTimeout": false,
        "setInterval": false,
        "clearInterval": false,
        "_config": false,
        "Marionette": false,
        "_": false,
        "Backbone": false,
        "window": false,
        "document": false,
        "console": false,
        "location": false,
        "Highcharts": false,
        "FormData": false,
        "define":false,
        "then":false,
        "require":false,
        "localStorage":false
    }
};
