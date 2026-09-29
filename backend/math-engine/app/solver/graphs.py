"""Graphs — the counting side of ریاضیات گسسته (پایه‌ی دوازدهم، فصل «گراف
و مدل‌سازی»، درس «معرفی گراف»). Simple graphs only; p = number of
vertices (مرتبه), q = number of edges (اندازه).

  complete_graph(p=6)              q of K_p = p(p - 1)/2
  regular_graph(p=8, k=3)          q of a k-regular graph = kp/2 (or ∄)
  complement_edges(p=6, q=9)       q of the complement
  degree_sequence(3, 3, 2, 2, 2)   is there a simple graph with these
                                   degrees? (Havel–Hakimi)
  graph(ab, bc, cd, da, ac)        p, q, every degree, δ and Δ

Drawing/modelling questions aren't here: those need a picture and a
proof, which can't be checked mechanically. Answers are re-checked
independently in `verify_graph` (Erdős–Gallai, an explicit construction,
the adjacency matrix).
"""
import re
from dataclasses import dataclass, field
from typing import Optional

import sympy

from .messages import explained
from .schemas_internal import StepData

DOES_NOT_EXIST = "∄"

_CALL = re.compile(r"^(complete_graph|regular_graph|complement_edges|degree_sequence|graph)\((.*)\)$")
_KEYWORD = re.compile(r"^([a-z])=(\d+)$")
_EDGE = re.compile(r"^([A-Za-z0-9])([A-Za-z0-9])$")


class GraphError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class GraphProblem:
    kind: str
    values: dict[str, int] = field(default_factory=dict)
    degrees: list[int] = field(default_factory=list)
    edges: list[tuple[str, str]] = field(default_factory=list)

    @property
    def display(self) -> str:
        if self.kind == "degree_sequence":
            return f"degree_sequence({', '.join(map(str, self.degrees))})"
        if self.kind == "graph":
            return f"graph({', '.join(a + b for a, b in self.edges)})"
        return f"{self.kind}({', '.join(f'{k} = {v}' for k, v in self.values.items())})"


def looks_like_graph(compact: str) -> bool:
    return bool(_CALL.match(compact))


def parse_graph_problem(compact: str) -> GraphProblem:
    m = _CALL.match(compact)
    if not m:
        raise GraphError("Could not read the graph question")
    kind, parts = m.group(1), [p for p in m.group(2).split(",") if p]

    if kind == "degree_sequence":
        if not parts or not all(p.isdigit() for p in parts):
            raise GraphError("List the degrees as whole numbers, e.g. degree_sequence(3, 3, 2, 2, 2)")
        return GraphProblem(kind, degrees=[int(p) for p in parts])

    if kind == "graph":
        edges: list[tuple[str, str]] = []
        for part in parts:
            e = _EDGE.match(part)
            if not e:
                raise GraphError(f"'{part}' should be an edge between two vertices, e.g. ab")
            a, b = e.group(1), e.group(2)
            if a == b:
                raise GraphError(f"'{part}' is a loop; a simple graph has none")
            if (a, b) in edges or (b, a) in edges:
                raise GraphError(f"The edge {part} appears twice; a simple graph has no multiple edges")
            edges.append((a, b))
        if not edges:
            raise GraphError("List the edges, e.g. graph(ab, bc, ca)")
        return GraphProblem(kind, edges=edges)

    needed = {"complete_graph": ("p",), "regular_graph": ("p", "k"), "complement_edges": ("p", "q")}[kind]
    values: dict[str, int] = {}
    for part in parts:
        kv = _KEYWORD.match(part)
        if not kv:
            raise GraphError(f"'{part}' should look like p=6")
        values[kv.group(1)] = int(kv.group(2))
    if set(values) != set(needed):
        raise GraphError(f"{kind} needs exactly: {', '.join(needed)}")
    if values["p"] < 1:
        raise GraphError("A graph has at least one vertex")
    return GraphProblem(kind, values={k: values[k] for k in needed})


# ---------- solving ----------

