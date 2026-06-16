const $ = (id)=>document.getElementById(id);

let _tavState = null;

// ---------- Render functions (data build + DOM paint, callable independently) ----------
function renderMeta(rng, state){
  const meta = $("tv-meta"); meta.innerHTML="";
  [["Settlement",state.settlement],["Quality",state.quality],["Size",state.size],
   ["Time",state.timeOfDay],["Type",state.tavernType],
   ["Context",state.contextInfluence],["Seed",state.displaySeed]]
    .forEach(([k,v])=>{ const s=document.createElement("span"); s.className="tv-pill"; s.textContent=`${k}: ${v}`; meta.appendChild(s); });

  const { name: tavName, motif } = buildInnName(rng);
  $("tv-sign").innerHTML = `<span class="fw-semibold">Name:</span> ${tavName} <span class="text-secondary small">— sign: ${motif}</span>`;

  $("tv-amb").innerHTML = "";
  buildAmbience(rng, state.settlement, state.quality, state.tavernType).forEach(t=>{
    const span = document.createElement("span"); span.className="tv-tag"; span.textContent=t; $("tv-amb").appendChild(span);
  });
  $("tv-unique").textContent = (rng()*100 < state.uniquePct) ? `Unique touch: ${pick(rng, HOUSE_TWISTS)}.` : "";
}

function renderMeals(rng, state){
  const count = SETTLEMENT[state.settlement].meals + (state.size==="large"?2: state.size==="small"?0:1);
  const meals = buildMeals(rng, count, state.mult, state.tavernType);
  const tbody = $("tv-meals"); tbody.innerHTML="";
  meals.forEach(m=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td data-label="Item">${m.name}</td><td data-label="Description">${m.desc}</td><td data-label="Price">${m.price}</td>`;
    tbody.appendChild(tr);
  });
}

function renderDrinks(rng, state){
  const count = SETTLEMENT[state.settlement].drinks + (state.size==="large"?3: state.size==="small"?0:1);
  const drinks = buildDrinks(rng, count, state.mult, state.tavernType);
  const tbody = $("tv-drinks"); tbody.innerHTML="";
  drinks.forEach(d=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td data-label="Item">${d.name}</td><td data-label="Type">${d.type}</td><td data-label="Notes">${d.notes}</td><td data-label="Price">${d.price}</td>`;
    tbody.appendChild(tr);
  });
}

