/** True when the page is loaded inside an iframe (e.g., map.html sidebar). */
export const IS_IFRAME = typeof window !== 'undefined' && window !== window.top
