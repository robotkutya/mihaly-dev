/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
					'primary-black': '#181818',
					'primary-gray': '#979797',
					'primary-light-gray': '#CFCFCF',
					'primary-green': '#00BB56',
					'primary-blue': '#0029FF',
					'primary-yellow': '#EBA900'
			},
			fontFamily: {
				'silkscreen': ['Silkscreen', 'ui-sans-serif', 'sans'],
				'inter': ['Inter', 'ui-sans-serif', 'sans']
			}
	},
	plugins: [],
	},
}
