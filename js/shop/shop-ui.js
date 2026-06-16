const $ = (id)=>document.getElementById(id);

  // Apply a preset: check the right boxes & (optionally) tweak knobs
  function applyPreset(key){
    if(!key || key === "custom") return;
    const p = PRESETS[key];
    if(!p) return;

    // select types (only these)
    document.querySelectorAll("#sg-types input").forEach(i=>{
      i.checked = p.select.includes(i.dataset.type);
    });

    // optional knobs (still editable by user)
    if(p.allowRare) $("sg-allowRare").value = (p.allowRare === "yes" ? "yes" : (p.allowRare === "no" ? "no" : "auto"));
    if(typeof p.uniquePct === "number") $("sg-uniquePct").value = p.uniquePct;
  }

  // Utility: populate preset dropdown and keep it in sync
  function initPresets(){
    const sel = $("sg-preset");
    sel.innerHTML = [
      `<option value="custom">Custom (manual)</option>`,
      ...Object.entries(PRESETS).map(([k,v])=>`<option value="${k}">${v.label}</option>`)
    ].join("");

    if (PRESETS.core){
      sel.value = "core";
      applyPreset("core");
    }

    sel.addEventListener("change", ()=>{
      applyPreset(sel.value);
    });

    // If user manually toggles any checkbox, mark preset as "custom"
    $("sg-types").addEventListener("change", ()=>{
      $("sg-preset").value = "custom";
    });
  }

function applyRowSold(row){ row.classList.add('sg-sold-row'); const badge=row.querySelector('.stock-badge'); if(badge){ badge.dataset.stock=badge.dataset.stock||badge.textContent; badge.textContent='SOLD'; badge.classList.add('sg-sold-badge'); } const btn=row.querySelector('.mark-sold-btn'); if(btn){ btn.innerHTML='<i class="bi bi-arrow-counterclockwise"></i>'; btn.title='Unmark sold'; btn.dataset.sold='1'; } }
function removeRowSold(row){ row.classList.remove('sg-sold-row'); const badge=row.querySelector('.stock-badge'); if(badge){ badge.textContent=badge.dataset.stock||badge.textContent; badge.classList.remove('sg-sold-badge'); } const btn=row.querySelector('.mark-sold-btn'); if(btn){ btn.innerHTML='<i class="bi bi-bag-x"></i>'; btn.title='Mark sold'; btn.dataset.sold=''; } }

function applyShopFilter(){
  const q=(document.getElementById('sgSearchInput')?.value||'').toLowerCase().trim();
  const r=document.querySelector('#sgRarityFilters .btn.active')?.dataset.rarity||'';
  document.querySelectorAll('#sg-out .sg-shopcard').forEach(card=>{
    let any=false;
    card.querySelectorAll('tbody tr').forEach(row=>{
      const text=(row.textContent||'').toLowerCase();
      const rarity=row.dataset.rarity||'';
      const mQ=!q||text.includes(q);
      const mR=!r||rarity===r;
      row.style.display=(mQ&&mR)?'':'none';
      if(mQ&&mR) any=true;
    });
    card.style.opacity=any?'':'.35';
  });
}


// ---------- Build type checkboxes ----------
(function(){
  const wrap = $("sg-types");
  const defaultSet = DEFAULT_SHOP_TYPES || new Set();
  Object.keys(SHOPS).forEach(k=>{
    const id = "sgt-"+k.replace(/[^a-z0-9]/gi,'');
    const col = document.createElement("div"); col.className="col";
    const isDefault = defaultSet.size ? defaultSet.has(k) : k !== "Black Market";
    col.innerHTML = `<div class="form-check">
        <input class="form-check-input" type="checkbox" id="${id}" data-type="${k}" ${isDefault?"checked":""}>
        <label class="form-check-label" for="${id}">${k}</label>
      </div>`;
    wrap.appendChild(col);
  });
})();


