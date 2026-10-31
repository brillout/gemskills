import{t as e}from"../chunks/chunk-DK3Fl9T5.js";import{a as t,i as n,n as r,r as i,t as a}from"../chunks/chunk-BVY3ZfaF.js";import{C as o,F as s,O as c,T as l,_ as u,b as d,k as f,u as p,w as m,x as h}from"../chunks/chunk-CyVZxfSg.js";var g=e({default:()=>y});function _(e){let t=m.get(l(e)),n=f(e).toSorted((e,t)=>(o(t)??-1)-(o(e)??-1))[0],a=o(n),s=d(e),p=[];return a!==null&&p.push(`<div><dt>Installs</dt><dd>${a.toLocaleString(`en`)} <span class="muted">of <a href="${c(n.id)}">${i(n.name)}</a>, its most installed skill, on skills.sh, ${r(u.asOf.installs)}</span></dd></div>`),t?.stars!=null&&p.push(`<div><dt>Repo stars</dt><dd>${t.stars.toLocaleString(`en`)} <span class="muted">${i(t.id)}</span></dd></div>`),s&&p.push(`<div><dt>First seen</dt><dd>${r(s)} <span class="muted">on skills.sh, its first skill</span></dd></div>`),`<dl class="facts">${p.join(``)}</dl>`}function v(e){return`<ol class="bundle-skills">${e.skills.map(({id:t,standalone:n,note:r},s)=>{let l=f(e)[s],u=o(l);return`
      <li>
        <div class="skill-head">
          <h3><a class="skill-name" href="${c(t)}">${i(l.name)}</a></h3>
          ${n?``:`<span class="kind">Only in the bundle</span>`}
          ${u===null?``:`<span class="metric"><strong>${a(u)}</strong> installs</span>`}
        </div>
        <p class="skill-desc">${i(l.description)}</p>
        ${r?`<p class="member-note">${i(r)}</p>`:``}
      </li>`}).join(``)}</ol>`}function y(e){let{bundle:r}=e.data,a=l(r),o=r.skills.filter(e=>e.standalone).length;return`
    <div class="page skill-page bundle-page">
      <p class="crumbs"><a href="${n()}">Skills</a> <span aria-hidden="true">/</span> <a href="${p({repo:a})}">${i(a)}</a></p>
      <h1>${i(r.name)} <span class="kind">Bundle · ${t(r.skills.length,`skill`)}</span></h1>
      ${r.tldr?.glance.length?`<section class="at-a-glance" aria-label="At a glance">${h(r.tldr.glance)}</section>`:`<p class="lede">${i(r.description)}</p>`}
      ${r.tldr?s(r.tldr,`the repo`,r.skew):``}
      <div class="details-grid">
        <div>
          ${r.install.map(({label:e,command:t})=>`<p class="install-label">${i(e)}</p><div class="install"><code>${i(t)}</code><button type="button" class="copy" data-copy="${i(t)}">Copy</button></div>`).join(``)}
          <p class="links"><a href="https://github.com/${i(a)}">Source on GitHub</a> · <a href="${p({repo:a})}">All skills from ${i(a)}</a></p>
          ${_(r)}
        </div>
      </div>
      <section aria-labelledby="skills">
        <h2 id="skills">Its skills, in the order they're used</h2>
        <p class="muted">${o===r.skills.length?`Each also works alone, so each also has its own entry in the skills list.`:`The ones marked “Only in the bundle” need the rest of it, so they're only listed here. The others also have their own entry in the skills list.`}</p>
        ${v(r)}
      </section>
    </div>`}var b={hasServerOnlyHook:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:!0}},isClientRuntimeLoaded:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:!1}},onBeforeRenderEnv:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:null}},dataEnv:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:{server:!0}}},guardEnv:{type:`computed`,definedAtData:null,valueSerialized:{type:`js-serialized`,value:null}},Page:{type:`standard`,definedAtData:{filePathToShowToUser:`/pages/bundle/+Page.ts`,fileExportPathToShowToUser:[]},valueSerialized:{type:`plus-file`,exportValues:g}}};export{b as configValuesSerialized};