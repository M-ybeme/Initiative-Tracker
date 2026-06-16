// ---------- Sell to Shop ----------
const SELL_MATCHED_LINES = [
  (name, offer)=>`"${name} eyes it with a practiced look. 'I can work with this. ${offer} — that's my offer.'"`,
  (name, offer)=>`"${name} sets it on the counter and weighs it briefly. '${offer}. Take it or leave it.'"`,
  (name, offer)=>`"${name} gives a slow nod. 'I can move this. ${offer}, and I'm being fair.'"`,
  (name, offer)=>`"${name} turns it over once. 'Yeah, I've got a buyer for this kind of thing. ${offer}.'"`,
];
const SELL_UNMATCHED_LINES = [
  (name, offer)=>`"${name} looks it over once, then sets it back. 'Not really my trade. I'd take it for ${offer}, but don't expect more.'"`,
  (name, offer)=>`"${name} shrugs. 'Not what I usually deal in. ${offer} as scrap value — and that's generous.'"`,
  (name, offer)=>`"${name} looks uncertain. 'I can't do much with this, honestly. ${offer}, if you need to move it quickly.'"`,
];

function calculateSellOffer(){
  const modal   = document.getElementById('sellToShopModal');
  if(!modal) return;
  const type     = modal.dataset.shopType;
  const keeper   = modal.dataset.shopkeeper;
  const settle   = modal.dataset.settlement;
  const desc     = (document.getElementById('sellItemDesc')?.value||'').toLowerCase().trim();
  const valueGp  = parseFloat(document.getElementById('sellItemValue')?.value)||0;
  const condition= document.querySelector('input[name="sellCondition"]:checked')?.value||'good';

  if(!desc || !valueGp){ alert('Please enter both an item description and its value.'); return; }

  const buys = SHOP_BUYS[type];
  const settleMul = settle==='village'?0.70 : settle==='capital'?1.00 : 0.85;
  const condMul   = condition==='good'?1.00 : condition==='worn'?0.75 : 0.50;

  let matched=false, baseAff=0, matchedKw=[], matchNote='';
  if(buys){
    if(buys.kw.length===0){ matched=true; baseAff=buys.aff; matchNote='This shop deals in '+buys.label+'.'; }
    else {
      matchedKw = buys.kw.filter(k=>desc.includes(k));
      if(matchedKw.length){ matched=true; baseAff=Math.min(buys.aff + (matchedKw.length-1)*0.02, buys.aff+0.08); matchNote='This shop deals in '+buys.label+'.'; }
    }
  }
  if(!matched){ baseAff=0.15; matchNote='This shop does not typically deal in this type of item.'; }

  const offerPct  = baseAff * settleMul * condMul;
  const offerGp   = Math.max(0.1, Math.round(valueGp * offerPct * 10)/10);
  const offerSp   = Math.round(offerGp * 10);
  const offerFmt  = formatPrice(offerSp);
  const pool      = matched ? SELL_MATCHED_LINES : SELL_UNMATCHED_LINES;
  const line      = pool[Math.floor(Math.random()*pool.length)](keeper, offerFmt);

  const res = document.getElementById('sellResult');
  if(!res) return;
  const settlePct  = Math.round(settleMul*100);
  const condPctStr = Math.round(condMul*100);
  const basePctStr = Math.round(baseAff*100);
  const finalPct   = Math.round(offerPct*100);
  res.className = '';
  res.innerHTML = [
    '<div class="alert '+(matched?'alert-success':'alert-warning')+' mb-2">',
      '<div class="fw-semibold mb-1">'+(matched?'Shop will buy':'Outside their trade')+'</div>',
      '<div>'+matchNote+'</div>',
      matchedKw.length ? '<div class="small text-muted mt-1">Keyword match: '+matchedKw.slice(0,4).join(', ')+(matchedKw.length>4?'…':'')+'</div>' : '',
    '</div>',
    '<div class="d-flex justify-content-between align-items-center mb-1">',
      '<span class="text-muted small">Offer</span>',
      '<span class="fw-bold fs-5 text-success">'+offerFmt+'</span>',
    '</div>',
    '<div class="small text-muted mb-2">Base '+basePctStr+'% × Settlement '+settlePct+'% × Condition '+condPctStr+'% = <strong>'+finalPct+'% of stated value</strong></div>',
    '<div class="sg-uniq">'+line+'</div>',
    '<div class="small text-muted mt-2"><i class="bi bi-info-circle me-1"></i>Player may attempt Persuasion (same DCs as buying) to push the offer higher.</div>'
  ].join('');
  res.classList.remove('d-none');
}

