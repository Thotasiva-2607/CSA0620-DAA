# GreenGrid Optimizer Website (Local)

A simple Flask website for the DAA capstone **Renewable Energy Distribution Optimization Using Minimum Spanning Trees**.

## Features
- Simple dashboard with sample renewable-energy locations
- Add and remove locations manually
- Click the map to create a location
- Run Kruskal, Prim, Boruvka, or compare all three
- Visualize all possible links and the selected MST
- Calculate estimated installation cost, network length, simplified loss metric, and runtime

## Run in VS Code on Windows
1. Extract the ZIP.
2. In VS Code, choose **File → Open Folder** and select `GreenGrid_Website`.
3. Open **Terminal → New Terminal**.
4. Create a virtual environment:
   ```powershell
   python -m venv .venv
   ```
5. Activate it. In PowerShell:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   If PowerShell blocks scripts, switch the terminal profile to **Command Prompt** and run:
   ```cmd
   .venv\Scripts\activate.bat
   ```
6. Install Flask:
   ```bash
   pip install -r requirements.txt
   ```
7. Start the website:
   ```bash
   python app.py
   ```
8. Open this address in your browser:
   `http://127.0.0.1:5000`

Keep the terminal running while using the website. Press `Ctrl+C` to stop the server.

## Map note
The map uses Leaflet and OpenStreetMap tiles from public CDN/tile services, so an internet connection is required for the map background. Manual location entry and optimization work locally without map tiles.

## Model assumptions and limitations
- The prototype builds a complete graph: every pair of locations is treated as a possible connection.
- Distances are Haversine straight-line distances, not actual cable-route distances.
- Cost = straight-line distance × entered installation cost per kilometre.
- Loss estimate = distance × entered illustrative loss percentage points per kilometre. This is not an electrical power-flow calculation.
- An MST minimizes the sum of selected edge weights. It does not ensure capacity, voltage stability, redundancy, or minimum real electrical losses.
- Runtime is measured on the local computer and varies with system load and input size. Repeat experiments for research-quality averages.
- Prim's implementation scans all edges at each step, so its complexity here is O(VE). Kruskal is O(E log E); Boruvka is typically O(E log V).

## Project structure
```text
GreenGrid_Website/
├── app.py
├── algorithms.py
├── graph_utils.py
├── requirements.txt
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── app.js
```
