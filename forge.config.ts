import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  outDir: './release',
  packagerConfig: {
    name: 'Idiot',
    icon: './resources/icon',
    asar: true,
    ignore: [
      /^\/src$/,
      /^\/src\//,
      /^\/tests$/,
      /^\/tests\//,
      /^\/\.claude/,
      /^\/\.git/,
      /^\/\.github$/,
      /^\/scripts$/,
      /^\/scripts\//,
      /^\/resources$/,
      /^\/\.gitignore$/,
      /^\/\.npmrc$/,
      /^\/forge\.config\.ts$/,
      /^\/tsconfig/,
      /\.map$/,
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: { name: 'Idiot', authors: 'Idiot' },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: { name: 'Idiot' },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
  ],
};

export default config;