function showSellToShopModal(shopType, shopkeeper, settlement){
  let modal = document.getElementById('sellToShopModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'sellToShopModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    const inner = [
      '<div class="modal-dialog modal-dialog-centered">',
        '<div class="modal-content bg-dark text-light">',
          '<div class="modal-header border-secondary">',
            '<h5 class="modal-title"><i class="bi bi-currency-exchange me-2"></i>Sell to Shop</h5>',
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>',
          '</div>',
          '<div class="modal-body">',
            '<p class="small text-muted">Describe the item — the more detail, the better the keyword match.</p>',
            '<div class="mb-3">',
              '<label class="form-label">Item name &amp; description</label>',
              '<input type="text" class="form-control" id="sellItemDesc" placeholder="e.g. a leather-bound spellbook, an iron shortsword, a potion">',
            '</div>',
            '<div class="mb-3">',
              '<label class="form-label">Your estimate of its value (GP)</label>',
              '<input type="number" class="form-control" id="sellItemValue" min="0.1" step="0.1" placeholder="e.g. 25">',
            '</div>',
            '<div class="mb-3">',
              '<label class="form-label">Condition</label>',
              '<div class="d-flex gap-3">',
                '<div class="form-check"><input class="form-check-input" type="radio" name="sellCondition" id="condGood" value="good" checked><label class="form-check-label" for="condGood">Good</label></div>',
                '<div class="form-check"><input class="form-check-input" type="radio" name="sellCondition" id="condWorn" value="worn"><label class="form-check-label" for="condWorn">Worn</label></div>',
                '<div class="form-check"><input class="form-check-input" type="radio" name="sellCondition" id="condDamaged" value="damaged"><label class="form-check-label" for="condDamaged">Damaged</label></div>',
              '</div>',
              '<div class="small text-muted mt-1">Good 100% &bull; Worn 75% &bull; Damaged 50% of calculated offer</div>',
            '</div>',
            '<hr class="border-secondary">',
            '<div id="sellResult" class="d-none"></div>',
          '</div>',
          '<div class="modal-footer border-secondary">',
            '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>',
            '<button type="button" class="btn btn-warning" id="calcSellBtn"><i class="bi bi-calculator me-1"></i>Calculate Offer</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    modal.innerHTML = inner;
    document.body.appendChild(modal);
    document.getElementById('calcSellBtn').addEventListener('click', calculateSellOffer);
  }

  modal.dataset.shopType   = shopType;
  modal.dataset.shopkeeper = shopkeeper;
  modal.dataset.settlement = settlement;

  const res = document.getElementById('sellResult');
  if(res) res.classList.add('d-none');
  const descEl = document.getElementById('sellItemDesc');  if(descEl) descEl.value='';
  const valEl  = document.getElementById('sellItemValue'); if(valEl) valEl.value='';
  const goodEl = document.getElementById('condGood');      if(goodEl) goodEl.checked=true;

  new bootstrap.Modal(modal).show();
}

// ---------- Negotiate Price Mechanic ----------
function calculateNegotiateDC(rarity){
  const dcMap = {
    'common': 12,
    'uncommon': 15,
    'rare': 18
  };
  return dcMap[rarity] || 15;
}

function showNegotiateModal(itemName, basePrice, rarity){
  const dc = calculateNegotiateDC(rarity);

  // Create modal if it doesn't exist
  let modal = document.getElementById("negotiateModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "negotiateModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title"><i class="bi bi-chat-dots me-2"></i>Negotiate Price</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <h6 class="text-info" id="negotiateItem"></h6>
              <p class="mb-1"><strong>Base Price:</strong> <span id="negotiateBasePrice"></span></p>
              <p class="mb-0"><strong>Rarity:</strong> <span id="negotiateRarity" class="badge"></span></p>
            </div>
            <hr class="border-secondary">
            <div class="mb-3">
              <h6 class="text-warning"><i class="bi bi-dice-6 me-2"></i>Persuasion Check</h6>
              <p class="mb-2"><strong>DC:</strong> <span id="negotiateDC"></span> <span id="negotiateDCLabel" class="text-secondary small"></span></p>
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-dark table-bordered">
                <thead>
                  <tr>
                    <th>Result</th>
                    <th>Price</th>
                    <th>Discount</th>
                  </tr>
                </thead>
                <tbody id="negotiateResults"></tbody>
              </table>
            </div>
            <div class="alert alert-info small mb-0">
              <i class="bi bi-info-circle me-1"></i>
              Players make a <strong>Persuasion</strong> check. Success grants discounts; critical failure increases the price (shopkeeper offended)!
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  // Populate modal content
  document.getElementById("negotiateItem").textContent = itemName;
  document.getElementById("negotiateBasePrice").textContent = formatPrice(basePrice);

  const rarityBadge = document.getElementById("negotiateRarity");
  rarityBadge.textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  rarityBadge.className = 'badge ' + (rarity === 'rare' ? 'text-bg-danger' : rarity === 'uncommon' ? 'text-bg-warning text-dark' : 'text-bg-secondary');

  document.getElementById("negotiateDC").textContent = dc;
  document.getElementById("negotiateDCLabel").textContent = `(${rarity === 'rare' ? 'Hard' : rarity === 'uncommon' ? 'Standard' : 'Easy'})`;

  // Calculate price outcomes
  const sp = basePrice;
  const outcomes = [
    { result: `Critical Success (Nat 20 or ${dc + 10}+)`, price: Math.max(1, Math.round(sp * 0.70)), discount: '30% off', class: 'table-success' },
    { result: `Success by 5+ (${dc + 5}+)`, price: Math.max(1, Math.round(sp * 0.80)), discount: '20% off', class: 'table-success' },
    { result: `Success (${dc}+)`, price: Math.max(1, Math.round(sp * 0.90)), discount: '10% off', class: 'table-success' },
    { result: `Failure (${dc - 1} or less)`, price: sp, discount: 'No discount', class: '' },
    { result: `Critical Failure (Nat 1 or ${dc - 10} or less)`, price: Math.max(1, Math.round(sp * 1.10)), discount: '+10% (offended!)', class: 'table-danger' }
  ];

  const tbody = document.getElementById("negotiateResults");
  tbody.innerHTML = outcomes.map(o => `
    <tr class="${o.class}">
      <td>${o.result}</td>
      <td>${formatPrice(o.price)}</td>
      <td>${o.discount}</td>
    </tr>
  `).join('');

  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

