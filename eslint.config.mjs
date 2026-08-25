import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'prisma/migrations/**', '*.mjs', 'next-env.d.ts'],
  },
  {
    // Avatars and progress photos are client-side downscaled data URLs.
    // next/image cannot optimise those, so the plain <img> is correct here.
    files: [
      'src/components/layout/Sidebar.tsx',
      'src/components/progress/ProgressPhotos.tsx',
    ],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
