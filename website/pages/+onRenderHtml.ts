import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { PageContextServer } from "vike/types";
import { href } from "../format.ts";
import { VIEWS } from "../list.ts";
import { GITHUB } from "../skills.ts";
import "../style.css";

/** A page's `Page` returns the HTML of its `<main>`. */
export type Page = (pageContext: PageContextServer) => string;

const NAV = [...Object.values(VIEWS).map((v) => [v.path, v.label]), ["tags/", "Tags"]];

export function onRenderHtml(pageContext: PageContextServer) {
  const { title, description } = pageContext.config;
  const value = (v: typeof title) => (typeof v === "function" ? v(pageContext) : (v ?? ""));
  // Skill and bundle pages belong to Top. Pre-rendering passes paths without their trailing slash.
  const path = pageContext.urlPathname.replace(/^\/((skill|bundle)\/.*)?/, "").replace(/\/$/, "");
  const nav = NAV.map(
    ([to, label]) =>
      `<a href="${href(to)}"${to.replace(/\/$/, "") === path ? ` aria-current="page"` : ""}>${label}</a>`,
  ).join("");
  const main = (pageContext.Page as Page)(pageContext);
  return escapeInject`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${value(title)}</title>
    <meta name="description" content="${value(description)}" />
    <link rel="icon" type="image/svg+xml" href="${href("gem.svg")}" />
  </head>
  <body>
    <header id="topbar">
      <a id="brand" href="${href()}">
        <img src="${href("gem.svg")}" alt="" width="30" height="30" />
        <span>Gem Skills</span>
      </a>
      <nav id="views" aria-label="Views">${dangerouslySkipEscape(nav)}</nav>
      <a id="source-link" href="${GITHUB}">GitHub</a>
    </header>
    <main id="app">${dangerouslySkipEscape(main)}</main>
  </body>
</html>`;
}
