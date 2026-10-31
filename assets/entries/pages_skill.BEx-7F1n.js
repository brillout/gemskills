import{t as e}from"../chunks/chunk-DK3Fl9T5.js";import{i as t,n,r,t as i}from"../chunks/chunk-BVY3ZfaF.js";import{A as a,D as o,E as s,F as c,I as l,O as u,P as d,T as f,_ as p,f as m,g as h,h as g,j as _,m as v,p as y,u as b,v as x,w as S,x as C,y as w}from"../chunks/chunk-CyVZxfSg.js";import{n as T}from"../chunks/chunk-QnCpk2e9.js";var E=e({default:()=>j});function D(e,{version:t}){let n=l(e);if(n)return`<a href="https://github.com/${r(n.repo)}/blob/${t}/${r(encodeURI(n.dir?`${n.dir}/SKILL.md`:`SKILL.md`))}">${r(n.repo)} at ${s(t)}</a>`;let i=e.id.split(`/`)[0],a=e[`clawhub.ai`];return i===`clawhub.ai`?`${a?.url?`<a href="${r(a.url)}">ClawHub</a>`:`ClawHub`}, version ${r(t)}`:i===`skillhub.cn`?`Tencent SkillHub, version ${r(t)}`:`<a href="https://${r(i)}/.well-known/skills/index.json">${r(i)}</a>, ${r(s(t))}`}function O(e){let t=l(e),i=t?S.get(t.repo):void 0,a=e[`skills.sh`],o=[];a?.installs!=null&&o.push(`<div><dt>Installs</dt><dd>${a.installs.toLocaleString(`en`)} <span class="muted">on skills.sh, ${n(p.asOf.installs)}</span></dd></div>`);for(let t of m){let i=e[t]?.downloads;i!==void 0&&o.push(`<div><dt>Downloads</dt><dd>${i.toLocaleString(`en`)} <span class="muted">on ${r(v[t])}, ${n(p.asOf.downloads)}</span></dd></div>`)}return i?.stars!=null&&o.push(`<div><dt>Repo stars</dt><dd>${i.stars.toLocaleString(`en`)} <span class="muted">${r(i.id)}</span></dd></div>`),a?.firstSeen&&o.push(`<div><dt>First seen</dt><dd>${n(a.firstSeen)} <span class="muted">on skills.sh</span></dd></div>`),`<dl class="facts">${o.join(``)}</dl>`}function k(e){let t=new Map;for(let n of d(e))t.set(w(n),[...t.get(w(n))??[],n]);return`<table class="tag-detail">${y.filter(e=>t.has(e)).map(e=>{let n=t.get(e)??[],i=e===`topic`||e===`stack`?[]:n.filter(e=>_.has(e));return`
      <tr>
        <th scope="row">${r(x.get(e)?.name??e)}</th>
        <td>
          <div class="tags">${n.map(e=>a(e,b({tags:[e]}))).join(``)}</div>
          ${i.map(e=>`<p class="tag-meaning">${r(_.get(e)??``)}</p>`).join(``)}
        </td>
      </tr>`}).join(``)}</table>`}function A(e){let t=h.get(e.id);if(!t)return``;let{bundle:n,index:i,standalone:a,note:s}=t,c=(e,t)=>{let i=n.skills[e]?.id;return i?` · ${t}: <a href="${u(i)}">${r(o.get(i)?.name??i)}</a>`:``};return`
    <p class="in-bundle">Skill ${i+1} of ${n.skills.length} in the <a href="${g(n.id)}">${r(n.name)}</a> bundle${c(i-1,`Before it`)}${c(i+1,`After it`)}</p>
    ${a?``:`<p class="note">Only works inside its bundle: ${r(s??``)} Install <a href="${g(n.id)}">${r(n.name)}</a> instead.</p>`}`}function j(e){let{skill:a,copy:o}=e.data,s=l(a),u=a[`skills.sh`],d=a[`clawhub.ai`],m=a.skillMd,_=m?.removed,v=_&&m?m.version:`HEAD`,y=[u?`<a href="${r(u.url)}">skills.sh page</a>`:``,d?.url?`<a href="${r(d.url)}">ClawHub page</a>`:``,s?`<a href="https://github.com/${r(s.repo)}${s.dir||_?`/tree/${v}/${r(encodeURI(s.dir))}`:``}">Source on GitHub</a>`:``,`<a href="${b({repo:f(a)})}">All skills from ${r(f(a))}</a>`].filter(Boolean),x=[u?.install,d?.install].filter(e=>!!e),S=h.get(a.id)?.bundle;return`
    <div class="page skill-page">
      <p class="crumbs"><a href="${t()}">Skills</a> <span aria-hidden="true">/</span> <a href="${b({repo:f(a)})}">${r(f(a))}</a>${S?` <span aria-hidden="true">/</span> <a href="${g(S.id)}">${r(S.name)}</a>`:``}</p>
      <h1>${r(a.name)}</h1>
      ${a.tldr?.glance.length?`<section class="at-a-glance" aria-label="At a glance">${C(a.tldr.glance)}</section>`:`<p class="lede">${r(a.description)}</p>`}
      ${A(a)}
      ${a.note?`<p class="note">${r(a.note)}</p>`:``}
      ${_?`<p class="note">Gone from ${s?r(s.repo):`its registry`} since ${n(_)}, so installing it no longer works. The SKILL.md below is its last version.</p>`:``}
      ${a.tldr?c(a.tldr,`the skill`,a.skillMd?.skew??0):``}
      <div class="details-grid">
        <div>
          ${x.length?x.map(e=>`<div class="install"><code>${r(e)}</code><button type="button" class="copy" data-copy="${r(e)}">Copy</button></div>`).join(``):`<p class="muted">No install command known for this registry.</p>`}
          <p class="links">${y.join(` · `)}</p>
          ${O(a)}
        </div>
        ${u?.weeklyInstalls?T(u.weeklyInstalls,p.asOf.installs,i):``}
      </div>
      ${k(a)}
      <section class="skill-md" aria-labelledby="skill-md">
        <h2 id="skill-md">SKILL.md</h2>
        ${o&&m?`<p class="muted">From ${D(a,m)}. Checked daily, last changed ${n(m.updated)}.</p>
        ${o.frontmatter?`<details class="frontmatter"><summary>Frontmatter</summary><pre><code>${r(o.frontmatter)}</code></pre></details>`:``}
        <div class="markdown">${o.html}</div>`:`<p class="muted">No copy of its SKILL.md yet.</p>`}
      </section>
    </div>`}var M={hasServerOnlyHook:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:!0}},isClientRuntimeLoaded:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:!1}},onBeforeRenderEnv:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:null}},dataEnv:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:{server:!0}}},guardEnv:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:null}},Page:{type:`standard`,definedAtData:{filePathToShowToUser:`/pages/skill/+Page.ts`,fileExportPathToShowToUser:[]},valueSerialized:{type:`plus-file`,exportValues:E}}};export{M as configValuesSerialized};