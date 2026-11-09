
import env from "../../../config/env.js";

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const setRefreshCookie = (res, token) => {
  res.cookie(
    env.COOKIE_NAME,
    token,
    getRefreshCookieOptions()
  );
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/api/auth"
  });
};