function renderRooms(rng, state){
  const rooms = buildRooms(rng, state.settlement, state.quality, state.size, state.mult);
  const tbody = $("tv-rooms"); tbody.innerHTML="";
  rooms.forEach(r=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td data-label="Type">${r.type}</td><td data-label="Amenities">${r.am}</td><td data-label="Price / night">${r.price}</td><td data-label="Available">${r.avail}</td>`;
    tbody.appendChild(tr);
  });
}

function renderStaff(rng, state){
  const count = SETTLEMENT[state.settlement].staff + (state.size==="large"?1:0);
  const staff = buildStaff(rng, count, state.tavernType);
  const grid = $("tv-staff"); grid.innerHTML="";
  staff.forEach(s=>{
    const col = document.createElement("div"); col.className="col";
    const card = document.createElement("div"); card.className="tv-card";
    card.innerHTML = `<div class="tv-staff-title">${s.role}</div>
      <div class="small">${s.desc}</div>
      <div class="small text-secondary">Voice: ${s.voice}; Mannerism: ${s.manner}.</div>
      <div class="mt-2">
        <button class="btn btn-outline-info btn-sm w-100 tv-npc-gen-btn"
          data-role="${s.role}"
          data-desc="${s.desc.replace(/"/g, '&quot;')}"
          data-voice="${s.voice.replace(/"/g, '&quot;')}"
          data-manner="${s.manner.replace(/"/g, '&quot;')}">
          <i class="bi bi-person-plus-fill me-1"></i>Generate Full NPC Details
        </button>
      </div>`;
    col.appendChild(card); grid.appendChild(col);
  });
}

function renderPatrons(rng, state){
  const count = Math.floor(rng() * 3) + 3; // 3-5 patrons
  const patrons = buildPatrons(rng, count, state.settlement, state.quality, state.size, state.timeOfDay, state.tavernType);
  const grid = $("tv-patrons"); grid.innerHTML="";
  patrons.forEach(p=>{
    const col = document.createElement("div"); col.className="col";
    const card = document.createElement("div"); card.className="tv-card";
    card.innerHTML = `<div class="tv-patron-desc fw-semibold small">${p.desc}</div>
      <div class="small text-secondary">${p.appearance}</div>
      <div class="small mt-1"><i class="bi bi-activity text-warning"></i> <span class="text-info">${p.hook}</span></div>
      <div class="mt-2">
        <button class="btn btn-outline-secondary btn-sm w-100 tv-patron-npc-btn"
          data-desc="${p.desc.replace(/"/g, '&quot;')}"
          data-appearance="${p.appearance.replace(/"/g, '&quot;')}">
          <i class="bi bi-person-plus-fill me-1"></i>Generate NPC Details
        </button>
      </div>`;
    col.appendChild(card); grid.appendChild(col);
  });
}

function renderEventsSection(rng, state){
  const events = buildEventsOnly(rng, state.settlement, state.quality, state.size, state.timeOfDay, state.tavernType);
  const eventsDiv = $("tv-events"); eventsDiv.innerHTML = "";
  events.forEach(event => {
    const p = document.createElement("p");
    p.className = "mb-2";
    p.innerHTML = `<i class="bi bi-dot text-success"></i> ${event}`;
    eventsDiv.appendChild(p);
  });
}

function renderBartenderRumors(rng, state){
  const bartenderRumors = buildBartenderRumors(rng, state.settlement, state.quality, state.size, state.timeOfDay, state.tavernType);
  const bartenderDiv = $("tv-bartender-rumors"); bartenderDiv.innerHTML = "";
  bartenderRumors.forEach(rumor => {
    const p = document.createElement("p");
    p.className = "mb-2 small";
    p.innerHTML = `<i class="bi bi-chat-left-quote text-info"></i> "${rumor}"`;
    bartenderDiv.appendChild(p);
  });
}

function renderPatronRumors(rng, state){
  const patronRumors = buildPatronRumors(rng, state.settlement, state.quality, state.size, state.timeOfDay, state.tavernType);
  const patronDiv = $("tv-patron-rumors"); patronDiv.innerHTML = "";
  patronRumors.forEach(rumor => {
    const p = document.createElement("p");
    p.className = "mb-2 small";
    p.innerHTML = `<i class="bi bi-chat-left-quote text-warning"></i> "${rumor}"`;
    patronDiv.appendChild(p);
  });
}

// ---------- Generate ----------
function generate(){
  const settlement = $("tv-settlement").value;
  const quality = $("tv-quality").value;
  const size = $("tv-size").value;
  const inputSeed = $("tv-seed").value.trim();
  const timeOfDay = $("tv-timeOfDay").value || "morning";
  const tavernType = $("tv-tavernType").value || "tavern";
  const uniquePct = clamp(+$("tv-uniquepct").value||35,0,100);
  const contextInfluence = +($("tv-contextInfluence")?.value ?? 5);
  const showStaff   = $("tv-showStaff").checked;
  const showRooms   = $("tv-showRooms").checked;
  const showPatrons = $("tv-showPatrons").checked;
  const showEvents  = $("tv-showEvents").checked;

  const numericSeed = inputSeed ? (hashString(inputSeed) >>> 0) : (Math.floor(Math.random() * 2**32) >>> 0);
  const displaySeed = inputSeed || String(numericSeed);

  const metaRng = prandSection(numericSeed, "meta");
  const mult = priceScale(metaRng, settlement, quality);

  _tavState = { settlement, quality, size, timeOfDay, tavernType, uniquePct, contextInfluence, numericSeed, displaySeed, mult };

  renderMeta(metaRng, _tavState);
  renderMeals(prandSection(numericSeed, "meals"), _tavState);
  renderDrinks(prandSection(numericSeed, "drinks"), _tavState);

  const wrapRooms = $("tv-rooms-wrap");
  if(showRooms){ wrapRooms.style.display=""; renderRooms(prandSection(numericSeed, "rooms"), _tavState); }
  else wrapRooms.style.display="none";

  const wrapStaff = $("tv-staff-wrap");
  if(showStaff){ wrapStaff.style.display=""; renderStaff(prandSection(numericSeed, "staff"), _tavState); }
  else wrapStaff.style.display="none";

  const wrapPatrons = $("tv-patrons-wrap");
  if(showPatrons){ wrapPatrons.style.display=""; renderPatrons(prandSection(numericSeed, "patrons"), _tavState); }
  else wrapPatrons.style.display="none";

  const wrapEvents = $("tv-events-wrap");
  const wrapRumors = $("tv-rumors-wrap");
  if(showEvents){
    wrapEvents.style.display="";
    wrapRumors.style.display="";
    renderEventsSection(prandSection(numericSeed, "events"), _tavState);
    renderBartenderRumors(prandSection(numericSeed, "rumors"), _tavState);
    renderPatronRumors(prandSection(numericSeed, "whispers"), _tavState);
  }else{
    wrapEvents.style.display="none";
    wrapRumors.style.display="none";
  }
}

// ---------- Per-section reroll / copy ----------
function rerollSection(section){
  if(!_tavState) return;
  const rng = mulberry32(Math.floor(Math.random() * 2**32) >>> 0);
  if(section==="meals")   return renderMeals(rng, _tavState);
  if(section==="drinks")  return renderDrinks(rng, _tavState);
  if(section==="rooms")   return renderRooms(rng, _tavState);
  if(section==="staff")   return renderStaff(rng, _tavState);
  if(section==="patrons") return renderPatrons(rng, _tavState);
  if(section==="events")  return renderEventsSection(rng, _tavState);
  if(section==="rumors")  return renderBartenderRumors(rng, _tavState);
  if(section==="whispers") return renderPatronRumors(rng, _tavState);
}

function copySection(section){
  if(!_tavState) return;
  const rowText = sel => [...document.querySelectorAll(sel)].map(tr=>[...tr.children].map(td=>td.innerText).join(" | ")).join("\n");
  const cardText = sel => [...document.querySelectorAll(sel)].map(c=>c.innerText.split("\n").filter(l=>!l.includes("Generate")).join(" — ")).join("\n");
  let text = "";
  if(section==="meals")    text = "Meals:\n" + rowText("#tv-meals tr");
  else if(section==="drinks")  text = "Drinks:\n" + rowText("#tv-drinks tr");
  else if(section==="rooms")   text = "Rooms:\n" + rowText("#tv-rooms tr");
  else if(section==="staff")   text = "Staff:\n" + cardText("#tv-staff .tv-card");
  else if(section==="patrons") text = "Patrons:\n" + cardText("#tv-patrons .tv-card");
  else if(section==="events")  text = "What's Happening:\n" + [...document.querySelectorAll("#tv-events p")].map(p=>p.innerText).join("\n");
  else if(section==="rumors")  text = "Rumors from the Bartender:\n" + [...document.querySelectorAll("#tv-bartender-rumors p")].map(p=>p.innerText).join("\n");
  else if(section==="whispers") text = "Overheard from Patrons:\n" + [...document.querySelectorAll("#tv-patron-rumors p")].map(p=>p.innerText).join("\n");
  if(text.trim()) navigator.clipboard.writeText(text);
}

// ---------- Serialize / Copy / Download ----------
function serializeOut(){
  const nameLine = $("tv-sign").innerText.trim();
  const amb = [...document.querySelectorAll("#tv-amb .tv-tag")].map(x=>x.textContent).join(", ");
  const unique = $("tv-unique").innerText.trim();
  const meals = [...document.querySelectorAll("#tv-meals tr")]
    .map(tr=>`- ${tr.children[0].innerText} | ${tr.children[1].innerText} | ${tr.children[2].innerText}`).join("\n");
  const drinks = [...document.querySelectorAll("#tv-drinks tr")]
    .map(tr=>`- ${tr.children[0].innerText} (${tr.children[1].innerText}) | ${tr.children[2].innerText} | ${tr.children[3].innerText}`).join("\n");
  const rooms = [...document.querySelectorAll("#tv-rooms tr")]
    .map(tr=>`- ${tr.children[0].innerText} | ${tr.children[1].innerText} | ${tr.children[2].innerText} | ${tr.children[3].innerText} available`).join("\n");
  const staff = [...document.querySelectorAll("#tv-staff .tv-card")]
    .map(c=>c.innerText.split("\n").filter(l=>!l.includes("Generate")).join(" — ")).join("\n");
  const patrons = [...document.querySelectorAll("#tv-patrons .tv-card")]
    .map(c=>c.innerText.split("\n").filter(l=>!l.includes("Generate")).join(" — ")).join("\n");

  // Events and rumors
  const events = [...document.querySelectorAll("#tv-events p")]
    .map(p => `- ${p.innerText.replace(/^• /, '')}`).join("\n");
  const bartenderRumors = [...document.querySelectorAll("#tv-bartender-rumors p")]
    .map(p => `- ${p.innerText.replace(/^" /, '').replace(/" $/, '')}`).join("\n");
  const patronRumors = [...document.querySelectorAll("#tv-patron-rumors p")]
    .map(p => `- ${p.innerText.replace(/^" /, '').replace(/" $/, '')}`).join("\n");

  return [
    nameLine,
    amb ? `Ambience: ${amb}` : "",
    unique,
    meals ? "Meals:\n"+meals : "",
    drinks ? "Drinks:\n"+drinks : "",
    rooms ? "Rooms:\n"+rooms : "",
    staff ? "Staff:\n"+staff : "",
    patrons ? "Patrons:\n"+patrons : "",
    events ? "What's Happening at the Tavern:\n"+events : "",
    bartenderRumors ? "Rumors from the Bartender:\n"+bartenderRumors : "",
    patronRumors ? "Rumors Overheard from Patrons:\n"+patronRumors : ""
  ].filter(Boolean).join("\n\n");
}
function copyOut(){
  const text = serializeOut();
  if(text.trim()) navigator.clipboard.writeText(text);
}
function downloadOut(){
  const text = serializeOut();
  if(!text.trim()) return;
  const blob = new Blob([text], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url;
  const rawName = ($("tv-sign").innerText||"").replace(/Name:\s*/,"").replace(/\s*—.*$/,"").trim();
  a.download = `tavern-${(rawName||"inn").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

// ---------- NPC Detail Modal ----------
function showNPCModal(npc){
  // Create modal if it doesn't exist
  let modal = document.getElementById("npcModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "npcModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title" id="npcModalTitle">Full NPC Details</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="npcModalBody"></div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-outline-light" id="npcCopyBtn"><i class="bi bi-clipboard me-1"></i>Copy</button>
            <button type="button" class="btn btn-primary" id="npcOpenInGenBtn"><i class="bi bi-box-arrow-up-right me-1"></i>Open in NPC Gen</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  // Populate modal content
  const body = document.getElementById("npcModalBody");
  body.innerHTML = `
    <div class="npc-details">
      <div class="mb-3">
        <h6 class="text-info">Role</h6>
        <p>${npc.role}</p>
      </div>
      <div class="mb-3">
        <h6 class="text-info">Description</h6>
        <p>${npc.desc}</p>
      </div>
      <div class="mb-3">
        <h6 class="text-info">Voice</h6>
        <p>${npc.voice}</p>
      </div>
      <div class="mb-3">
        <h6 class="text-info">Mannerisms</h6>
        <p>${npc.mannerisms}</p>
      </div>
      <div class="mb-3">
        <h6 class="text-info">Quirk</h6>
        <p>${npc.quirk}</p>
      </div>
      <div class="mb-3">
        <h6 class="text-info">Wants</h6>
        <p>${npc.wants}</p>
      </div>
      <div class="mb-3">
        <h6 class="text-info">Wants to Avoid</h6>
        <p>${npc.avoids}</p>
      </div>
      <div class="mb-3">
        <h6 class="text-info">Secret</h6>
        <p>${npc.secret}</p>
      </div>
    </div>`;

  // Setup copy button
  document.getElementById("npcCopyBtn").onclick = ()=>{
    const text = [
      `Role: ${npc.role}`,
      `Description: ${npc.desc}`,
      `Voice: ${npc.voice}`,
      `Mannerisms: ${npc.mannerisms}`,
      `Quirk: ${npc.quirk}`,
      `Wants: ${npc.wants}`,
      `Wants to Avoid: ${npc.avoids}`,
      `Secret: ${npc.secret}`
    ].join("\n\n");
    navigator.clipboard.writeText(text);
  };

  // Setup "Open in NPC Gen" button
  document.getElementById("npcOpenInGenBtn").onclick = ()=>{
    // Store NPC data in localStorage for NPC Gen to pick up
    const npcData = {
      fromTavern: true,
      role: npc.role,
      desc: npc.desc,
      voice: npc.voice,
      mannerisms: npc.mannerisms,
      quirk: npc.quirk,
      wants: npc.wants,
      avoids: npc.avoids,
      secret: npc.secret,
      timestamp: Date.now()
    };
    localStorage.setItem("tavern-npc-handoff", JSON.stringify(npcData));
    window.open("npc.html?from=tavern", "_blank");
  };

  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

// Wire up
document.addEventListener("DOMContentLoaded", ()=>{
  $("tv-generate").addEventListener("click", generate);
  $("tv-copy").addEventListener("click", copyOut);
  $("tv-download").addEventListener("click", downloadOut);
  $("tv-clear").addEventListener("click", ()=>{
    _tavState = null;
    ["tv-meta","tv-sign","tv-amb","tv-unique","tv-meals","tv-drinks","tv-rooms","tv-staff","tv-patrons","tv-events","tv-bartender-rumors","tv-patron-rumors"]
      .forEach(id=>{ const el=$(id); if(el) el.innerHTML=""; });
    ["tv-rooms-wrap","tv-staff-wrap","tv-patrons-wrap","tv-events-wrap","tv-rumors-wrap"]
      .forEach(id=>{ const el=$(id); if(el) el.style.display="none"; });
  });

  // Enter key → generate (ignore while typing in a control)
  document.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter") return;
    const tag = document.activeElement?.tagName;
    if(["INPUT","TEXTAREA","SELECT","BUTTON","A"].includes(tag)) return;
    generate();
  });

  // Quick presets
  document.querySelectorAll("[data-preset]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const preset = JSON.parse(btn.dataset.preset);
      Object.entries(preset).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.value = val; });
      generate();
    });
  });

  // Advanced settings toggle
  const advToggle = document.getElementById("tv-adv-toggle");
  const advPanel  = document.getElementById("tv-adv-panel");
  if(advToggle && advPanel){
    advToggle.addEventListener("click", ()=>{
      const opening = advPanel.style.display === "none";
      advPanel.style.display = opening ? "" : "none";
      const icon = advToggle.querySelector("i");
      if(icon){ icon.classList.toggle("bi-chevron-down", !opening); icon.classList.toggle("bi-chevron-up", opening); }
    });
  }

  // Event delegation: reroll / copy-section / collapse / NPC generation
  document.addEventListener("click", (e)=>{
    const rerollBtn = e.target.closest("[data-reroll]");
    if(rerollBtn){ rerollSection(rerollBtn.dataset.reroll); return; }

    const copyBtn = e.target.closest("[data-copy-section]");
    if(copyBtn){ copySection(copyBtn.dataset.copySection); return; }

    const collapseBtn = e.target.closest("[data-collapse-section]");
    if(collapseBtn){
      const target = document.getElementById(collapseBtn.dataset.collapseSection);
      if(target){
        const collapsing = target.style.display !== "none";
        target.style.display = collapsing ? "none" : "";
        const icon = collapseBtn.querySelector("i");
        if(icon){ icon.classList.toggle("bi-chevron-up", !collapsing); icon.classList.toggle("bi-chevron-down", collapsing); }
      }
      return;
    }

    if(e.target.closest(".tv-npc-gen-btn")){
      const btn = e.target.closest(".tv-npc-gen-btn");
      const role = btn.getAttribute("data-role");
      const desc = btn.getAttribute("data-desc");
      const voice = btn.getAttribute("data-voice");
      const manner = btn.getAttribute("data-manner");
      showNPCModal(generateFullNPCFromStaff(role, desc, voice, manner));
      return;
    }

    if(e.target.closest(".tv-patron-npc-btn")){
      const btn = e.target.closest(".tv-patron-npc-btn");
      const desc = btn.getAttribute("data-desc");
      const appearance = btn.getAttribute("data-appearance");
      showNPCModal(generateFullNPCFromStaff("Patron", `${desc}, ${appearance}`, "", ""));
      return;
    }
  });

  generate();
});
