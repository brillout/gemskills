/** The data behind every page, ../data/skills.json, and what the pages derive from it. */

import raw from "../data/skills.json";
import { esc, href, plural } from "./format.ts";
import {
  bundleRepo,
  github,
  type Bundle,
  type BundleSkill,
  type Data,
  type Facet,
  type Registry,
  type Skill,
  type Tldr,
} from "./types.ts";

export const data = raw as unknown as Data;
export const GITHUB = "https://github.com/brillout/gemskills";

export const facetById = new Map(data.facets.map((f) => [f.id, f]));
export const repoById = new Map(data.repos.map((r) => [r.id, r]));
export const skillById = new Map(data.skills.map((s) => [s.id, s]));
export const bundleById = new Map(data.bundles.map((b) => [b.id, b]));
/** The bundle a skill is in, and its place there. */
export const bundleOf = new Map<string, BundleSkill & { bundle: Bundle; index: number }>();
for (const bundle of data.bundles)
  bundle.skills.forEach((m, index) => bundleOf.set(m.id, { ...m, bundle, index }));
/** Whether a skill gets an entry of its own in the skills list, rather than only inside its bundle. */
export const ownEntry = (s: Skill) => bundleOf.get(s.id)?.standalone ?? true;
export const isBundle = (e: Skill | Bundle): e is Bundle => "install" in e;
export const skillsOf = (b: Bundle) => b.skills.map(({ id }) => skillById.get(id) as Skill);
export const REGISTRIES: Record<Registry, string> = {
  "skills.sh": "skills.sh",
  "clawhub.ai": "ClawHub",
  "skillhub.cn": "Tencent SkillHub",
};
export const registriesOf = (s: Skill) =>
  (Object.keys(REGISTRIES) as Registry[]).filter((r) => s[r]);

/** Tags are `facet:value`, except topics, which are written without a prefix. */
export const tagOf = (facet: Facet, value: string) =>
  facet.prefix === false ? value : `${facet.id}:${value}`;
export const facetOf = (tag: string) =>
  tag.includes(":") ? tag.slice(0, tag.indexOf(":")) : "topic";
export const tagInfo = new Map<string, string>();
const labels = new Map<string, string>();
/** The parents each tag has through `includes`, such as category:software-engineering for category:debugging. */
const parents = new Map<string, string[]>();
for (const facet of data.facets)
  for (const v of facet.values) {
    const tag = tagOf(facet, v.id);
    if (v.description) tagInfo.set(tag, v.description);
    if (v.label) labels.set(tag, v.label);
    for (const child of v.includes ?? [])
      parents.set(tagOf(facet, child), [...(parents.get(tagOf(facet, child)) ?? []), tag]);
  }
/** A tag's name for chips, when it has one besides the tag itself. */
export const tagLabel = (tag: string) => labels.get(tag);
/** The values a parent tag includes, as tags. */
export const includedBy = (tag: string) =>
  [...parents].filter(([, of]) => of.includes(tag)).map(([child]) => child);
/** The parents a tag has through `includes`. */
export const parentsOf = (tag: string) => parents.get(tag) ?? [];
const withParents = new Map(
  data.skills.map((s) => [
    s.id,
    [...s.tags, ...new Set(s.tags.flatMap((t) => parents.get(t) ?? []))],
  ]),
);
/** A skill's tags, plus the parents it has through them. */
export const tagsOf = (s: Skill) => withParents.get(s.id) ?? s.tags;

/** The order facets appear in, wherever they're listed. */
export const FACET_ORDER = [
  "category",
  "type",
  "effect",
  "needs",
  "by",
  "topic",
  "stack",
  "flag",
  "lang",
];
/** Tags that call for a look before installing. */
export const CAUTION = ["flag:republished", "flag:deprecated"];

const most = (n: (number | null)[]) => {
  const known = n.filter((x) => x !== null);
  return known.length ? Math.max(...known) : null;
};

// A bundle's numbers are those of its skills: the most installs or downloads any one of them
// has, and the first time one was seen.

/** The GitHub repo a skill lives in, or else its publisher: the id without the skill's own name, such as `clawhub.ai/steipete`. */
export const repoKey = (e: Skill | Bundle) =>
  isBundle(e) ? bundleRepo(e) : (github(e)?.repo ?? e.id.slice(0, e.id.lastIndexOf("/")));
