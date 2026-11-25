let nodes = [];
let nextId = 1;
let map;
let markers = [];

const $ = (id) => document.getElementById(id);
const typeColors = {Solar:"#e5a900", Wind:"#2796c8", Substation:"#d56b55", Distribution:"#238454"};

function initMap() {
  if (!window.L) {
    $("status").textContent = "Map library could not load. Manual coordinate entry still works; check your internet connection.";
    return;
  }
  map = L.map("map").setView([13.0827, 80.2707], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.on("click", (e) => {
    const name = prompt("Enter a name for this location:", `Location ${nextId}`);
    if (!name || !name.trim()) return;
    const type = prompt("Type: Solar, Wind, Substation, or Distribution", "Distribution") || "Distribution";
    addNode({id: nextId++, name: name.trim(), type: normalizeType(type), lat: e.latlng.lat, lon: e.latlng.lng});
  });
}

function normalizeType(value) {
  const found = ["Solar","Wind","Substation","Distribution"].find(x => x.toLowerCase() === value.trim().toLowerCase());
  return found || "Distribution";
}

function addNode(node) {
  nodes.push({...node, id: Number(node.id)});
  nextId = Math.max(nextId, Number(node.id) + 1);
  renderNodes();
  renderMarkers();
}

function renderNodes() {
  $("locationCount").textContent = `${nodes.length} location${nodes.length === 1 ? "" : "s"}`;
  $("nodeList").innerHTML = "";
  nodes.forEach(n => {
    const row = document.createElement("div");
    row.className = "node-row";
    const info = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = `${n.id}. ${n.name}`;
    const small = document.createElement("small");
    small.textContent = `${n.lat.toFixed(5)}, ${n.lon.toFixed(5)}`;
    info.append(strong, small);
    const right = document.createElement("div");
    right.style.display = "flex"; right.style.alignItems = "center"; right.style.gap = "8px";
    const tag = document.createElement("span"); tag.className = "node-type"; tag.textContent = n.type;
    const remove = document.createElement("button"); remove.className = "remove"; remove.textContent = "×"; remove.title = "Remove location";
    remove.onclick = () => { nodes = nodes.filter(x => x.id !== n.id); renderNodes(); renderMarkers(); };
    right.append(tag, remove); row.append(info, right); $("nodeList").append(row);
  });
}

function renderMarkers() {
  if (!map) return;
  markers.forEach(m => map.removeLayer(m)); markers = [];
  nodes.forEach(n => {
    const marker = L.circleMarker([n.lat, n.lon], {
      radius: 8, color: "#fff", weight: 2, fillColor: typeColors[n.type] || "#238454", fillOpacity: 1
    }).addTo(map).bindPopup(`<b>${escapeHtml(n.name)}</b><br>${escapeHtml(n.type)}`);
    markers.push(marker);
  });
  if (nodes.length) {
    const bounds = L.latLngBounds(nodes.map(n => [n.lat, n.lon]));
    map.fitBounds(bounds.pad(0.2), {maxZoom: 13});
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

$("nodeForm").addEventListener("submit", e => {
  e.preventDefault();
  const lat = Number($("nodeLat").value), lon = Number($("nodeLon").value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    setStatus("Enter valid latitude (-90 to 90) and longitude (-180 to 180).", true); return;
  }
  addNode({id: nextId++, name: $("nodeName").value.trim(), type: $("nodeType").value, lat, lon});
  $("nodeForm").reset();
});

$("loadSample").onclick = async () => {
  const response = await fetch("/api/sample");
  nodes = await response.json(); nextId = Math.max(...nodes.map(n => n.id)) + 1;
  renderNodes(); renderMarkers(); setStatus("Sample renewable-energy locations loaded.", false, true);
};
$("clearNodes").onclick = () => { nodes = []; nextId = 1; renderNodes(); renderMarkers(); $("resultsSection").classList.add("hidden"); };
$("optimizeBtn").onclick = optimize;

function setStatus(message, error=false, success=false) {
  const el = $("status"); el.textContent = message;
  el.className = "status" + (error ? " error" : success ? " success" : "");
}

async function optimize() {
  if (nodes.length < 2) { setStatus("Add at least two locations before optimizing.", true); return; }
  const btn = $("optimizeBtn"); btn.disabled = true; btn.textContent = "Optimizing...";
  setStatus("Running selected MST algorithm(s)...");
  try {
    const response = await fetch("/api/optimize", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        nodes, cost_per_km: Number($("costRate").value),
        loss_per_km: Number($("lossRate").value), algorithm: $("algorithm").value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Optimization failed.");
    showResults(data);
    setStatus("Optimization completed successfully.", false, true);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = "Run optimization";
  }
}

function showResults(data) {
  $("resultsSection").classList.remove("hidden");
  const names = Object.keys(data.results);
  const primaryName = names[0];
  const primary = data.results[primaryName];
  const cards = [
    ["Total connection cost", `₹${primary.total_cost.toLocaleString("en-IN",{maximumFractionDigits:2})}`],
    ["Network length", `${primary.total_distance_km.toFixed(3)} km`],
    ["Estimated losses", `${primary.estimated_loss_percent.toFixed(3)}%`],
    ["Runtime", `${primary.runtime_ms.toFixed(5)} ms`]
  ];
  $("metricCards").innerHTML = cards.map(([label,value]) => `<div class="metric"><span>${label} ${names.length>1 && label==="Runtime" ? `(${primaryName})` : ""}</span><strong>${value}</strong></div>`).join("");
  drawGraph(data.nodes, data.all_edges, primary.edges);
  drawRuntime(data.results);
  drawTable(data.results);
  $("modelNote").textContent = data.note + " Distances are straight-line Haversine distances and costs assume a uniform installation cost per km. An MST minimizes the chosen edge-weight sum; it does not guarantee grid capacity, voltage stability, redundancy, or minimum real electrical losses.";
}

function drawGraph(nodes, allEdges, selectedEdges) {
  const w=720,h=340,pad=55;
  const lons=nodes.map(n=>n.lon), lats=nodes.map(n=>n.lat);
  const minX=Math.min(...lons), maxX=Math.max(...lons), minY=Math.min(...lats), maxY=Math.max(...lats);
  const sx=x=>pad+(x-minX)/(maxX-minX||1)*(w-2*pad);
  const sy=y=>h-pad-(y-minY)/(maxY-minY||1)*(h-2*pad);
  const pos={}; nodes.forEach(n=>pos[n.id]={x:sx(n.lon),y:sy(n.lat)});
  const chosen=new Set(selectedEdges.map(e=>[e.u,e.v].sort((a,b)=>a-b).join("-")));
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Minimum spanning tree network graph">`;
  allEdges.forEach(e=>{const a=pos[e.u],b=pos[e.v];svg+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#d3ddd6" stroke-width="1.5"/>`;});
  selectedEdges.forEach(e=>{const a=pos[e.u],b=pos[e.v];svg+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#16834f" stroke-width="4" stroke-linecap="round"/>`;const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;svg+=`<text x="${mx}" y="${my-7}" font-size="10" text-anchor="middle" fill="#176b45">₹${Math.round(e.cost).toLocaleString("en-IN")}</text>`;});
  nodes.forEach(n=>{const p=pos[n.id];svg+=`<circle cx="${p.x}" cy="${p.y}" r="10" fill="${typeColors[n.type]||"#238454"}" stroke="white" stroke-width="3"/><text x="${p.x}" y="${p.y+25}" text-anchor="middle" font-size="11" fill="#20312a">${escapeHtml(n.name)}</text>`;});
  svg+="</svg>";$("networkGraph").innerHTML=svg;
}

function drawRuntime(results) {
  const entries=Object.entries(results); const max=Math.max(...entries.map(([,r])=>r.runtime_ms),0.000001);
  $("runtimeChart").innerHTML=entries.map(([name,r])=>`<div class="bar-row"><strong>${name}</strong><div class="bar-track"><div class="bar-fill" style="width:${Math.max(1,r.runtime_ms/max*100)}%"></div></div><span class="bar-value">${r.runtime_ms.toFixed(5)} ms</span></div>`).join("");
}
function drawTable(results) {
  const rows=Object.entries(results);
  $("comparisonTable").innerHTML=`<table><thead><tr><th>Algorithm</th><th>Cost (₹)</th><th>Length (km)</th><th>Runtime (ms)</th></tr></thead><tbody>${rows.map(([n,r])=>`<tr><td>${n}</td><td>${r.total_cost.toLocaleString("en-IN",{maximumFractionDigits:0})}</td><td>${r.total_distance_km.toFixed(2)}</td><td>${r.runtime_ms.toFixed(5)}</td></tr>`).join("")}</tbody></table>`;
}

window.addEventListener("load", () => {
  initMap();
  $("loadSample").click();
});
