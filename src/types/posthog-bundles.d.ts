/* posthog-js ships no .d.ts for the side-effect recorder bundle (verified in
   node_modules/posthog-js/dist/); this ambient declaration keeps `astro check`
   green. `module.no-external` resolves its own real types - do not declare it
   here, an ambient declaration would shadow them. */
declare module 'posthog-js/dist/posthog-recorder';
