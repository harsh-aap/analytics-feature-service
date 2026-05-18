module.exports = {
	env: {
		es2024: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
	extends: [
		'eslint:recommended',
		'airbnb-base',
		'airbnb-typescript/base',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
		'prettier',
	],
	parserOptions: {
		ecmaVersion: 2024,
		sourceType: 'module',
		project: './tsconfig.json',
	},
	rules: {
		'prettier/prettier': 'error',

		'@typescript-eslint/naming-convention': [
			'error',
			...(require('@typescript-eslint/eslint-plugin').configs.recommended.rules[
				'@typescript-eslint/naming-convention'
			] || []),
			{
				selector: ['enumMember'],
				format: ['UPPER_CASE'],
			},
		],
		'class-methods-use-this': 'off',

		'@typescript-eslint/explicit-function-return-type': 'warn',
		'@typescript-eslint/no-unused-vars': 'off',

		'no-console': 'warn',
		'no-eval': 'error',
		curly: ['error', 'all'],

		'max-len': [
			'error',
			{ code: 100, ignoreTemplateLiterals: true, ignoreStrings: true, ignoreComments: true },
		],
		'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
		'max-depth': ['error', 4],
		'max-statements': ['error', 20],
		complexity: ['error', 10],

		'no-shadow': 'off',
		'@typescript-eslint/no-shadow': 'error',
		'no-underscore-dangle': 'off',

		'import/prefer-default-export': 'off',
		'import/extensions': [
			'error',
			'ignorePackages',
			{ js: 'never', jsx: 'never', ts: 'never', tsx: 'never' },
		],
		'import/first': 'error',
		'import/order': [
			'error',
			{
				groups: ['builtin', 'external', 'internal', 'index'],
				pathGroupsExcludedImportTypes: ['builtin'],
				'newlines-between': 'always',
				alphabetize: { order: 'asc', caseInsensitive: true },
			},
		],
		'sort-imports': [
			'error',
			{
				ignoreCase: false,
				ignoreDeclarationSort: true,
				ignoreMemberSort: false,
				memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
				allowSeparatedGroups: true,
			},
		],
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: ['*/dist/*'],
					},
				],
			},
		],
		'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],
		'unused-imports/no-unused-imports-ts': 'error',
		'unused-imports/no-unused-vars': [
			'warn',
			{ vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
		],
	},
}
