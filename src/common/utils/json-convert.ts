import { IConstructor } from "./i-constructor";

export const fromJson = <T>(str: string, type?: IConstructor<T>, defVal?: T): T => {
  try {
    return type != null ? Object.assign<T, T>(new type(), JSON.parse(str) as T) : JSON.parse(str);
  } catch {
    return defVal ?? null;
  }
};

export const toJson = (obj: unknown): string => {
  return JSON.stringify(obj);
};