function populateShopNav(entries){
  const panel   = $("sgNavPanel");
  const list    = $("sgNavList");
  const toggle  = $("sgNavToggle");
  const navSect = $("sgNavSection");
  if(!panel || !list || !toggle) return;

  if(!entries.length){
    list.innerHTML = "";
    panel.classList.add("d-none");
    toggle.classList.add("d-none");
    if(navSect) navSect.classList.add("d-none");
    // reset filter when results cleared
    const si = $("sgSearchInput"); if(si) si.value='';
    document.querySelectorAll('#sgRarityFilters .btn').forEach((b,i)=>b.classList.toggle('active',i===0));
    return;
  }

  // Nav list only useful when there are multiple shops to jump between
  if(navSect) navSect.classList.toggle("d-none", entries.length < 2);

  list.innerHTML = entries.map((e,i)=>[
    '<button type="button" class="shop-nav-link btn btn-sm btn-outline-light w-100'+(i?' mt-1':'')+'\"',
    ' data-target="'+e.id+'">'+e.label+'</button>'
  ].join('')).join('');

  panel.classList.remove("d-none");
  toggle.classList.add("d-none");
}

function collapseShopNav(){
  const panel = $("sgNavPanel");
  const toggle = $("sgNavToggle");
  if(!panel || !toggle) return;
  panel.classList.add("d-none");
  toggle.classList.remove("d-none");
}

function expandShopNav(){
  const panel = $("sgNavPanel");
  const toggle = $("sgNavToggle");
  if(!panel || !toggle) return;
  panel.classList.remove("d-none");
  toggle.classList.add("d-none");
}

function scrollToShop(targetId){
  const el = document.getElementById(targetId);
  if(!el) return;
  const navHeight = document.getElementById("mainNav")?.offsetHeight || 0;
  const clearance = navHeight + 12;
  const top = el.getBoundingClientRect().top + window.scrollY - clearance;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}


