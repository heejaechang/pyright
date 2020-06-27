// Not using package.json, as it may contain sensitive info.
import { version } from './version.json';

const _VERSION = process.env.NUGETPACKAGEVERSION || version || '';
export { _VERSION as VERSION };