export const starsOf = (e: Skill | Bundle) => {
  const repo = isBundle(e) ? bundleRepo(e) : github(e)?.repo;
  return repo ? (repoById.get(repo)?.stars ?? null) : null;
};
export const installsOf = (e: Skill | Bundle): number | null =>
  isBundle(e) ? most(skillsOf(e).map(installsOf)) : (e["skills.sh"]?.installs ?? null);
export const firstSeenOf = (e: Skill | Bundle): string | null =>
  isBundle(e)
    ? (skillsOf(e).map(firstSeenOf).filter(Boolean).sort()[0] ?? null)
    : (e["skills.sh"]?.firstSeen ?? null);
/** Installs per week on skills.sh over 8 weeks, oldest first; a bundle's are its skill's with the most installs in the latest week. */
export const weeklyOf = (e: Skill | Bundle): number[] | null =>
  isBundle(e)
    ? (skillsOf(e)
        .map(weeklyOf)
        .filter((w) => w !== null)
        .sort((a, b) => b[b.length - 1] - a[a.length - 1])[0] ?? null)
    : (e["skills.sh"]?.weeklyInstalls ?? null);
/** How much a skill's weekly installs grew over the 8 weeks: what Hot ranks by. */
export const gainOf = (e: Skill | Bundle): number | null => {
  const weekly = weeklyOf(e);
  return weekly && weekly.length ? weekly[weekly.length - 1] - weekly[0] : null;
};
/** The registries that count downloads rather than installs. */
export const DOWNLOADS = ["clawhub.ai", "skillhub.cn"] as const;
export const downloadsOf = (e: Skill | Bundle): number | null =>
  isBundle(e)
    ? most(skillsOf(e).map(downloadsOf))
    : most(DOWNLOADS.map((r) => e[r]?.downloads ?? null));

/** Compare for a descending sort, unknown values last. */
export const desc = (a: number | null, b: number | null) => (b ?? -1) - (a ?? -1);

/** An id as URL path segments; `@` stays as is. */
export const idPath = (id: string) =>
  id
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/%40/g, "@"))
    .join("/");
/** The skill's own page. */
export const skillHref = (id: string) => href(`skill/${idPath(id)}/`);
/** The bundle's page. */
export const bundleHref = (id: string) => href(`bundle/${idPath(id)}/`);

/** A TLDR's glance as a list of labelled facts, or its first `max` items. */
export function glanceHtml(glance: Tldr["glance"], max = glance.length): string {
  const items = glance
    .slice(0, max)
    .map(({ label, text }) => `<div><dt>${esc(label)}</dt><dd>${esc(text)}</dd></div>`);
  return `<dl class="glance">${items.join("")}</dl>`;
}

/** A tag, as a link to `link`, or with no link as a toggle for the skills list's filters. */
export function tagChip(tag: string, link: string | null, pressed = false): string {
  const info = tagInfo.get(tag);
  const attrs = `class="tag" data-tag="${esc(tag)}" data-facet="${esc(facetOf(tag))}"${info ? ` title="${esc(info)}"` : ""}`;
  return link === null
    ? `<button type="button" ${attrs} aria-pressed="${pressed}">${esc(tag)}</button>`
    : `<a ${attrs} href="${link}">${esc(tag)}</a>`;
}

/** A commit as its first 7 characters, a digest as its first 12. */
export const short = (version: string) =>
  /^[0-9a-f]{40}$/.test(version)
    ? version.slice(0, 7)
    : version.replace(/^(\w+:\w{12})\w+$/, "$1…");

/** The TLDR's prose, and what it summarizes: `what` at the permalink's commit, which has changed by `skew` words since. */
export function tldrHtml(tldr: Tldr, what: string, skew: number): string {
  const commit = /\/(?:tree|blob)\/([0-9a-f]{40})/.exec(tldr.permalink)?.[1] ?? "";
  return `
    <section class="tldr" aria-labelledby="tldr">
      <h2 id="tldr">TLDR</h2>
      ${tldr.text
        .split(/\n\s*\n/)
        .map((p) => `<p>${esc(p)}</p>`)
        .join("")}
      <p class="muted">Summarizes <a href="${esc(tldr.permalink)}">${esc(what)} at ${short(commit)}</a>.${
        skew
          ? ` ${what === "the skill" ? "Its SKILL.md has" : "Its skills have"} changed by ${plural(skew, "word")} since.`
          : ""
      }</p>
    </section>`;
}