// ---------- Generation ----------
function generate(){
  const seed = $("sg-seed").value.trim();
  const rng = prand(seed);
  const settlement = $("sg-settlement").value;
  const itemsPerShop = Math.max(5, Math.min(20, +$("sg-itemsPerShop").value||9));

  // Unique chance (user override or settlement default)
  const uniquePct = Math.max(0, Math.min(100, +$("sg-uniquePct").value||SETTLEMENT[settlement].uniquePct));
  const allowRareSel = $("sg-allowRare").value;
  const selected = [...document.querySelectorAll("#sg-types input:checked")].map(x=>x.dataset.type);
  if(!selected.length){ alert("Select at least one shop type."); return; }

  // meta pills
  const meta = $("sg-meta"); meta.innerHTML="";
  const presetOpt = $("sg-preset") ? $("sg-preset").value : "custom";
  const presetLabel = (presetOpt !== "custom") ? PRESETS[presetOpt].label : "Custom";
  [
    ["Preset", presetLabel],
    ["Settlement", settlement],
    ["Items/shop", itemsPerShop],
    ["Unique chance", uniquePct+"%"],
    ["Shop types", selected.length],
    ["Seed", seed||"(random)"]
  ].forEach(([k,v])=>{
    const sp=document.createElement("span");
    sp.className="sg-pill";
    sp.textContent=`${k}: ${v}`;
    meta.appendChild(sp);
  });


  const out = $("sg-out"); out.innerHTML="";
  const navEntries = [];

  // map UI select → gating token for choiceByRarity (expects 'no'|'auto'|'low'|'mid'|'high')
  const allowToken = (t)=>(
    t==='auto' ? SETTLEMENT[settlement].allowRare
    : t==='yes' ? 'high'
    : 'no'
  );

  selected.forEach((type, idx)=>{
    const shopkeeper = makeShopkeeper(rng, type, settlement);
    const [pmin,pmax] = SETTLEMENT[settlement].price;
    const shopMarkup = within(rng, [pmin,pmax]);
    const markupPct = Math.round((shopMarkup-1)*100);
    const restockLabel = getRestockLabel(type, settlement);
    const notesId = 'notes-' + slugifyShop(type, idx);

    const shop = document.createElement("div");
    shop.className = "sg-shopcard";
    const anchorId = slugifyShop(type, idx);
    shop.id = anchorId;
    navEntries.push({ id: anchorId, label: type });
    shop.innerHTML = `
      <div class="p-3 border-bottom border-secondary d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <div class="fw-bold fs-5"><i class="bi bi-shop me-2"></i>${type}</div>
          <div class="text-muted small mt-1">
            <i class="bi bi-geo-alt-fill me-1"></i>${settlement.charAt(0).toUpperCase() + settlement.slice(1)}
            <span class="mx-2">&bull;</span>
            <i class="bi bi-tag-fill me-1"></i>Markup: ${markupPct>=0?'+':''}${markupPct}%
            <span class="mx-2">&bull;</span>
            <i class="bi bi-arrow-clockwise me-1"></i>${restockLabel}
          </div>
        </div>
        <div class="d-flex gap-1 flex-shrink-0 flex-wrap">
          <button class="btn btn-outline-warning btn-sm sell-to-shop-btn"
            data-shop-type="${type.replace(/"/g,'&quot;')}"
            data-shopkeeper="${shopkeeper.name}"
            data-settlement="${settlement}"
            title="Sell an item to this shop">
            <i class="bi bi-currency-exchange me-1"></i>Sell to Shop
          </button>
          <button class="btn btn-outline-secondary btn-sm restock-btn"
            data-anchor-id="${anchorId}"
            title="Clear all sold items for this shop">
            <i class="bi bi-arrow-clockwise me-1"></i>Restock
          </button>
        </div>
      </div>
      <div class="p-3 border-bottom border-secondary bg-dark bg-opacity-25">
        <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
          <div class="d-flex align-items-start gap-2">
            <i class="bi bi-person-circle text-info fs-5 mt-1 flex-shrink-0"></i>
            <div>
              <div class="fw-semibold text-light">${shopkeeper.name}</div>
              <div class="small text-muted fst-italic">${shopkeeper.personality}</div>
            </div>
          </div>
          <button class="btn btn-outline-secondary btn-sm" type="button"
            data-bs-toggle="collapse" data-bs-target="#${notesId}"
            aria-expanded="false" title="Show DM notes for this shopkeeper">
            <i class="bi bi-journal-text me-1"></i>DM Notes
          </button>
        </div>
        <div class="collapse mt-2" id="${notesId}">
          <div class="sg-dm-notes">
            <div class="row g-2">
              <div class="col-12 col-md-4">
                <div class="notes-label text-warning"><i class="bi bi-heart-fill me-1"></i>Wants</div>
                <div class="text-muted">${shopkeeper.want}</div>
              </div>
              <div class="col-12 col-md-4">
                <div class="notes-label text-info"><i class="bi bi-chat-quote-fill me-1"></i>Rumor</div>
                <div class="text-muted">${shopkeeper.rumor}</div>
              </div>
              <div class="col-12 col-md-4">
                <div class="notes-label text-danger"><i class="bi bi-exclamation-diamond-fill me-1"></i>Hook</div>
                <div class="text-muted">${shopkeeper.hook}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="p-0">
        <div class="table-responsive">
          <table class="sg-tbl">
            <thead><tr><th scope="col" style="width:22%">Item</th><th scope="col" style="width:32%">Description</th><th scope="col" style="width:12%">Use</th><th scope="col" style="width:8%">Stock</th><th scope="col" style="width:26%">Actions</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="sg-uniq mt-2 mx-3 mb-3"></div>
      </div>`;
    out.appendChild(shop);

    const tbody   = shop.querySelector("tbody");
    const uniqBox = shop.querySelector(".sg-uniq");

    const items   = SHOPS[type];
    const weights = SETTLEMENT[settlement].weights;
    const [stockMin, stockMax] = SETTLEMENT[settlement].stock;

    const seenKeys   = new Set();
    const listedNames= new Set();
    let tries = 0, rowsHtml = "";

    // Guard: avoid long spins if pool is tiny after rare gating
    const maxTries = Math.min(itemsPerShop, items.length) * 20;

    while (listedNames.size < itemsPerShop && tries++ < maxTries){
      const allowRare = allowToken(allowRareSel);
      const it = choiceByRarity(rng, items, weights, allowRare);
      const key = it.n+"|"+it.r;
      if(seenKeys.has(key)) continue;
      seenKeys.add(key);

      // Generate stock quantity based on settlement and rarity
      let stockQty;
      if (it.r === 'rare') {
        stockQty = Math.floor(rng() * 3) + 1; // 1-3 for rare items
      } else if (it.r === 'uncommon') {
        stockQty = Math.floor(rng() * (stockMax - stockMin + 1)) + stockMin; // Full settlement range
      } else {
        // Common items get more stock
        const bonus = Math.floor((stockMax - stockMin) * 0.5);
        stockQty = Math.floor(rng() * (stockMax - stockMin + 1 + bonus)) + stockMin;
      }

      // Extra surcharge on rares varies by settlement (previous behavior), then apply shop markup
      const rareAdj = (it.r==='rare')
        ? (settlement==='village'?1.6 : settlement==='town'?1.3 : 1.15)
        : 1;
      const sp = Math.max(1, Math.round(it.sp * rareAdj * shopMarkup));

      const d = decorateDesc(rng, it.d);
      const badge = it.r==='rare'
        ? ' <span class="badge text-bg-danger ms-1">rare</span>'
        : it.r==='uncommon'
        ? ' <span class="badge text-bg-warning text-dark ms-1">uncommon</span>'
        : '';

      const itmKey = itemSoldKey(anchorId, it.n);
      rowsHtml += [
        `<tr data-rarity="${it.r||'common'}" data-item-key="${itmKey}">`,
          `<td data-label="Item"><div class="fw-semibold">${it.n}</div>${badge}</td>`,
          `<td data-label="Description" class="text-muted">${d}</td>`,
          `<td data-label="Use" class="small">${it.u}</td>`,
          `<td data-label="Stock" class="text-center">`,
            `<span class="badge bg-secondary stock-badge" data-stock="${stockQty}">${stockQty}</span>`,
          `</td>`,
          `<td data-label="Actions">`,
            `<div class="d-flex flex-wrap gap-1 align-items-center">`,
              `<span class="fw-bold text-success me-1">${formatPrice(sp)}</span>`,
              `<button class="btn btn-outline-info btn-sm negotiate-btn"`,
                `data-item="${it.n.replace(/"/g,'&quot;')}"`,
                `data-price="${sp}" data-rarity="${it.r||'common'}"`,
                `title="Negotiate Price"><i class="bi bi-chat-dots"></i></button>`,
              `<button class="btn btn-outline-success btn-sm add-to-character-btn"`,
                `data-item="${it.n.replace(/"/g,'&quot;')}"`,
                `data-description="${d.replace(/"/g,'&quot;')}"`,
                `data-use="${it.u.replace(/"/g,'&quot;')}"`,
                `data-price="${sp}" data-rarity="${it.r||'common'}"`,
                `title="Add to Character Inventory"><i class="bi bi-person-plus"></i></button>`,
              `<button class="btn btn-outline-secondary btn-sm mark-sold-btn"`,
                `data-item-key="${itmKey}"`,
                `title="Mark sold"><i class="bi bi-bag-x"></i></button>`,
            `</div>`,
          `</td>`,
        `</tr>`
      ].join('');

      listedNames.add(it.n);
    }

    tbody.innerHTML = rowsHtml;

    // Apply persisted sold state (only when seed is set)
    if(seed){
      const soldSet = getSoldSet(seed);
      tbody.querySelectorAll('tr[data-item-key]').forEach(row=>{
        if(soldSet.has(row.dataset.itemKey)) applyRowSold(row);
      });
    }

    // Unique item (guaranteed not to duplicate a listed item)
    if (rng()*100 < uniquePct){
      let base, guard=0;
      do { base = pick(rng, items); } while (listedNames.has(base.n) && guard++ < 50);
      const usp = Math.max(1, Math.round(base.sp * 1.35 * shopMarkup));
      uniqBox.textContent = `Unique Stock: ${base.n} — ${uniqueLine(rng)} (${formatPrice(usp)})`;
    }
  });

  populateShopNav(navEntries);
}

