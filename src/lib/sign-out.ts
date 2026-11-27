/**
 * What the tabs of one browser need to know about signing out. Signing out
 * disconnects live pages, so each tab has to expect that and leave cleanly.
 */

const CHANNEL = "huddle-session";

let leaving = false;

/** True while this tab is being signed out: nothing unsent can be saved any more. */
export const isSigningOut = () => leaving;

export function setSigningOut(value: boolean) {
  leaving = value;
}

/** Tell the other tabs in this browser that the person has signed out. */
export function announceSignOut() {
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage("signed-out");
  channel.close();
}

/** Returns the function that stops listening. */
export function onSignedOut(listener: () => void) {
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    leaving = true;
    listener();
  };
  return () => channel.close();
}
