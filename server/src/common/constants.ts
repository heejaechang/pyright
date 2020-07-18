// Not using package.json, as it may contain sensitive info.
import { pyrightCommit, version } from './metadata.json';

const _VERSION = process.env.NUGETPACKAGEVERSION || version || '';
const _PYRIGHT_COMMIT = pyrightCommit || 'unknown';

export { _VERSION as VERSION, _PYRIGHT_COMMIT as PYRIGHT_COMMIT };
