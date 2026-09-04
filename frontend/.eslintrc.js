module.exports = {
    root: true,
    env: {
        node: true
    },
    extends: [
        'plugin:vue/vue3-essential',
        'eslint:recommended'
    ],
    parserOptions: {
        parser: '@babel/eslint-parser',
        requireConfigFile: false // 这一行是关键，告诉ESLint不需要Babel配置文件
    },
    rules: {
        'no-console': 'off', // 项目刻意保留调试日志，不再按环境告警
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-unused-vars': 'warn', // 警告未使用的变量
    }
};