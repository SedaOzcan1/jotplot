declare module '#app' {
  interface PageMeta {
    /** Page title shown in the top bar and the desktop heading. */
    title?: string
    /** The page has its own mode switch, so the mobile top bar hides its copy. */
    modeSwitchInPage?: boolean
  }
}

export {}