def solve_graph(problem: GraphProblem) -> tuple[list[StepData], str, object]:
    """Returns (steps, answer text, value): value is q (an int), None for
    a graph that can't exist, or a summary dict for graph(...)."""
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, key: str, **params) -> None:
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=None, target="expression", **explained(key, **params),
        ))

    kind, v = problem.kind, problem.values

    if kind == "complete_graph":
        p = v["p"]
        q = p * (p - 1) // 2
        add("q = p(p - 1) / 2", f"q = {p} × {p - 1} / 2", "formula", "graph_complete")
        add(f"{p} × {p - 1} / 2", str(q), "compute", "geo_compute")
        return steps, f"q = {q}", q

    if kind == "regular_graph":
        p, k = v["p"], v["k"]
        if k > p - 1:
            add(f"k = {k}", f"{k} > {p - 1}", "degree_bound", "graph_degree_bound", p=str(p))
            return steps, DOES_NOT_EXIST, None
        total = k * p
        add("2q = k × p", f"2q = {k} × {p} = {total}", "handshake", "graph_handshake")
        if total % 2:
            add(f"2q = {total}", DOES_NOT_EXIST, "odd_sum", "graph_odd_sum")
            return steps, DOES_NOT_EXIST, None
        add(f"2q = {total}", f"q = {total // 2}", "divide", "divide_both_sides", value="2")
        return steps, f"q = {total // 2}", total // 2

    if kind == "complement_edges":
        p, q = v["p"], v["q"]
        full = p * (p - 1) // 2
        if q > full:
            raise GraphError(f"A simple graph with {p} vertices has at most {full} edges")
        add("q + q' = p(p - 1) / 2", f"{q} + q' = {p} × {p - 1} / 2 = {full}", "formula", "graph_complement")
        add(f"{q} + q' = {full}", f"q' = {full} - {q} = {full - q}", "subtract",
            "subtract_both_sides", value=str(q))
        return steps, f"q' = {full - q}", full - q

    if kind == "degree_sequence":
        return _degree_sequence(problem.degrees, add, steps)

    return _describe_graph(problem.edges, add, steps)


def _fmt_seq(seq: list[int]) -> str:
    return "(" + ", ".join(map(str, seq)) + ")"


def _degree_sequence(degrees: list[int], add, steps) -> tuple[list[StepData], str, Optional[int]]:
    p, total = len(degrees), sum(degrees)
    add(" + ".join(map(str, degrees)), f"{total} = 2q", "handshake", "graph_handshake")
    if total % 2:
        add(f"{total} = 2q", DOES_NOT_EXIST, "odd_sum", "graph_odd_sum")
        return steps, DOES_NOT_EXIST, None
    if max(degrees) > p - 1:
        add(f"Δ = {max(degrees)}", f"{max(degrees)} > {p - 1}", "degree_bound",
            "graph_degree_bound", p=str(p))
        return steps, DOES_NOT_EXIST, None

    # Havel–Hakimi: joining the highest-degree vertex to the next d
    # vertices is always safe, so repeat on what's left.
    seq = sorted(degrees, reverse=True)
    while seq and seq[0] > 0:
        d, rest = seq[0], seq[1:]
        if d > len(rest):
            add(_fmt_seq(seq), DOES_NOT_EXIST, "havel_hakimi", "graph_havel_hakimi_fail")
            return steps, DOES_NOT_EXIST, None
        reduced = [x - 1 for x in rest[:d]] + rest[d:]
        if min(reduced, default=0) < 0:
            add(_fmt_seq(seq), _fmt_seq(reduced), "havel_hakimi", "graph_havel_hakimi", d=str(d))
            add(_fmt_seq(reduced), DOES_NOT_EXIST, "havel_hakimi", "graph_havel_hakimi_fail")
            return steps, DOES_NOT_EXIST, None
        add(_fmt_seq(seq), _fmt_seq(sorted(reduced, reverse=True)), "havel_hakimi",
            "graph_havel_hakimi", d=str(d))
        seq = sorted(reduced, reverse=True)
    q = total // 2
    add(_fmt_seq(seq) if seq else "()", f"q = {total} / 2 = {q}", "graph_exists", "graph_exists")
    return steps, f"q = {q}", q


