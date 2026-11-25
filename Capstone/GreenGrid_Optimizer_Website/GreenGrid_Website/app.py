from flask import Flask, render_template, request, jsonify
from algorithms import kruskal, prim, boruvka
from graph_utils import haversine_km
import time

app = Flask(__name__)

SAMPLE_NODES = [
    {"id": 1, "name": "Chennai Solar Farm", "type": "Solar", "lat": 13.0827, "lon": 80.2707},
    {"id": 2, "name": "Coastal Wind Farm", "type": "Wind", "lat": 13.0500, "lon": 80.2100},
    {"id": 3, "name": "Central Substation", "type": "Substation", "lat": 13.1100, "lon": 80.2500},
    {"id": 4, "name": "North Distribution Point", "type": "Distribution", "lat": 13.1200, "lon": 80.2900},
    {"id": 5, "name": "South Distribution Point", "type": "Distribution", "lat": 13.0200, "lon": 80.2900},
]

ALGORITHMS = {"Kruskal": kruskal, "Prim": prim, "Boruvka": boruvka}

def build_edges(nodes, cost_per_km, loss_per_km):
    edges = []
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            a, b = nodes[i], nodes[j]
            distance = haversine_km(a["lat"], a["lon"], b["lat"], b["lon"])
            edges.append({
                "u": a["id"], "v": b["id"],
                "distance_km": distance,
                "cost": distance * cost_per_km,
                "loss_percent": distance * loss_per_km,
            })
    return edges

def run_algorithm(name, nodes, edges):
    start = time.perf_counter()
    selected = ALGORITHMS[name](nodes, edges)
    runtime_ms = (time.perf_counter() - start) * 1000
    if len(selected) != len(nodes) - 1:
        raise ValueError("The graph is disconnected; an MST cannot connect every location.")
    return selected, runtime_ms

@app.route("/")
def index():
    return render_template("index.html", sample_nodes=SAMPLE_NODES)

@app.get("/api/sample")
def sample():
    return jsonify(SAMPLE_NODES)

@app.post("/api/optimize")
def optimize():
    try:
        payload = request.get_json(force=True)
        nodes = payload.get("nodes", [])
        if len(nodes) < 2:
            return jsonify({"error": "Add at least two locations."}), 400
        ids = [int(n["id"]) for n in nodes]
        if len(set(ids)) != len(ids):
            return jsonify({"error": "Location IDs must be unique."}), 400
        normalized = []
        for n in nodes:
            lat, lon = float(n["lat"]), float(n["lon"])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                return jsonify({"error": f"Invalid coordinates for {n.get('name', 'location')}."}), 400
            normalized.append({
                "id": int(n["id"]), "name": str(n["name"]),
                "type": str(n["type"]), "lat": lat, "lon": lon
            })
        cost_rate = max(0.0, float(payload.get("cost_per_km", 120000)))
        loss_rate = max(0.0, float(payload.get("loss_per_km", 0.25)))
        edges = build_edges(normalized, cost_rate, loss_rate)
        requested = payload.get("algorithm", "Compare all")
        names = list(ALGORITHMS) if requested == "Compare all" else [requested]
        if any(name not in ALGORITHMS for name in names):
            return jsonify({"error": "Unknown algorithm selected."}), 400

        results = {}
        for name in names:
            selected, runtime = run_algorithm(name, normalized, edges)
            results[name] = {
                "edges": selected,
                "total_cost": sum(e["cost"] for e in selected),
                "total_distance_km": sum(e["distance_km"] for e in selected),
                "estimated_loss_percent": sum(e["loss_percent"] for e in selected),
                "runtime_ms": runtime,
            }
        return jsonify({
            "nodes": normalized,
            "all_edges": edges,
            "results": results,
            "note": "Loss is a simplified distance-based estimate, not an electrical power-flow calculation."
        })
    except (ValueError, KeyError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
