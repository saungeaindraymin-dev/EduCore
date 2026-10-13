// Lessons link out to video — we don't host it. YouTube and Vimeo links can play inside the
// lesson; anything else opens in a new tab.

/** The player URL for a YouTube or Vimeo link, or null when it's some other site. */
export function videoEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");

  // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    youtubeId =
      url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ??
      null;
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    // The no-cookie domain doesn't track viewers until they press play
    return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
  }

  // vimeo.com/ID or player.vimeo.com/video/ID
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vimeoId = url.pathname.match(/(\d{6,12})/)?.[1];
    if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  }
  return null;
}

/** A short name for where the video lives, e.g. "YouTube" or "drive.google.com" */
export function videoHost(link: string) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host.endsWith("youtube.com")) return "YouTube";
    if (host.endsWith("vimeo.com")) return "Vimeo";
    return host;
  } catch {
    return "link";
  }
}
