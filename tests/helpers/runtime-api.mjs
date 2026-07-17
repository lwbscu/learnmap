import fs from "node:fs";
import vm from "node:vm";
import { runtimePath } from "./paths.mjs";

let cached;

export function loadRuntimeTestApi() {
  if (cached) return cached;
  const listeners = new Map();
  const context = {
    Blob,
    File,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    URL,
    clearTimeout,
    console,
    crypto: globalThis.crypto,
    setTimeout,
    structuredClone
  };
  context.window = context;
  context.globalThis = context;
  context.document = {
    readyState: "loading",
    addEventListener(type, listener) { listeners.set(type, listener); }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(runtimePath(), "utf8"), context, { filename: runtimePath() });
  if (!context.LearnMapAnnotations?.__test) {
    throw new Error("annotation-notes.js must expose window.LearnMapAnnotations.__test");
  }
  cached = context.LearnMapAnnotations.__test;
  return cached;
}
