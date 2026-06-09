/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
					'primary-black': 'var(--color-primary-black)',
					'primary-gray': 'var(--color-primary-gray)',
					'primary-light-gray': 'var(--color-primary-light-gray)',
					'primary-green': 'var(--color-primary-green)',
					'primary-blue': 'var(--color-primary-blue)',
					'primary-yellow': 'var(--color-primary-yellow)'
			},
			fontFamily: {
				'silkscreen': ['Silkscreen', 'cursive'],
				'inter': ['Inter', 'sans-serif']
			}
	},
	plugins: [],
	},
}
