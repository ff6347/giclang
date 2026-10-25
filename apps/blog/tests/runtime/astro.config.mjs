// ABOUTME: Builds the blog's MDX preview component independently of page layouts.
// ABOUTME: Exercises Astro's production bundling of the shared runtime package.

import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({ integrations: [mdx()] });
