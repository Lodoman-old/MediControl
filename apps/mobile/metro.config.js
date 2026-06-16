// Metro config para monorepo pnpm.
// Permite a Metro resolver paquetes del workspace y observar la raiz del monorepo.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Vigilar todo el monorepo para detectar cambios en packages compartidos.
config.watchFolders = [workspaceRoot];

// 2. Resolver dependencias desde el node_modules local y la raiz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Habilitar resolucion de symlinks (clave para workspaces).
config.resolver.unstable_enableSymlinks = true;

// 4. Soportar el campo "exports" de package.json (necesario para varias deps modernas).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
