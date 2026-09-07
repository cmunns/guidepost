// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  // Feeds canonical URLs and the sitemap. Change this when a custom domain is added.
  site: 'https://guidepost-docs.vercel.app',
  integrations: [
    starlight({
      title: 'Guidepost',
      description:
        'Accessible product tours built on native browser primitives — Popover API, CSS anchor positioning, and animated clip-path spotlights.',
      // The logo wordmark already reads "Guidepost", so the text title would
      // duplicate it in the header.
      logo: {
        src: './src/assets/guidepost-logo.png',
        alt: 'Guidepost',
        replacesTitle: true,
      },
      social: {
        github: 'https://github.com/cmunns/guidepost',
      },
      editLink: {
        baseUrl: 'https://github.com/cmunns/guidepost/edit/main/sites/docs/',
      },
      customCss: ['./src/styles/theme.css'],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Introduction', link: '/' },
            { label: 'Install', slug: 'install' },
            { label: 'Quick start', slug: 'quick-start' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Placement', slug: 'guides/placement' },
            { label: 'Blocking modes', slug: 'guides/blocking-modes' },
            { label: 'Async steps', slug: 'guides/async-steps' },
            { label: 'Buttons and labels', slug: 'guides/buttons-and-labels' },
            { label: 'Styling', slug: 'guides/styling' },
            { label: 'Accessibility', slug: 'guides/accessibility' },
            { label: 'Recipes', slug: 'guides/recipes' },
            { label: 'Troubleshooting', slug: 'guides/troubleshooting' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Steps', slug: 'reference/steps' },
            { label: 'Options', slug: 'reference/options' },
            { label: 'Methods', slug: 'reference/methods' },
            { label: 'Browser support', slug: 'reference/browser-support' },
          ],
        },
      ],
    }),
  ],
});
