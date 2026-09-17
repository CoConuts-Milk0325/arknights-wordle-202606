import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

export async function resolve(specifier, context, nextResolve) {
  const { parentURL = null } = context;

  if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
    if (parentURL) {
      const parentDir = path.dirname(fileURLToPath(parentURL));
      const targetPath = path.resolve(parentDir, specifier);
      if (fs.existsSync(targetPath + '.js')) {
        return {
          url: pathToFileURL(targetPath + '.js').href,
          shortCircuit: true
        };
      }
      if (fs.existsSync(path.join(targetPath, 'index.js'))) {
        return {
          url: pathToFileURL(path.join(targetPath, 'index.js')).href,
          shortCircuit: true
        };
      }
    }
  }

  return nextResolve(specifier, context);
}
