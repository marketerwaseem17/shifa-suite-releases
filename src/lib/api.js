// Thin accessor for the IPC bridge exposed by electron/preload.cjs.
// Throws clearly if the app is somehow opened outside Electron (e.g. `vite preview`
// in a plain browser) so the failure is obvious during development.
export function getApi() {
  if (typeof window !== 'undefined' && window.shifa) return window.shifa
  throw new Error('Shifa Suite native bridge is unavailable — this UI must run inside the Electron app.')
}

export const api = new Proxy(
  {},
  {
    get(_target, moduleName) {
      return new Proxy(
        {},
        {
          get(_t, methodName) {
            return (...args) => getApi()[moduleName][methodName](...args)
          },
        }
      )
    },
  }
)
