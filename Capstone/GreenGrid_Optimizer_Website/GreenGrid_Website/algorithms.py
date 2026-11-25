"""Minimum Spanning Tree algorithms used by the GreenGrid website."""

class DisjointSet:
    def __init__(self, node_ids):
        self.parent = {node_id: node_id for node_id in node_ids}
        self.rank = {node_id: 0 for node_id in node_ids}

    def find(self, item):
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True


def kruskal(nodes, edges):
    dsu = DisjointSet([n["id"] for n in nodes])
    chosen = []
    for edge in sorted(edges, key=lambda e: e["cost"]):
        if dsu.union(edge["u"], edge["v"]):
            chosen.append(edge)
            if len(chosen) == len(nodes) - 1:
                break
    return chosen


def prim(nodes, edges):
    if not nodes:
        return []
    visited = {nodes[0]["id"]}
    chosen = []
    while len(visited) < len(nodes):
        crossing = [
            e for e in edges
            if (e["u"] in visited and e["v"] not in visited)
            or (e["v"] in visited and e["u"] not in visited)
        ]
        if not crossing:
            break
        edge = min(crossing, key=lambda e: e["cost"])
        chosen.append(edge)
        visited.update((edge["u"], edge["v"]))
    return chosen


def boruvka(nodes, edges):
    dsu = DisjointSet([n["id"] for n in nodes])
    chosen = []
    while len(chosen) < len(nodes) - 1:
        cheapest = {}
        for edge in edges:
            ru, rv = dsu.find(edge["u"]), dsu.find(edge["v"])
            if ru == rv:
                continue
            if ru not in cheapest or edge["cost"] < cheapest[ru]["cost"]:
                cheapest[ru] = edge
            if rv not in cheapest or edge["cost"] < cheapest[rv]["cost"]:
                cheapest[rv] = edge
        if not cheapest:
            break
        unique = {tuple(sorted((e["u"], e["v"]))): e for e in cheapest.values()}
        merged = False
        for edge in unique.values():
            if dsu.union(edge["u"], edge["v"]):
                chosen.append(edge)
                merged = True
        if not merged:
            break
    return chosen