// Copy / Download
function copyOut(){
  const blocks = [...document.querySelectorAll("#sg-out .sg-shopcard")].map(card=>{
    const titleEl = card.querySelector(".fw-bold.fs-5");
    const title = titleEl ? titleEl.textContent.trim() : "Shop";
    const nameEl  = card.querySelector(".fw-semibold.text-light");
    const persEl  = card.querySelector(".fst-italic.text-muted");
    const wantEl  = card.querySelector(".sg-dm-notes .col-12:nth-child(1) .text-muted");
    const rumorEl = card.querySelector(".sg-dm-notes .col-12:nth-child(2) .text-muted");
    const hookEl  = card.querySelector(".sg-dm-notes .col-12:nth-child(3) .text-muted");
    const skName  = nameEl  ? nameEl.textContent.trim()  : '';
    const skPerso = persEl  ? persEl.textContent.trim()  : '';
    const skWant  = wantEl  ? wantEl.textContent.trim()  : '';
    const skRumor = rumorEl ? rumorEl.textContent.trim() : '';
    const skHook  = hookEl  ? hookEl.textContent.trim()  : '';
    const header  = skName ? `Shopkeeper: ${skName} — ${skPerso}` : '';
    const notes   = [skWant&&`Wants: ${skWant}`, skRumor&&`Rumor: ${skRumor}`, skHook&&`Hook: ${skHook}`].filter(Boolean).join('\n');
    const rows = [...card.querySelectorAll("tbody tr")].map(tr=>{
      const t = tr.children[0].innerText.replace(/\s+(common|uncommon|rare)$/i,'').trim();
      const d = tr.children[1].innerText.trim();
      const u = tr.children[2].innerText.trim();
      const stockBadge = tr.querySelector('.stock-badge');
      const stock = stockBadge ? (stockBadge.dataset.stock||stockBadge.textContent) : tr.children[3].innerText;
      const priceEl = tr.querySelector('.fw-bold.text-success');
      const p = priceEl ? priceEl.textContent.trim() : tr.children[4].innerText.trim();
      const sold = tr.classList.contains('sg-sold-row') ? ' [SOLD]' : '';
      return `- ${t}${sold} | ${d} | Use: ${u} | Stock: ${stock} | ${p}`;
    });
    const uniq = card.querySelector(".sg-uniq").textContent.trim();
    return ['# '+title, header, notes, rows.join('\n'), uniq?'* '+uniq:''].filter(Boolean).join('\n');
  });
  if(!blocks.length) return;
  navigator.clipboard.writeText(blocks.join("\n\n"));
}
function downloadOut(){
  const text = [...document.querySelectorAll("#sg-out .sg-shopcard")].map(card=>card.innerText).join("\n\n---\n\n");
  if(!text.trim()) return;
  const blob = new Blob([text], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="shops.txt"; a.click(); URL.revokeObjectURL(url);
}

// ---------- Add to Character Inventory ----------
const STORAGE_KEY_CHARACTERS = 'dmtoolboxCharactersV1';

async function loadCharactersFromStorage() {
  // Check if IndexedDB is available
  if (typeof IndexedDBStorage !== 'undefined' && IndexedDBStorage.isSupported()) {
    try {
      let characters = await IndexedDBStorage.loadCharacters();
      if (characters.length === 0) {
        characters = await IndexedDBStorage.migrateFromLocalStorage(STORAGE_KEY_CHARACTERS);
      }
      return characters;
    } catch (error) {
      console.error('IndexedDB failed, falling back to localStorage:', error);
      return loadFromLocalStorage();
    }
  }
  return loadFromLocalStorage();
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHARACTERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading characters from localStorage:', error);
    return [];
  }
}

