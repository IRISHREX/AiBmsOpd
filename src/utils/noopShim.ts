// No-op shim for native code-generation utilities in web environment
export default function codegenNativeComponent(name: string, _options?: any) {
  return name;
}

export const codegenNativeCommands = () => ({});
