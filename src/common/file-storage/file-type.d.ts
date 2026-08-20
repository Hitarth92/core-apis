// file-type@22 is ESM-only and exposes its types via package.json "exports", which
// this project's tsconfig can't see (resolvePackageJsonExports is off). Loaded via
// dynamic import() at runtime (works fine in Node); this just gives it a type.
declare module "file-type" {
  export function fileTypeFromBuffer(buffer: Buffer): Promise<{ ext: string; mime: string } | undefined>;
}
