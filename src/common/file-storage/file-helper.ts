import { extname, basename, dirname, join } from "path";
import { EMPTY_STR, isNil } from "..";
import { IComparePathOptions, IFileName, IFileType } from "./types";
import { ArgumentNilException } from "../exceptions";
import * as Papa from "papaparse";

export class FileHelper {
  private readonly allowedMimeTypes?: string[];
  protected delimiter: string;

  constructor(allowedMimeType?: string[], delimiter?: string) {
    this.allowedMimeTypes = allowedMimeType?.map((x) => x.toLowerCase()) ?? null;
    this.delimiter = delimiter ?? "/";
  }

  public arePathesEqual(x: string, y: string, opts: IComparePathOptions = {}): boolean {
    if (isNil(x)) throw new ArgumentNilException("'x' is nil");
    if (isNil(y)) throw new ArgumentNilException("'y' is nil");

    if (opts.ignoreCase) {
      x = x.toLowerCase();
      y = y.toLowerCase();
    }
    const xFile = this.getFileName(x);
    const yFile = this.getFileName(y);
    const extEq = opts.skipExt || xFile.ext === yFile.ext;
    const fileNameEq = xFile.fileName === yFile.fileName;
    const locationEq = opts.skipLocation || xFile.location === yFile.location;
    return extEq && fileNameEq && locationEq;
  }

  public joinPath(name: IFileName): string {
    // S3 bucket not working with path delimiter "\"(creating like one fileName paired\6400eb8012afb93dc4580f42\6400eb8e12afb93dc4580f45.jpg),
    // so need replace to "/" for correct folder structure
    return join(name.location, `${name.fileName}.${name.ext}`).replace(/\\/g, this.delimiter);
  }

  public getFileName(path: string): IFileName {
    const ext = extname(path) ?? EMPTY_STR;
    const fileName = basename(path, ext) ?? EMPTY_STR;
    const location = dirname(path) ?? EMPTY_STR;
    return { fileName, ext: ext.substring(1), location };
  }

  public async getExtFromBufferAsync(data: Buffer): Promise<IFileType> {
    // file-type is ESM-only since v17 — dynamic import from this CommonJS module.
    const { fileTypeFromBuffer } = await import("file-type");
    const type = await fileTypeFromBuffer(data);
    if (!isNil(type)) {
      return type;
    }

    // Check for CSV by trying to parse it
    const parseResult = Papa.parse(data.toString("utf8"));
    if (parseResult.errors.length === 0) {
      return { ext: "csv", mime: "text/csv" };
    }

    // JSON data Checks
    try {
      JSON.parse(data.toString("utf8"));
      return { ext: "json", mime: "application/json" };
    } catch {
      return null; // This is the last check, null is returned from here
    }
  }

  public async isAllowedMimeAsync(buffer: Buffer): Promise<boolean> {
    const type = await this.getExtFromBufferAsync(buffer);
    if (isNil(type)) {
      return false;
    }
    return this.isAllowedMime(type.mime);
  }

  public isAllowedMime(mime: string): boolean {
    return mime && (isNil(this.allowedMimeTypes) || (!isNil(this.allowedMimeTypes) && this.allowedMimeTypes.includes(mime.toLowerCase())));
  }
}
