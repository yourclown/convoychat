import { time } from "uniqid";

const generateUsername = (name: string): string => {
  const specials = /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/gi;
  const sanitized = name.toLowerCase().replace(specials, "");
  const uniqueId = time();
  return `${sanitized}-${uniqueId}`;
};

const getColorLuminance = (color: string): number => {
  // https://stackoverflow.com/a/12043228/10629172
  const c = color.substring(1); // strip #
  const rgb = parseInt(c, 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
  return luma;
};

const isColorTooDark = (color: string): boolean =>
  getColorLuminance(color) < 40;

const youtubeChannelRegEx = /(https?:\/\/)?(www\.)?youtu((\.be)|(be\..{2,5}))\/((user)|(channel))\/?([a-zA-Z0-9\-_]{1,})/;
const instagramUsernameRegex = /(?:(?:http|https):\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9-_\.]+)/;
const githubUsernameRegex = /https\:\/\/github\.com\/[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;
const twitterUsernameRegex = /https\:\/\/twitter\.com\/[a-zA-Z0-9_]{1,15}$/;

const b64decode = (s: string) => Buffer.from(s, "base64").toString("ascii");
const b64encode = (s: string) => Buffer.from(s).toString("base64");

export {
  b64decode,
  b64encode,
  generateUsername,
  getColorLuminance,
  isColorTooDark,
  youtubeChannelRegEx,
  instagramUsernameRegex,
  githubUsernameRegex,
  twitterUsernameRegex,
};