def _vertices(edges: list[tuple[str, str]]) -> list[str]:
    return sorted({x for e in edges for x in e})


def _describe_graph(edges, add, steps) -> tuple[list[StepData], str, dict]:
    vertices = _vertices(edges)
    p, q = len(vertices), len(edges)
    edge_text = ", ".join(a + b for a, b in edges)
    add(edge_text, f"p = {p}, q = {q}", "count", "graph_count")
    degree = {x: sum(x in e for e in edges) for x in vertices}
    add(f"p = {p}, q = {q}", ", ".join(f"deg({x}) = {degree[x]}" for x in vertices),
        "degrees", "graph_degrees")
    total = sum(degree.values())
    add(" + ".join(str(degree[x]) for x in vertices), f"{total} = 2 × {q}", "handshake",
        "graph_handshake_check")
    delta, big_delta = min(degree.values()), max(degree.values())
    add(", ".join(f"deg({x}) = {degree[x]}" for x in vertices), f"δ = {delta}, Δ = {big_delta}",
        "min_max_degree", "graph_min_max")
    summary = {"p": p, "q": q, "degrees": degree, "min": delta, "max": big_delta}
    return steps, f"p = {p}, q = {q}, δ = {delta}, Δ = {big_delta}", summary


# ---------- independent checks ----------

def verify_graph(problem: GraphProblem, value) -> bool:
    try:
        kind, v = problem.kind, problem.values
        if kind == "complete_graph":
            p = v["p"]
            return value == sympy.binomial(p, 2)  # one edge per pair of vertices
        if kind == "complement_edges":
            return value + v["q"] == sympy.binomial(v["p"], 2)
        if kind == "regular_graph":
            degrees = [v["k"]] * v["p"]
            exists = _erdos_gallai(degrees)
            return (value is None) == (not exists) and (value is None or 2 * value == sum(degrees))
        if kind == "degree_sequence":
            exists = _erdos_gallai(problem.degrees)
            if value is None:
                return not exists
            return exists and _construct(problem.degrees) and 2 * value == sum(problem.degrees)
        # graph(...): count again from the adjacency matrix — degrees are row
        # sums and trace(A²) counts every edge twice.
        vertices = _vertices(problem.edges)
        index = {x: i for i, x in enumerate(vertices)}
        a = sympy.zeros(len(vertices))
        for x, y in problem.edges:
            a[index[x], index[y]] = a[index[y], index[x]] = 1
        rows = [sum(a.row(i)) for i in range(len(vertices))]
        return ((a * a).trace() == 2 * value["q"] and len(vertices) == value["p"]
                and rows == [value["degrees"][x] for x in vertices]
                and min(rows) == value["min"] and max(rows) == value["max"])
    except Exception:
        return False


def _erdos_gallai(degrees: list[int]) -> bool:
    """Erdős–Gallai: a degree sequence belongs to a simple graph iff its
    sum is even and, for every k, the k largest degrees sum to at most
    k(k-1) + Σ min(d_i, k) over the rest."""
    d = sorted(degrees, reverse=True)
    if sum(d) % 2:
        return False
    for k in range(1, len(d) + 1):
        if sum(d[:k]) > k * (k - 1) + sum(min(x, k) for x in d[k:]):
            return False
    return True


def _construct(degrees: list[int]) -> bool:
    """Actually build a simple graph with these degrees and confirm it."""
    remaining = dict(enumerate(degrees))
    edges: set[frozenset] = set()
    while True:
        live = sorted((v for v in remaining if remaining[v] > 0), key=lambda v: -remaining[v])
        if not live:
            break
        v, targets = live[0], live[1:remaining[live[0]] + 1]
        if len(targets) < remaining[v]:
            return False
        for t in targets:
            edges.add(frozenset((v, t)))
            remaining[t] -= 1
        remaining[v] = 0
    built = [sum(v in e for e in edges) for v in range(len(degrees))]
    return built == degrees and all(len(e) == 2 for e in edges)