async function saveCharactersToStorage(characters) {
  if (typeof IndexedDBStorage !== 'undefined' && IndexedDBStorage.isSupported()) {
    try {
      await IndexedDBStorage.saveCharacters(characters);
      return;
    } catch (error) {
      console.error('IndexedDB save failed, falling back to localStorage:', error);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    alert('Failed to save character data. Storage may be full.');
  }
}

async function showAddToCharacterModal(itemName, description, use, price, rarity) {
  // Load characters
  const characters = await loadCharactersFromStorage();

  if (!characters || characters.length === 0) {
    alert('No characters found. Please create a character first on the Characters page.');
    return;
  }

  // Create modal if it doesn't exist
  let modal = document.getElementById("addToCharacterModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "addToCharacterModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title"><i class="bi bi-person-plus me-2"></i>Add to Character Inventory</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <h6 class="text-success" id="addItemName"></h6>
              <p class="mb-1 small"><strong>Description:</strong> <span id="addItemDescription"></span></p>
              <p class="mb-1 small"><strong>Use:</strong> <span id="addItemUse"></span></p>
              <p class="mb-1"><strong>Price:</strong> <span id="addItemPrice"></span></p>
              <p class="mb-0"><strong>Rarity:</strong> <span id="addItemRarity" class="badge"></span></p>
            </div>
            <hr class="border-secondary">
            <div class="mb-3">
              <label for="shopCharacterSelect" class="form-label"><strong>Select Character</strong></label>
              <select class="form-select" id="shopCharacterSelect">
                <option value="">-- Choose a character --</option>
              </select>
            </div>
            <div class="mb-3">
              <label for="shopItemQuantity" class="form-label">Quantity</label>
              <input type="number" class="form-control" id="shopItemQuantity" min="1" value="1">
            </div>
            <div class="mb-3">
              <label for="shopItemWeight" class="form-label">Weight per Item (lb)</label>
              <input type="number" class="form-control" id="shopItemWeight" min="0" step="0.1" value="0" placeholder="Optional">
            </div>
            <div class="mb-3">
              <label for="shopItemNotes" class="form-label">Additional Notes</label>
              <textarea class="form-control" id="shopItemNotes" rows="2" placeholder="Optional notes about this item..."></textarea>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="shopItemEquipped">
              <label class="form-check-label" for="shopItemEquipped">Equipped</label>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="shopItemAttuned">
              <label class="form-check-label" for="shopItemAttuned">Attuned</label>
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-success" id="confirmAddToCharacter">Add to Inventory</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Add event listener for confirm button
    document.getElementById("confirmAddToCharacter").addEventListener("click", async () => {
      await confirmAddItemToCharacter(itemName, description, use);
    });
  }

  // Populate modal content
  document.getElementById("addItemName").textContent = itemName;
  document.getElementById("addItemDescription").textContent = description;
  document.getElementById("addItemUse").textContent = use;
  document.getElementById("addItemPrice").textContent = formatPrice(price);

  const rarityBadge = document.getElementById("addItemRarity");
  rarityBadge.textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  rarityBadge.className = 'badge ' + (rarity === 'rare' ? 'text-bg-danger' : rarity === 'uncommon' ? 'text-bg-warning text-dark' : 'text-bg-secondary');

  // Populate character dropdown
  const select = document.getElementById("shopCharacterSelect");
  select.innerHTML = '<option value="">-- Choose a character --</option>';
  characters.forEach((char, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = char.name || `Unnamed Character ${index + 1}`;
    select.appendChild(option);
  });

  // Reset form fields
  document.getElementById("shopItemQuantity").value = 1;
  document.getElementById("shopItemWeight").value = 0;
  document.getElementById("shopItemNotes").value = '';
  document.getElementById("shopItemEquipped").checked = false;
  document.getElementById("shopItemAttuned").checked = false;

  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

async function confirmAddItemToCharacter(itemName, description, use) {
  const characterIndex = document.getElementById("shopCharacterSelect").value;

  if (!characterIndex && characterIndex !== 0) {
    alert('Please select a character.');
    return;
  }

  const quantity = parseInt(document.getElementById("shopItemQuantity").value) || 1;
  const weight = parseFloat(document.getElementById("shopItemWeight").value) || 0;
  const notes = document.getElementById("shopItemNotes").value.trim();
  const equipped = document.getElementById("shopItemEquipped").checked;
  const attuned = document.getElementById("shopItemAttuned").checked;

  // Load characters fresh from storage
  const characters = await loadCharactersFromStorage();
  const charIndex = parseInt(characterIndex);
  const character = characters[charIndex];

  if (!character) {
    alert('Character not found.');
    return;
  }

  // Initialize inventory array if it doesn't exist
  if (!Array.isArray(character.inventoryItems)) {
    character.inventoryItems = [];
  }

  console.log('Current inventory before adding:', character.inventoryItems.length, 'items');

  // Create item object
  const newItem = {
    name: itemName,
    quantity: quantity,
    weight: weight,
    equipped: equipped,
    attuned: attuned,
    notes: notes ? `${description}. ${use}. ${notes}` : `${description}. ${use}`
  };

  // Add item to character inventory (append to existing array)
  character.inventoryItems.push(newItem);

  console.log('Inventory after adding:', character.inventoryItems.length, 'items');

  // Update the character in the array
  characters[charIndex] = character;

  // Save ALL characters back to storage (preserving the entire array)
  await saveCharactersToStorage(characters);

  // Close modal
  const modal = document.getElementById("addToCharacterModal");
  const bsModal = bootstrap.Modal.getInstance(modal);
  bsModal.hide();

  // Show success message
  alert(`Successfully added "${itemName}" to ${character.name || 'character'}'s inventory!`);
}

// Wire up
document.addEventListener("DOMContentLoaded", ()=>{
  // Simple/Advanced mode toggle
  const advancedKey = 'dmtools.advancedMode.shop';
  const advancedToggle = $('advancedModeToggle');
  const settingsBody = $('shopSettingsBody');

  const isAdvanced = localStorage.getItem(advancedKey) === 'true';
  advancedToggle.checked = isAdvanced;
  if (isAdvanced) settingsBody.classList.add('advanced-mode');

  advancedToggle.addEventListener('change', () => {
    if (advancedToggle.checked) {
      settingsBody.classList.add('advanced-mode');
      localStorage.setItem(advancedKey, 'true');
    } else {
      settingsBody.classList.remove('advanced-mode');
      localStorage.setItem(advancedKey, 'false');
    }
  });

  initPresets();
  $("sg-generate").addEventListener("click", generate);
  $("sg-copy").addEventListener("click", copyOut);
  $("sg-download").addEventListener("click", downloadOut);
  $("sg-clear").addEventListener("click", ()=>{
    $("sg-out").innerHTML="";
    $("sg-meta").innerHTML="";
    populateShopNav([]);
  });
  $("sg-selectAll").addEventListener("click", (e)=>{
    e.preventDefault();
    document.querySelectorAll("#sg-types input").forEach(i=>i.checked=true);
    if($("sg-preset")) $("sg-preset").value = "custom";
  });
  $("sg-selectNone").addEventListener("click", (e)=>{
    e.preventDefault();
    document.querySelectorAll("#sg-types input").forEach(i=>i.checked=false);
    if($("sg-preset")) $("sg-preset").value = "custom";
  });

  if($("sgNavToggle")) $("sgNavToggle").addEventListener("click", expandShopNav);
  if($("sgNavDismiss")) $("sgNavDismiss").addEventListener("click", collapseShopNav);

  // Search input — filter items live
  document.addEventListener("input", e=>{
    if(e.target.id === 'sgSearchInput') applyShopFilter();
  });

  // Rarity filter buttons
  document.addEventListener("click", e=>{
    const rfBtn = e.target.closest("#sgRarityFilters .btn");
    if(rfBtn){
      document.querySelectorAll("#sgRarityFilters .btn").forEach(b=>b.classList.remove("active"));
      rfBtn.classList.add("active");
      applyShopFilter();
    }
  });

  // Defaults tuned per settlement on change
  $("sg-settlement").addEventListener("change", ()=>{
    const s = $("sg-settlement").value;
    const def = SETTLEMENT[s].uniquePct;
    $("sg-uniquePct").value = def;
    const [min,max] = SETTLEMENT[s].stock;
    $("sg-itemsPerShop").value = Math.round((min+max)/2);
  });

  // Unified event delegation
  document.addEventListener("click", e=>{
    // Negotiate
    const negBtn = e.target.closest(".negotiate-btn");
    if(negBtn){
      showNegotiateModal(negBtn.dataset.item, parseInt(negBtn.dataset.price,10), negBtn.dataset.rarity);
      return;
    }

    // Add to character
    const addBtn = e.target.closest(".add-to-character-btn");
    if(addBtn){
      showAddToCharacterModal(addBtn.dataset.item, addBtn.dataset.description, addBtn.dataset.use, parseInt(addBtn.dataset.price,10), addBtn.dataset.rarity);
      return;
    }

    // Mark sold / unsold
    const soldBtn = e.target.closest(".mark-sold-btn");
    if(soldBtn){
      const row  = soldBtn.closest("tr");
      const key  = soldBtn.dataset.itemKey || row?.dataset.itemKey;
      const seed = $("sg-seed").value.trim();
      if(soldBtn.dataset.sold){
        removeRowSold(row);
        if(seed) markUnsold(seed, key);
      } else {
        applyRowSold(row);
        if(seed) markSold(seed, key);
        else {
          const notice = document.createElement("div");
          notice.className="alert alert-info alert-dismissible small py-1 px-2 mt-2";
          notice.innerHTML='<i class="bi bi-info-circle me-1"></i>Set a <strong>Seed</strong> in Advanced settings to persist sold items across sessions. <button type="button" class="btn-close btn-sm" data-bs-dismiss="alert"></button>';
          const card = soldBtn.closest(".sg-shopcard");
          if(card && !card.querySelector(".sold-seed-notice")){
            notice.classList.add("sold-seed-notice");
            card.querySelector(".sg-uniq")?.after(notice);
          }
        }
      }
      return;
    }

    // Restock shop
    const restockBtn = e.target.closest(".restock-btn");
    if(restockBtn){
      const anchorId = restockBtn.dataset.anchorId;
      const seed = $("sg-seed").value.trim();
      if(seed) clearShopSold(seed, anchorId);
      const card = document.getElementById(anchorId);
      if(card) card.querySelectorAll("tbody tr.sg-sold-row").forEach(r=>removeRowSold(r));
      restockBtn.innerHTML='<i class="bi bi-check2 me-1"></i>Restocked!';
      setTimeout(()=>{ restockBtn.innerHTML='<i class="bi bi-arrow-clockwise me-1"></i>Restock'; }, 1600);
      return;
    }

    // Sell to shop
    const sellBtn = e.target.closest(".sell-to-shop-btn");
    if(sellBtn){
      showSellToShopModal(sellBtn.dataset.shopType, sellBtn.dataset.shopkeeper, sellBtn.dataset.settlement);
      return;
    }

    // Nav jump
    const navLink = e.target.closest(".shop-nav-link");
    if(navLink) scrollToShop(navLink.dataset.target);
  });

  // First run
  generate();
});
