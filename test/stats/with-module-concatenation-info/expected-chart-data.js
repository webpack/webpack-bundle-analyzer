module.exports = {
  label: 'index.js + 5 modules (concatenated)',
  concatenated: true,
  statSize: 332,
  parsedSize: 70,
  gzipSize: 85,
  groups: [
    {
      inaccurateSizes: true,
      gzipSize: 50,
      id: null,
      label: 'index.js',
      parsedSize: 41,
      path: './index.js + 5 modules (concatenated)/index.js',
      statSize: 196
    },
    {
      inaccurateSizes: true,
      gzipSize: 12,
      id: null,
      label: 'a.js',
      parsedSize: 10,
      path: './index.js + 5 modules (concatenated)/a.js',
      statSize: 48
    },
    {
      label: 'modules-1',
      gzipSize: 11,
      inaccurateSizes: true,
      parsedSize: 9,
      path: './index.js + 5 modules (concatenated)/modules-1',
      statSize: 44,
      groups: [
        {
          inaccurateSizes: true,
          gzipSize: 5,
          id: null,
          label: 'b.js',
          parsedSize: 4,
          path: './index.js + 5 modules (concatenated)/modules-1/b.js',
          statSize: 22
        },
        {
          inaccurateSizes: true,
          gzipSize: 5,
          id: null,
          label: 'c.js',
          parsedSize: 4,
          path: './index.js + 5 modules (concatenated)/modules-1/c.js',
          statSize: 22
        }
      ]
    },
    {
      label: 'modules-2',
      inaccurateSizes: true,
      gzipSize: 11,
      parsedSize: 9,
      path: './index.js + 5 modules (concatenated)/modules-2',
      statSize: 44,
      groups: [
        {
          inaccurateSizes: true,
          gzipSize: 5,
          id: null,
          label: 'd.js',
          parsedSize: 4,
          path: './index.js + 5 modules (concatenated)/modules-2/d.js',
          statSize: 22
        },
        {
          inaccurateSizes: true,
          gzipSize: 5,
          id: null,
          label: 'e.js',
          parsedSize: 4,
          path: './index.js + 5 modules (concatenated)/modules-2/e.js',
          statSize: 22
        }
      ]
    }
  ]
};
