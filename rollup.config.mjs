import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import typescript from 'rollup-plugin-typescript2'
import terser from '@rollup/plugin-terser'
import postcss from 'rollup-plugin-postcss'
export default {
	input: 'src/rollup.entry.ts',
	external: ['@turf/turf'],
	output: [
		{
			file: 'dist/mapbox-utils.cjs.js',
			format: 'cjs',
			sourcemap: true
		},
		{
			file: 'dist/mapbox-utils.esm.js',
			format: 'es',
			sourcemap: true
		},
		{
			file: 'dist/mapbox-utils.min.js',
			name: 'MapboxUtils',
			format: 'iife',
			sourcemap: true,
			globals: {
				'@turf/turf': 'turf'
			}
		}
	],
	plugins: [
		typescript({}),
		resolve({ modulesOnly: true, extensions: ['js', 'ts'], browser: true }),
		commonjs({
			extensions: ['.js', '.ts']
		}),
		babel({
			exclude: ['**/node_modules/**'],
			babelHelpers: 'runtime',
			extensions: ['js', 'ts']
		}),
		terser({
			// compress: {
			// 	drop_console: true,
			// 	drop_debugger: true
			// }
		}),
		postcss({
			extract: 'mapbox-utils.css'
		})
	]
}
