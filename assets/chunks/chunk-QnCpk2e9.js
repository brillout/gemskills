var e=new Intl.DateTimeFormat(`en`,{month:`short`,day:`numeric`,timeZone:`UTC`});function t(t,n){let r=Date.parse(`${t}T00:00:00Z`);return Array.from({length:n},(t,i)=>e.format(new Date(r-(n-1-i)*7*864e5)))}function n(e){let t=Math.max(...e,1);return{x:t=>6+t*228/(e.length-1),y:e=>50-e/t*44}}function r(e,r,i){let a=t(r,e.length),{x:o,y:s}=n(e),c=e[0],l=e[e.length-1],u=c>0?Math.round((l-c)/c*100):null,d=e.map((e,t)=>`${o(t).toFixed(1)},${s(e).toFixed(1)}`).join(` `),f=e.map((e,t)=>`week to ${a[t]}: ${e.toLocaleString(`en`)}`).join(`; `),p=e.map((e,t)=>`<tr><td>${a[t]}</td><td>${e.toLocaleString(`en`)}</td></tr>`).join(``);return`
    <figure class="stat">
      <figcaption class="stat-label">Weekly installs</figcaption>
      <div class="stat-value">${i(l)}</div>
      <div class="stat-delta">${u===null?``:`${u>0?`+`:``}${u}% over 8 weeks · `}week to ${a[a.length-1]}</div>
      <div class="spark" tabindex="0" role="group"
        aria-label="Weekly installs, ${f}. Use the left and right arrow keys to read each week."
        data-values="${e.join(`,`)}" data-weeks="${a.join(`|`)}">
        <svg viewBox="0 0 240 56" aria-hidden="true">
          <line class="spark-base" x1="6" x2="234" y1="50" y2="50" />
          <polyline class="spark-line" points="${d}" />
          <line class="spark-cross" y1="0" y2="56" x1="0" x2="0" visibility="hidden" />
          <circle class="spark-now" r="4" cx="${o(e.length-1).toFixed(1)}" cy="${s(l).toFixed(1)}" />
          <circle class="spark-hover" r="4" visibility="hidden" />
        </svg>
        <div class="spark-tip" aria-live="polite" hidden><strong></strong><span></span></div>
      </div>
      <details class="spark-table">
        <summary>Weekly values</summary>
        <table>
          <thead><tr><th scope="col">Week to</th><th scope="col">Installs</th></tr></thead>
          <tbody>${p}</tbody>
        </table>
      </details>
    </figure>`}function i(e){for(let t of e.querySelectorAll(`.spark:not([data-mounted])`)){t.dataset.mounted=``;let e=(t.dataset.values??``).split(`,`).map(Number),r=(t.dataset.weeks??``).split(`|`),i=t.querySelector(`svg`),a=t.querySelector(`.spark-cross`),o=t.querySelector(`.spark-hover`),s=t.querySelector(`.spark-tip`),c=s?.querySelector(`strong`),l=s?.querySelector(`span`);if(!i||!a||!o||!s||!c||!l||e.length<2)continue;let{x:u,y:d}=n(e),f=e.length-1,p=t=>{f=Math.max(0,Math.min(e.length-1,t));let n=u(f).toFixed(1);a.setAttribute(`x1`,n),a.setAttribute(`x2`,n),a.setAttribute(`visibility`,`visible`),o.setAttribute(`cx`,n),o.setAttribute(`cy`,d(e[f]).toFixed(1)),o.setAttribute(`visibility`,`visible`),c.textContent=`${e[f].toLocaleString(`en`)} installs`,l.textContent=`week to ${r[f]}`,s.style.left=`${u(f)/240*100}%`,s.hidden=!1},m=()=>{a.setAttribute(`visibility`,`hidden`),o.setAttribute(`visibility`,`hidden`),s.hidden=!0};t.addEventListener(`pointermove`,t=>{let n=i.getBoundingClientRect(),r=(t.clientX-n.left)/n.width*240;p(Math.round((r-6)/228*(e.length-1)))}),t.addEventListener(`pointerleave`,()=>{document.activeElement!==t&&m()}),t.addEventListener(`focus`,()=>p(f)),t.addEventListener(`blur`,m),t.addEventListener(`keydown`,t=>{let n={ArrowLeft:-1,ArrowRight:1}[t.key];if(n)p(f+n);else if(t.key===`Home`)p(0);else if(t.key===`End`)p(e.length-1);else return;t.preventDefault()})}}export{r as n,i as t};