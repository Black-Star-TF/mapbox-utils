import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import typescript from 'rollup-plugin-typescript'
import terser from '@rollup/plugin-terser'
import postcss from 'rollup-plugin-postcss'
import fs from 'fs'
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
export default {
	input: 'src/index.ts',
	external: Object.keys(pkg.dependencies || {}),
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
			format: 'umd',
			sourcemap: true,
			globals: {
				'mapbox-gl': 'mapboxgl',
				'@turf/turf': 'turf',
				nanoid: 'nanoid'
			}
		}
	],
	plugins: [
		commonjs({ extensions: ['.js', '.ts'] }),
		resolve({ modulesOnly: true, extensions: ['js', 'ts'] }),
		typescript(),
		babel({
			exclude: ['**/node_modules/**'],
			babelHelpers: 'runtime',
			extensions: ['js', 'ts']
		}),
		terser({
			compress: {
				drop_console: true,
				drop_debugger: true
			}
		}),
		postcss({
			extract: 'mapbox-utils.css'
		})
	]
}
